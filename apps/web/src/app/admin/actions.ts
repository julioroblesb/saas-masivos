'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseAdmin } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';
import { z } from 'zod';
import { recordAuditEvent } from '@/server/observability/audit';
import { evolution } from '@/integrations/evolution/client';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Error interno';
}

export async function createTenant(formData: FormData) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { error: 'No autorizado' };

    // Verificar si el usuario que llama es super_admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'super_admin') {
      return { error: 'No autorizado' };
    }

    const supabaseAdmin = getSupabaseAdmin();
    const companyName = ((formData.get('companyName') as string) || '').trim();
    const fullName = ((formData.get('fullName') as string) || '').trim();
    const email = ((formData.get('email') as string) || '').trim();
    const password = ((formData.get('password') as string) || '').trim();

    if (!companyName || !email || !password) {
      return { error: 'Nombre de empresa, correo y contraseña son obligatorios' };
    }

    const trialEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Auth se crea primero y se compensa si falla el aprovisionamiento SQL.
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName || '',
      },
    });

    if (authError || !authData.user) {
      return { error: authError?.message || 'Error al crear el usuario auth' };
    }

    const { error: provisionError } = await supabaseAdmin.rpc('rpc_provision_tenant_for_user', {
      p_user_id: authData.user.id,
      p_company_name: companyName,
      p_owner_name: fullName,
      p_plan_type: 'prueba',
      p_subscription_end_at: trialEnd.toISOString(),
      p_is_demo: false,
    });

    if (provisionError) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return { error: provisionError.message };
    }

    const { data: createdProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('company_id')
      .eq('id', authData.user.id)
      .single();
    if (profileError || !createdProfile?.company_id) {
      throw profileError ?? new Error('El tenant se creó sin un perfil asociado');
    }

    await recordAuditEvent({
      actorId: user.id,
      companyId: createdProfile.company_id,
      correlationId: crypto.randomUUID(),
      entityId: createdProfile.company_id,
      entityType: 'company',
      eventType: 'superadmin.tenant_created',
      metadata: { planType: 'prueba' },
    });

    revalidatePath('/admin');
    return { success: true };
  } catch (error: unknown) {
    return { error: errorMessage(error) };
  }
}

const updateSubscriptionSchema = z.object({
  plan_type: z
    .enum(['prueba', 'mensual', 'bimestral', 'trimestral', 'semestral', 'anual'])
    .optional(),
  status: z.enum(['activa', 'suspendida', 'cancelada']).optional(),
  subscription_start_at: z.string().optional(),
  subscription_end_at: z.string().optional(),
});

export async function updateTenantSubscription(companyId: string, data: unknown) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { error: 'No autorizado' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'super_admin') {
      return { error: 'No autorizado' };
    }

    const parsedData = updateSubscriptionSchema.parse(data);

    // Impedir guardar status 'activa' si la fecha de vencimiento es pasada
    if (parsedData.status === 'activa' && parsedData.subscription_end_at) {
      const end = new Date(parsedData.subscription_end_at);
      if (!Number.isNaN(end.getTime()) && end.getTime() <= Date.now()) {
        return {
          error:
            'No se puede activar un tenant con una fecha de vencimiento pasada. Renueve la fecha primero.',
        };
      }
    }

    const { data: currentCompany, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('status, plan_type, subscription_end_at')
      .eq('id', companyId)
      .single();

    if (companyError || !currentCompany) {
      return { error: companyError?.message ?? 'Empresa no encontrada' };
    }

    const { error } = await supabaseAdmin.rpc('rpc_set_tenant_subscription', {
      p_company_id: companyId,
      p_status: parsedData.status ?? currentCompany.status,
      p_plan_type: parsedData.plan_type ?? currentCompany.plan_type ?? 'prueba',
      p_subscription_end_at:
        parsedData.subscription_end_at ??
        currentCompany.subscription_end_at ??
        new Date().toISOString(),
    });

    if (error) {
      console.error('Error updateTenantSubscription:', error);
      return { error: error.message };
    }

    await recordAuditEvent({
      actorId: user.id,
      companyId,
      correlationId: crypto.randomUUID(),
      entityId: companyId,
      entityType: 'company',
      eventType: 'superadmin.subscription_updated',
      metadata: {
        planType: parsedData.plan_type ?? currentCompany.plan_type,
        status: parsedData.status ?? currentCompany.status,
      },
    });

    revalidatePath('/admin');
    return { success: true };
  } catch (error: unknown) {
    return { error: errorMessage(error) };
  }
}

