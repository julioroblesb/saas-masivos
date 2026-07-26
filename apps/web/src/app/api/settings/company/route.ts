import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { TenantAccessService } from '@/server/access/tenant-access-service';
import { ApiError } from '@/server/http/api-error';
import { correlationId, failure, parseJson, success } from '@/server/http/api-response';

const settingsPayloadSchema = z
  .object({
    companyName: z.string().trim().min(1).max(120).optional(),
    settings: z.record(z.string(), z.unknown()).optional(),
  })
  .refine(({ companyName, settings }) => companyName !== undefined || settings !== undefined, {
    message: 'No hay cambios para guardar',
  });

export async function GET(request: Request) {
  const requestId = correlationId(request);

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new ApiError(401, 'UNAUTHORIZED', 'No autorizado');
    }

    const access = await TenantAccessService.forCurrentUser();
    if (!access.allowed || !access.companyId) {
      throw new ApiError(403, 'FORBIDDEN', 'Acceso suspendido');
    }

    const { data: company, error } = await supabase
      .from('companies')
      .select('id, name, settings')
      .eq('id', access.companyId)
      .single();
    if (error) throw error;

    return success(
      {
        company: {
          id: company.id,
          name: company.name,
          settings: company.settings ?? {},
        },
      },
      requestId,
    );
  } catch (error: unknown) {
    return failure(error, requestId);
  }
}

export async function POST(request: Request) {
  const requestId = correlationId(request);

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new ApiError(401, 'UNAUTHORIZED', 'No autorizado');
    }

    const access = await TenantAccessService.forCurrentUser();
    if (!access.allowed || !access.companyId || !access.canManageCompany) {
      throw new ApiError(403, 'FORBIDDEN', 'Se requiere el rol de dueño');
    }

    const parsed = await parseJson(request, settingsPayloadSchema);
    let mergedSettings: Record<string, unknown> | undefined;

    if (parsed.settings) {
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('settings')
        .eq('id', access.companyId)
        .single();
      if (companyError) throw companyError;

      mergedSettings = {
        ...((company?.settings as Record<string, unknown> | null) ?? {}),
        ...parsed.settings,
      };
    }

    const { error: updateError } = await supabase.rpc('rpc_update_company_settings', {
      p_name: parsed.companyName ?? null,
      p_settings: mergedSettings ?? null,
    });
    if (updateError) throw updateError;

    return success({ message: 'Empresa actualizada correctamente' }, requestId);
  } catch (error: unknown) {
    return failure(error, requestId);
  }
}
