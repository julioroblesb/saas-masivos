import { NextResponse } from 'next/server';
import type { ZodType } from 'zod';
import { ApiError } from './api-error';
import { log } from '@/server/observability/logger';

interface ApiErrorBody {
  ok: false;
  error: {
    code: string;
    message: string;
    correlationId: string;
  };
}

interface ApiSuccessBody<T> {
  ok: true;
  data: T;
  correlationId: string;
}

export function correlationId(request: Request): string {
  const candidate = request.headers.get('x-correlation-id')?.trim();
  return candidate && candidate.length <= 128 ? candidate : crypto.randomUUID();
}

export function success<T>(
  data: T,
  requestId: string,
  init?: ResponseInit,
): NextResponse<ApiSuccessBody<T>> {
  return NextResponse.json(
    { ok: true, data, correlationId: requestId },
    withCorrelationId(init, requestId),
  );
}

export function failure(error: unknown, requestId: string): NextResponse<ApiErrorBody> {
  const apiError =
    error instanceof ApiError ? error : new ApiError(500, 'INTERNAL_ERROR', 'Error interno');

  if (!(error instanceof ApiError)) {
    log('error', 'api.unhandled_error', { correlationId: requestId, error });
  }

  return NextResponse.json(
    {
      ok: false,
      error: {
        code: apiError.code,
        message: apiError.message,
        correlationId: requestId,
      },
    },
    withCorrelationId({ status: apiError.status }, requestId),
  );
}

export async function parseJson<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    throw new ApiError(400, 'BAD_REQUEST', 'JSON inválido', { cause: error });
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    throw new ApiError(400, 'BAD_REQUEST', result.error.issues[0]?.message ?? 'Datos inválidos');
  }

  return result.data;
}

function withCorrelationId(init: ResponseInit | undefined, requestId: string): ResponseInit {
  const headers = new Headers(init?.headers);
  headers.set('x-correlation-id', requestId);
  headers.set('cache-control', 'no-store');
  return { ...init, headers };
}