export async function deleteTenant(companyId: string) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { error: 'No autorizado' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'super_admin') {
      return { error: 'No autorizado' };
    }

    const { error } = await supabaseAdmin
      .from('companies')
      .update({ status: 'cancelada' })
      .eq('id', companyId);

    if (error) {
      console.error('Error deleteTenant:', error);
      return { error: error.message };
    }

    await recordAuditEvent({
      actorId: user.id,
      companyId,
      correlationId: crypto.randomUUID(),
      entityId: companyId,
      entityType: 'company',
      eventType: 'superadmin.tenant_cancelled',
    });

    revalidatePath('/admin');
    return { success: true };
  } catch (error: unknown) {
    return { error: errorMessage(error) };
  }
}

const purgeDemoSchema = z.object({
  companyIds: z.array(z.string().uuid()).min(1).max(100),
});

const STORAGE_BUCKET = 'spa-media';
const STORAGE_PAGE_SIZE = 100;
const STORAGE_REMOVE_BATCH_SIZE = 100;
const MAX_STORAGE_DIRECTORIES = 10_000;
const MAX_STORAGE_PAGES_PER_DIRECTORY = 10_000;

type SupabaseAdminClient = ReturnType<typeof getSupabaseAdmin>;

interface ValidatedPurgeResult {
  companyIds: string[];
  purgedCount: number;
}

function safeCleanupErrorMessage(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' &&
          error !== null &&
          'message' in error &&
          typeof error.message === 'string'
        ? error.message
        : String(error);
  return message
    .replace(
      /(authorization|apikey|api[_-]?key|token|secret)(\s*[:=]\s*)[^\s,;]+/gi,
      '$1$2[REDACTED]',
    )
    .replace(/\beyJ[A-Za-z0-9_-]{20,}(?:\.[A-Za-z0-9_-]+){0,2}\b/g, '[REDACTED_TOKEN]')
    .slice(0, 500);
}

function validatePurgeRpcResult(
  rpcResult: unknown,
  requestedCompanyIds: string[],
): ValidatedPurgeResult | null {
  if (typeof rpcResult !== 'object' || rpcResult === null || Array.isArray(rpcResult)) {
    return null;
  }

  const result = rpcResult as Record<string, unknown>;
  if (
    result.success !== true ||
    result.purged_count !== requestedCompanyIds.length ||
    !Array.isArray(result.company_ids) ||
    !result.company_ids.every((id): id is string => typeof id === 'string')
  ) {
    return null;
  }

  const returnedCompanyIds = result.company_ids;
  const requestedSet = new Set(requestedCompanyIds);
  const returnedSet = new Set(returnedCompanyIds);
  const setsMatch =
    requestedSet.size === requestedCompanyIds.length &&
    returnedSet.size === returnedCompanyIds.length &&
    requestedSet.size === returnedSet.size &&
    [...requestedSet].every((id) => returnedSet.has(id));

  if (!setsMatch) {
    return null;
  }

  return {
    companyIds: returnedCompanyIds,
    purgedCount: result.purged_count,
  };
}

function safeStorageChildPath(
  tenantPrefix: string,
  directory: string,
  itemName: string,
): string | null {
  if (
    itemName.length === 0 ||
    itemName === '.' ||
    itemName === '..' ||
    itemName.includes('/') ||
    itemName.includes('\\')
  ) {
    return null;
  }

  const childPath = `${directory}/${itemName}`;
  return childPath.startsWith(`${tenantPrefix}/`) ? childPath : null;
}

