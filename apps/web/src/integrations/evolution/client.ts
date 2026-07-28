import { z, type ZodType } from 'zod';
import { getEnv } from '@/config/env';
import { validatePublicMediaUrl } from '@/shared/utils/ssrf';
import type {
  WhatsAppConnectionState,
  WhatsAppMessageReceipt,
  WhatsAppProvider,
  WhatsAppQrCode,
} from '@/integrations/whatsapp/provider';

export const EVOLUTION_COMPATIBLE_VERSION = '2.3.7';

const instanceNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-zA-Z0-9_-]+$/);
const phoneSchema = z
  .string()
  .trim()
  .regex(/^\d{8,20}$/);
const qrPayloadSchema = z
  .object({
    base64: z.string().optional(),
    code: z.string().optional(),
    qr: z.string().optional(),
    qrcode: z
      .object({
        base64: z.string().optional(),
        code: z.string().optional(),
        qr: z.string().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();
const connectionPayloadSchema = z
  .object({
    state: z.string().optional(),
    instance: z
      .object({
        state: z.string().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();
const messagePayloadSchema = z
  .object({
    key: z
      .object({
        id: z.string().optional(),
      })
      .passthrough()
      .optional(),
    messageId: z.string().optional(),
    id: z.string().optional(),
  })
  .passthrough()
  .refine((payload) => Boolean(payload.key?.id ?? payload.messageId ?? payload.id), {
    message: 'Evolution response is missing a message id',
  });

export type EvolutionErrorCode =
  | 'CIRCUIT_OPEN'
  | 'CLOUDFLARE_ACCESS_REJECTED'
  | 'CONFLICT'
  | 'INSTANCE_ALREADY_EXISTS'
  | 'INVALID_CONFIGURATION'
  | 'INVALID_INPUT'
  | 'INVALID_RESPONSE'
  | 'NETWORK_ERROR'
  | 'NOT_FOUND'
  | 'PROVIDER_AUTH_REJECTED'
  | 'PROVIDER_FORBIDDEN'
  | 'RATE_LIMITED'
  | 'TIMEOUT'
  | 'UNAVAILABLE'
  | 'WEBHOOK_CONFIGURATION_FAILED';

export class EvolutionApiError extends Error {
  constructor(
    message: string,
    readonly code: EvolutionErrorCode,
    readonly status?: number,
    readonly retryable = false,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'EvolutionApiError';
  }
}

interface EvolutionConfig {
  apiUrl: string;
  apiKey: string;
  cloudflareClientId?: string;
  cloudflareClientSecret?: string;
}

interface EvolutionProviderOptions {
  fetcher?: typeof fetch;
  loadConfig?: () => EvolutionConfig;
  maxReadAttempts?: number;
  now?: () => number;
  sleep?: (durationMs: number) => Promise<void>;
  timeoutMs?: number;
}

interface RequestOptions<T> {
  init?: RequestInit;
  retryRead?: boolean;
  schema?: ZodType<T>;
}

export function extractEvolutionQr(payload: unknown): string | null {
  const parsed = qrPayloadSchema.safeParse(payload);
  if (!parsed.success) return null;

  return (
    parsed.data.base64 ??
    parsed.data.code ??
    parsed.data.qr ??
    parsed.data.qrcode?.base64 ??
    parsed.data.qrcode?.code ??
    parsed.data.qrcode?.qr ??
    null
  );
}


export class EvolutionWhatsAppProvider implements WhatsAppProvider {
  private readonly fetcher: typeof fetch;
  private readonly loadConfig: () => EvolutionConfig;
  private readonly maxReadAttempts: number;
  private readonly now: () => number;
  private readonly sleep: (durationMs: number) => Promise<void>;
  private readonly timeoutMs: number;
  private consecutiveFailures = 0;
  private circuitOpenUntil = 0;

  constructor(options: EvolutionProviderOptions = {}) {
    this.fetcher = options.fetcher ?? fetch;
    this.loadConfig = options.loadConfig ?? loadEvolutionConfig;
    this.maxReadAttempts = options.maxReadAttempts ?? 3;
    this.now = options.now ?? Date.now;
    this.sleep =
      options.sleep ?? ((durationMs) => new Promise((resolve) => setTimeout(resolve, durationMs)));
    this.timeoutMs = options.timeoutMs ?? 15_000;
  }

  async createInstance(instanceName: string): Promise<WhatsAppQrCode> {
    const validInstanceName = parseInstanceName(instanceName);
    const payload = await this.request('/instance/create', {
      init: {
        method: 'POST',
        body: JSON.stringify({
          instanceName: validInstanceName,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS',
          syncFullHistory: false,
        }),
      },
      schema: qrPayloadSchema,
    });

    return { qrCode: extractEvolutionQr(payload) };
  }

  async configureWebhook(
    instanceName: string,
    webhookUrl: string,
    secret: string,
    companyId: string,
  ): Promise<void> {
    const validInstanceName = parseInstanceName(instanceName);
    const validWebhookUrl = z.string().url().parse(webhookUrl);
    const validCompanyId = z.string().uuid().parse(companyId);
    if (secret.length < 32) {
      throw invalidInput('El secreto del webhook no es válido');
    }

    await this.request(`/webhook/set/${encodeURIComponent(validInstanceName)}`, {
      init: {
        method: 'POST',
        body: JSON.stringify({
          webhook: {
            enabled: true,
            url: validWebhookUrl,
            byEvents: false,
            base64: false,
            headers: {
              'X-Evolution-Webhook-Secret': secret,
              'X-Company-ID': validCompanyId,
            },
            events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE', 'QRCODE_UPDATED'],
          },
        }),
      },
    });
  }

  async getConnectionState(instanceName: string): Promise<WhatsAppConnectionState> {
    const payload = await this.request(
      `/instance/connectionState/${encodeURIComponent(parseInstanceName(instanceName))}`,
      {
        init: { method: 'GET' },
        retryRead: true,
        schema: connectionPayloadSchema,
      },
    );

    return { state: payload.instance?.state ?? payload.state ?? 'close' };
  }

  async getQrCode(instanceName: string): Promise<WhatsAppQrCode> {
    const payload = await this.request(
      `/instance/connect/${encodeURIComponent(parseInstanceName(instanceName))}`,
      {
        init: { method: 'GET' },
        retryRead: true,
        schema: qrPayloadSchema,
      },
    );

    return { qrCode: extractEvolutionQr(payload) };
  }

  async sendText(
    instanceName: string,
    number: string,
    text: string,
  ): Promise<WhatsAppMessageReceipt> {
    const payload = await this.request(
      `/message/sendText/${encodeURIComponent(parseInstanceName(instanceName))}`,
      {
        init: {
          method: 'POST',
          body: JSON.stringify({
            number: phoneSchema.parse(number),
            text: z.string().min(1).max(65_536).parse(text),
            delay: 2_000,
          }),
        },
        schema: messagePayloadSchema,
      },
    );

    return { providerMessageId: messageId(payload) };
  }

  async sendMedia(
    instanceName: string,
    number: string,
    mediaUrl: string,
    caption: string,
  ): Promise<WhatsAppMessageReceipt> {
    const tenantId = instanceName.startsWith('company_')
      ? instanceName.slice('company_'.length)
      : instanceName;

    if (!validatePublicMediaUrl(mediaUrl, tenantId)) {
      throw invalidInput('La URL del archivo multimedia no es válida o no pertenece a esta empresa');
    }

    const payload = await this.request(
      `/message/sendMedia/${encodeURIComponent(parseInstanceName(instanceName))}`,
      {
        init: {
          method: 'POST',
          body: JSON.stringify({
            number: phoneSchema.parse(number),
            mediatype: 'image',
            media: mediaUrl,
            caption: z.string().max(65_536).parse(caption),
            delay: 2_000,
          }),
        },
        schema: messagePayloadSchema,
      },
    );

    return { providerMessageId: messageId(payload) };
  }

  async logoutInstance(instanceName: string): Promise<void> {
    await this.deleteLikeRequest(
      `/instance/logout/${encodeURIComponent(parseInstanceName(instanceName))}`,
    );
  }

  async deleteInstance(instanceName: string): Promise<void> {
    await this.deleteLikeRequest(
      `/instance/delete/${encodeURIComponent(parseInstanceName(instanceName))}`,
    );
  }

  private async deleteLikeRequest(endpoint: string): Promise<void> {
    try {
      await this.request(endpoint, { init: { method: 'DELETE' } });
    } catch (error: unknown) {
      if (error instanceof EvolutionApiError && error.status === 404) return;
      throw error;
    }
  }

  private async request<T = unknown>(endpoint: string, options: RequestOptions<T>): Promise<T> {
    if (this.circuitOpenUntil > this.now()) {
      throw new EvolutionApiError(
        'Evolution API no está disponible temporalmente',
        'CIRCUIT_OPEN',
        503,
        true,
      );
    }

    const attempts = options.retryRead ? this.maxReadAttempts : 1;
    let lastError: EvolutionApiError | undefined;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const result = await this.executeRequest(endpoint, options);
        this.consecutiveFailures = 0;
        this.circuitOpenUntil = 0;
        return result;
      } catch (error: unknown) {
        const providerError = normalizeEvolutionError(error);
        lastError = providerError;
        this.recordFailure(providerError);

        if (!providerError.retryable || attempt === attempts) {
          throw providerError;
        }

        const backoffMs = 200 * 2 ** (attempt - 1) + Math.floor(Math.random() * 100);
        await this.sleep(backoffMs);
      }
    }

    throw lastError ?? new EvolutionApiError('Evolution API no disponible', 'UNAVAILABLE');
  }

  private async executeRequest<T>(endpoint: string, options: RequestOptions<T>): Promise<T> {
    const config = this.loadConfig();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetcher(`${config.apiUrl}${endpoint}`, {
        ...options.init,
        headers: {
          apikey: config.apiKey,
          'content-type': 'application/json',
          ...(config.cloudflareClientId && config.cloudflareClientSecret
            ? {
                'CF-Access-Client-Id': config.cloudflareClientId,
                'CF-Access-Client-Secret': config.cloudflareClientSecret,
              }
            : {}),
          ...options.init?.headers,
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        const rawText = await response.text().catch(() => '');
        const safeBody = rawText.slice(0, 2048);
        const isCloudflare = safeBody.includes('cf-access') ||
          safeBody.includes('cloudflare') ||
          safeBody.includes('CF-Access');
        let providerJson: Record<string, unknown> | null = null;
        try { providerJson = JSON.parse(safeBody) as Record<string, unknown>; } catch { /* not JSON */ }
        throw errorFromResponse(response.status, endpoint, {
          isCloudflare,
          providerJson,
          rawSnippet: safeBody.slice(0, 200),
        });
      }

      if (!options.schema) {
        return undefined as T;
      }

      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.includes('application/json')) {
        throw new EvolutionApiError(
          'Evolution API devolvió una respuesta no válida',
          'INVALID_RESPONSE',
          502,
        );
      }

      const parsed = options.schema.safeParse(await response.json());
      if (!parsed.success) {
        throw new EvolutionApiError(
          'Evolution API devolvió una respuesta incompatible',
          'INVALID_RESPONSE',
          502,
        );
      }

      return parsed.data;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private recordFailure(error: EvolutionApiError): void {
    if (!error.retryable) return;

    this.consecutiveFailures += 1;
    if (this.consecutiveFailures >= 5) {
      this.circuitOpenUntil = this.now() + 30_000;
    }
  }
}

function loadEvolutionConfig(): EvolutionConfig {
  const env = getEnv();
  return {
    apiUrl: env.EVOLUTION_API_URL.replace(/\/$/, ''),
    apiKey: env.EVOLUTION_API_KEY,
    cloudflareClientId: env.CF_ACCESS_CLIENT_ID,
    cloudflareClientSecret: env.CF_ACCESS_CLIENT_SECRET,
  };
}

function parseInstanceName(value: string): string {
  const parsed = instanceNameSchema.safeParse(value);
  if (!parsed.success) throw invalidInput('El nombre de instancia no es válido');
  return parsed.data;
}

function invalidInput(message: string): EvolutionApiError {
  return new EvolutionApiError(message, 'INVALID_INPUT', 400);
}

function messageId(payload: z.infer<typeof messagePayloadSchema>): string | null {
  return payload.key?.id ?? payload.messageId ?? payload.id ?? null;
}

interface ErrorContext {
  isCloudflare: boolean;
  providerJson: Record<string, unknown> | null;
  rawSnippet: string;
}

function errorFromResponse(
  status: number,
  endpoint: string,
  ctx: ErrorContext,
): EvolutionApiError {
  if (ctx.isCloudflare && (status === 401 || status === 403)) {
    return new EvolutionApiError(
      'Cloudflare Access bloqueó la solicitud',
      'CLOUDFLARE_ACCESS_REJECTED',
      status,
    );
  }
  if (status === 401 || status === 403) {
    const msg = String(ctx.providerJson?.message ?? ctx.providerJson?.error ?? '');
    const lower = msg.toLowerCase();
    if (lower.includes('already') || lower.includes('exist') || lower.includes('ya existe')) {
      return new EvolutionApiError('La instancia ya existe', 'INSTANCE_ALREADY_EXISTS', 409);
    }
    return new EvolutionApiError(
      `Operación prohibida en ${endpoint}`,
      'PROVIDER_FORBIDDEN',
      status,
    );
  }
  if (status === 404) {
    return new EvolutionApiError('Recurso no encontrado', 'NOT_FOUND', status);
  }
  if (status === 409) {
    return new EvolutionApiError('La instancia ya existe', 'CONFLICT', status);
  }
  if (status === 429) {
    return new EvolutionApiError(
      'Evolution API limitó temporalmente la solicitud',
      'RATE_LIMITED',
      status,
      true,
    );
  }
  return new EvolutionApiError(
    'Evolution API no está disponible',
    'UNAVAILABLE',
    status,
    status >= 500,
  );
}

function normalizeEvolutionError(error: unknown): EvolutionApiError {
  if (error instanceof EvolutionApiError) return error;
  if (error instanceof z.ZodError) {
    return invalidInput('Los datos enviados a Evolution API no son válidos');
  }
  if (error instanceof Error && error.name === 'AbortError') {
    return new EvolutionApiError('Evolution API agotó el tiempo de espera', 'TIMEOUT', 504, true, {
      cause: error,
    });
  }
  return new EvolutionApiError(
    'No se pudo conectar con Evolution API',
    'NETWORK_ERROR',
    502,
    true,
    { cause: error },
  );
}

export const evolution: WhatsAppProvider = new EvolutionWhatsAppProvider();
