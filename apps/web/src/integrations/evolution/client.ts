import { getEnv } from '@/config/env';

export class EvolutionApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'EvolutionApiError';
  }
}

function getHeaders(): Record<string, string> {
  const env = getEnv();
  const headers: Record<string, string> = {
    'apikey': env.EVOLUTION_API_KEY,
    'Content-Type': 'application/json',
  };

  if (env.CF_ACCESS_CLIENT_ID && env.CF_ACCESS_CLIENT_SECRET) {
    headers['CF-Access-Client-Id'] = env.CF_ACCESS_CLIENT_ID;
    headers['CF-Access-Client-Secret'] = env.CF_ACCESS_CLIENT_SECRET;
  }

  return headers;
}

async function request(endpoint: string, options: RequestInit = {}): Promise<any> {
  const env = getEnv();
  const url = `${env.EVOLUTION_API_URL}${endpoint}`;
  const headers = { ...getHeaders(), ...(options.headers || {}) };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = response.statusText;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorJson.error || errorMessage;
      } catch {}
      throw new EvolutionApiError(errorMessage, response.status);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    return await response.text();
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error instanceof EvolutionApiError) throw error;
    throw new EvolutionApiError(error.message || 'Error de red en Evolution API');
  }
}

export const evolution = {
  async createInstance(instanceName: string) {
    return request('/instance/create', {
      method: 'POST',
      body: JSON.stringify({
        instanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
        syncFullHistory: false,
      }),
    });
  },

  async setWebhook(instanceName: string, webhookUrl: string, secret: string, companyId: string) {
    return request(`/webhook/set/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify({
        webhook: {
          enabled: true,
          url: webhookUrl,
          byEvents: false,
          base64: false,
          headers: {
            'X-Evolution-Webhook-Secret': secret,
            'X-Company-ID': companyId,
          },
          events: [
            'MESSAGES_UPSERT',
            'CONNECTION_UPDATE',
            'QRCODE_UPDATED',
          ],
        },
      }),
    });
  },

  async getConnectionState(instanceName: string) {
    return request(`/instance/connectionState/${instanceName}`, { method: 'GET' });
  },

  async getQr(instanceName: string) {
    return request(`/instance/connect/${instanceName}`, { method: 'GET' });
  },

  async sendText(instanceName: string, number: string, text: string) {
    return request(`/message/sendText/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify({
        number,
        text,
        delay: 2000,
      }),
    });
  },

  async sendMedia(instanceName: string, number: string, mediaUrl: string, caption: string) {
    return request(`/message/sendMedia/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify({
        number,
        mediatype: 'image',
        media: mediaUrl,
        caption,
        delay: 2000,
      }),
    });
  },

  async logoutInstance(instanceName: string) {
    try {
      return await request(`/instance/logout/${instanceName}`, { method: 'DELETE' });
    } catch (e: any) {
      if (e.status === 404) return { status: 'NOT_FOUND' };
      throw e;
    }
  },

  async deleteInstance(instanceName: string) {
    try {
      return await request(`/instance/delete/${instanceName}`, { method: 'DELETE' });
    } catch (e: any) {
      if (e.status === 404) return { status: 'NOT_FOUND' };
      throw e;
    }
  },
};