async function removeStoragePrefixRecursively(
  supabaseAdmin: SupabaseAdminClient,
  tenantPrefix: string,
  storageCleanupErrors: string[],
): Promise<void> {
  const bucket = supabaseAdmin.storage.from(STORAGE_BUCKET);
  const pendingDirectories = [tenantPrefix];
  const visitedDirectories = new Set<string>();
  const filesToRemove = new Set<string>();

  while (pendingDirectories.length > 0) {
    if (visitedDirectories.size >= MAX_STORAGE_DIRECTORIES) {
      storageCleanupErrors.push(
        `Storage ${tenantPrefix}: se alcanzó el límite defensivo de carpetas.`,
      );
      return;
    }

    const directory = pendingDirectories.shift();
    if (!directory || visitedDirectories.has(directory)) {
      continue;
    }
    visitedDirectories.add(directory);

    const pageFingerprints = new Set<string>();
    let offset = 0;
    let finishedDirectory = false;

    for (let page = 0; page < MAX_STORAGE_PAGES_PER_DIRECTORY; page += 1) {
      let listResult: Awaited<ReturnType<typeof bucket.list>>;
      try {
        listResult = await bucket.list(directory, {
          limit: STORAGE_PAGE_SIZE,
          offset,
          sortBy: { column: 'name', order: 'asc' },
        });
      } catch (error: unknown) {
        storageCleanupErrors.push(
          `Storage ${tenantPrefix}: excepción listando ${directory}: ${safeCleanupErrorMessage(error)}`,
        );
        return;
      }

      if (listResult.error) {
        storageCleanupErrors.push(
          `Storage ${tenantPrefix}: error listando ${directory}: ${safeCleanupErrorMessage(listResult.error)}`,
        );
        return;
      }

      const items = listResult.data;
      const fingerprint = items.map((item) => `${item.name}:${item.id ?? 'folder'}`).join('|');
      if (items.length > 0 && pageFingerprints.has(fingerprint)) {
        storageCleanupErrors.push(
          `Storage ${tenantPrefix}: la paginación repitió resultados en ${directory}.`,
        );
        return;
      }
      pageFingerprints.add(fingerprint);

      for (const item of items) {
        const childPath = safeStorageChildPath(tenantPrefix, directory, item.name);
        if (!childPath) {
          storageCleanupErrors.push(
            `Storage ${tenantPrefix}: se rechazó una ruta fuera del prefijo permitido.`,
          );
          return;
        }

        if (item.id === null) {
          if (!visitedDirectories.has(childPath)) {
            pendingDirectories.push(childPath);
          }
        } else {
          filesToRemove.add(childPath);
        }
      }

      if (items.length < STORAGE_PAGE_SIZE) {
        finishedDirectory = true;
        break;
      }
      offset += items.length;
    }

    if (!finishedDirectory) {
      storageCleanupErrors.push(
        `Storage ${tenantPrefix}: se alcanzó el límite defensivo de páginas en ${directory}.`,
      );
      return;
    }
  }

  const paths = [...filesToRemove];
  for (let index = 0; index < paths.length; index += STORAGE_REMOVE_BATCH_SIZE) {
    const batch = paths.slice(index, index + STORAGE_REMOVE_BATCH_SIZE);
    try {
      const { error } = await bucket.remove(batch);
      if (error) {
        storageCleanupErrors.push(
          `Storage ${tenantPrefix}: error eliminando un lote: ${safeCleanupErrorMessage(error)}`,
        );
      }
    } catch (error: unknown) {
      storageCleanupErrors.push(
        `Storage ${tenantPrefix}: excepción eliminando un lote: ${safeCleanupErrorMessage(error)}`,
      );
    }
  }
}

/**
 * Transactional & Observable Demo Tenant Purge.
 * 1. Verifies super_admin role and validates input array.
 * 2. Captures metadata BEFORE purging database (Auth IDs, Evolution instances, Storage prefixes).
 * 3. Calls rpc_purge_demo_tenants for atomic database transaction.
 * 4. Post-commit: attempts cleanup of Evolution instances, Auth users, and Storage files.
 * 5. Returns structured observability detailing DB success and external cleanup notices.
 */
