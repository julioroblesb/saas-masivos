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

/**
 * Transactional & Observable Demo Tenant Purge.
 * 1. Verifies super_admin role and validates input array.
 * 2. Captures metadata BEFORE purging database (Auth IDs, Evolution instances, Storage prefixes).
 * 3. Calls rpc_purge_demo_tenants for atomic database transaction.
 * 4. Post-commit: attempts cleanup of Evolution instances, Auth users, and Storage files.
 * 5. Returns structured observability detailing DB success and any external cleanup notices.
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
    const { data: linkedProfiles } = await supabaseAdmin
      .from('profiles')
      .select('id, company_id')
      .in('company_id', companyIds);

    const authUserIds = (linkedProfiles ?? []).map((p) => p.id);

    const { data: waSessions } = await supabaseAdmin
      .from('wa_sessions')
      .select('company_id, evolution_instance_name, status')
      .in('company_id', companyIds);

    // 2. EXECUTE TRANSACTIONAL RPC FOR ATOMIC DB PURGE
    const { data: rpcResult, error: rpcErr } = await supabaseAdmin.rpc('rpc_purge_demo_tenants', {
      p_company_ids: companyIds,
      p_actor_id: user.id,
    });

    if (rpcErr) {
      return { error: `Error en purga de base de datos: ${rpcErr.message}` };
    }

    const parsedRpcRes = rpcResult as {
      success?: boolean;
      purged_count?: number;
      company_ids?: string[];
    };

    // 3. POST-COMMIT EXTERNAL CLEANUPS (Observable & Non-Destructive to committed DB state)
    const authCleanupErrors: string[] = [];
    const evolutionCleanupErrors: string[] = [];
    const storageCleanupErrors: string[] = [];

    // 3a. Evolution API instance cleanup
    if (waSessions && waSessions.length > 0) {
      for (const session of waSessions) {
        if (session.evolution_instance_name) {
          try {
            if (session.status !== 'desconectado') {
              await evolution.logoutInstance(session.evolution_instance_name);
            }
            await evolution.deleteInstance(session.evolution_instance_name);
          } catch (evoErr: unknown) {
            evolutionCleanupErrors.push(
              `Instancia ${session.evolution_instance_name}: ${
                evoErr instanceof Error ? evoErr.message : String(evoErr)
              }`,
            );
          }
        }
      }
    }

    // 3b. Supabase Auth users cleanup
    for (const authUserId of authUserIds) {
      const { error: authDelErr } = await supabaseAdmin.auth.admin.deleteUser(authUserId);
      if (authDelErr) {
        authCleanupErrors.push(`Usuario Auth ${authUserId}: ${authDelErr.message}`);
      }
    }

    // 3c. Storage files cleanup ('spa-media' bucket)
    for (const companyId of companyIds) {
      try {
        const rawPrefix = `${companyId}`;
        const cleanPrefix = companyId.replaceAll('-', '');

        const { data: rawFiles } = await supabaseAdmin.storage.from('spa-media').list(rawPrefix);
        if (rawFiles && rawFiles.length > 0) {
          const filePaths = rawFiles.map((f) => `${rawPrefix}/${f.name}`);
          await supabaseAdmin.storage.from('spa-media').remove(filePaths);
        }

        const { data: cleanFiles } = await supabaseAdmin.storage.from('spa-media').list(cleanPrefix);
        if (cleanFiles && cleanFiles.length > 0) {
          const filePaths = cleanFiles.map((f) => `${cleanPrefix}/${f.name}`);
          await supabaseAdmin.storage.from('spa-media').remove(filePaths);
        }
      } catch (stgErr: unknown) {
        storageCleanupErrors.push(
          `Storage ${companyId}: ${stgErr instanceof Error ? stgErr.message : String(stgErr)}`,
        );
      }
    }

    revalidatePath('/admin');

    return {
      success: true,
      databasePurged: {
        count: parsedRpcRes.purged_count ?? companyIds.length,
        companyIds: parsedRpcRes.company_ids ?? companyIds,
      },
      authCleanupErrors,
      evolutionCleanupErrors,
      storageCleanupErrors,
    };
  } catch (error: unknown) {
    return { error: errorMessage(error) };
  }
}