export async function purgeDemoTenants(data: unknown) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { error: 'No autorizado' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'super_admin') {
      return { error: 'No autorizado' };
    }

    const { companyIds } = purgeDemoSchema.parse(data);
    const supabaseAdmin = getSupabaseAdmin();

    // 1. CAPTURE METADATA BEFORE DB PURGE
    const { data: linkedProfiles, error: linkedProfilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, company_id')
      .in('company_id', companyIds);

    if (linkedProfilesError) {
      console.error('purgeDemoTenants.profile_capture_failed', {
        error: safeCleanupErrorMessage(linkedProfilesError),
      });
      return { error: 'No se pudo preparar la captura de usuarios para la purga.' };
    }

    const authUserIds = (linkedProfiles ?? []).map((p) => p.id);

    const { data: waSessions, error: waSessionsError } = await supabaseAdmin
      .from('wa_sessions')
      .select('company_id, evolution_instance_name, status')
      .in('company_id', companyIds);

    if (waSessionsError) {
      console.error('purgeDemoTenants.wa_session_capture_failed', {
        error: safeCleanupErrorMessage(waSessionsError),
      });
      return { error: 'No se pudo preparar la captura de sesiones de WhatsApp para la purga.' };
    }

    // 2. EXECUTE TRANSACTIONAL RPC FOR ATOMIC DB PURGE
    const { data: rpcResult, error: rpcErr } = await supabaseAdmin.rpc('rpc_purge_demo_tenants', {
      p_company_ids: companyIds,
      p_actor_id: user.id,
    });

    if (rpcErr) {
      console.error('purgeDemoTenants.database_purge_failed', {
        error: safeCleanupErrorMessage(rpcErr),
      });
      return { error: 'No se pudo completar la purga transaccional de la base de datos.' };
    }

    const validatedRpcResult = validatePurgeRpcResult(rpcResult, companyIds);
    if (!validatedRpcResult) {
      const returnedCount =
        typeof rpcResult === 'object' &&
        rpcResult !== null &&
        !Array.isArray(rpcResult) &&
        typeof (rpcResult as Record<string, unknown>).purged_count === 'number'
          ? ((rpcResult as Record<string, unknown>).purged_count as number)
          : null;

      console.error('purgeDemoTenants.rpc_integrity_mismatch', {
        requestedCount: companyIds.length,
        returnedCount,
      });
      try {
        await recordAuditEvent({
          actorId: user.id,
          companyId: null,
          correlationId: crypto.randomUUID(),
          entityId: null,
          entityType: 'demo_tenants_batch',
          eventType: 'superadmin.demo_tenant_purge_integrity_mismatch',
          metadata: {
            requestedCount: companyIds.length,
            returnedCount,
          },
          outcome: 'failure',
        });
      } catch (auditError: unknown) {
        console.error('purgeDemoTenants.integrity_audit_failed', {
          error: safeCleanupErrorMessage(auditError),
        });
      }
      return {
        error:
          'La base de datos devolvió un resultado inconsistente. Se detuvieron las limpiezas externas.',
      };
    }

    // 3. POST-COMMIT EXTERNAL CLEANUPS (Observable & Non-Destructive to committed DB state)
    const authCleanupErrors: string[] = [];
    const evolutionCleanupErrors: string[] = [];
    const storageCleanupErrors: string[] = [];

    // 3a. Evolution API instance cleanup
    if (waSessions && waSessions.length > 0) {
      for (const session of waSessions) {
        if (session.evolution_instance_name) {
          const instanceName = session.evolution_instance_name;
          if (session.status !== 'desconectado') {
            try {
              await evolution.logoutInstance(session.evolution_instance_name);
            } catch (evoErr: unknown) {
              evolutionCleanupErrors.push(
                `Logout de ${instanceName}: ${safeCleanupErrorMessage(evoErr)}`,
              );
            }
          }
          try {
            await evolution.deleteInstance(instanceName);
          } catch (evoErr: unknown) {
            evolutionCleanupErrors.push(
              `Delete de ${instanceName}: ${safeCleanupErrorMessage(evoErr)}`,
            );
          }
        }
      }
    }

    // 3b. Supabase Auth users cleanup
    for (const authUserId of authUserIds) {
      try {
        const { error: authDelErr } = await supabaseAdmin.auth.admin.deleteUser(authUserId);
        if (authDelErr) {
          authCleanupErrors.push(
            `Usuario Auth ${authUserId}: ${safeCleanupErrorMessage(authDelErr)}`,
          );
        }
      } catch (authError: unknown) {
        authCleanupErrors.push(`Usuario Auth ${authUserId}: ${safeCleanupErrorMessage(authError)}`);
      }
    }

    // 3c. Storage files cleanup ('spa-media' bucket)
    for (const companyId of companyIds) {
      await removeStoragePrefixRecursively(supabaseAdmin, companyId, storageCleanupErrors);
      await removeStoragePrefixRecursively(
        supabaseAdmin,
        companyId.replaceAll('-', ''),
        storageCleanupErrors,
      );
    }

    revalidatePath('/admin');

    return {
      success: true,
      databasePurged: {
        count: validatedRpcResult.purgedCount,
        companyIds: validatedRpcResult.companyIds,
      },
      authCleanupErrors,
      evolutionCleanupErrors,
      storageCleanupErrors,
    };
  } catch (error: unknown) {
    return { error: errorMessage(error) };
  }
}
