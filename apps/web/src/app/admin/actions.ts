'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseAdmin } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';
import { z } from 'zod';

export async function createTenant(formData: FormData) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
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
    const companyName = (formData.get('companyName') as string || '').trim();
    const fullName = (formData.get('fullName') as string || '').trim();
    const email = (formData.get('email') as string || '').trim();
    const password = (formData.get('password') as string || '').trim();

    if (!companyName || !email || !password) {
      return { error: 'Nombre de empresa, correo y contraseña son obligatorios' };
    }

    const trialStart = new Date();
    const trialEnd = new Date(trialStart.getTime() + 7 * 24 * 60 * 60 * 1000);

    // 1. Crear la compañía (tenant) con 7 días de prueba explícitos
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .insert({
        name: companyName,
        plan_type: 'prueba',
        status: 'activa',
        subscription_start_at: trialStart.toISOString(),
        subscription_end_at: trialEnd.toISOString(),
      })
      .select()
      .single();

    if (companyError || !company) {
      return { error: companyError?.message || 'Error al crear la empresa' };
    }

    // 2. Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName || '',
      }
    });

    if (authError || !authData.user) {
      await supabaseAdmin.from('companies').delete().eq('id', company.id);
      return { error: authError?.message || 'Error al crear el usuario auth' };
    }

    // 3. Crear el perfil SIN incluir 'email' (ya vive en auth.users)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          id: authData.user.id,
          company_id: company.id,
          role: 'tenant',
          full_name: fullName || null,
        },
        { onConflict: 'id' }
      );

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      await supabaseAdmin.from('companies').delete().eq('id', company.id);
      return { error: profileError.message };
    }

    revalidatePath('/admin');
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}

const updateSubscriptionSchema = z.object({
  plan_type: z.enum(['prueba', 'mensual', 'bimestral', 'trimestral', 'semestral', 'anual']).optional(),
  status: z.enum(['activa', 'suspendida', 'cancelada']).optional(),
  subscription_start_at: z.string().optional(),
  subscription_end_at: z.string().optional(),
});

export async function updateTenantSubscription(companyId: string, data: any) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
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
        return { error: 'No se puede activar un tenant con una fecha de vencimiento pasada. Renueve la fecha primero.' };
      }
    }

    const { error } = await supabaseAdmin
      .from('companies')
      .update(parsedData)
      .eq('id', companyId);

    if (error) {
      console.error('Error updateTenantSubscription:', error);
      return { error: error.message };
    }

    if (parsedData.status && parsedData.status !== 'activa') {
      await supabaseAdmin.from('wa_sessions').update({ status: 'desconectado' }).eq('company_id', companyId);
    }

    revalidatePath('/admin');
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function deleteTenant(companyId: string) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return { error: 'No autorizado' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'super_admin') {
      return { error: 'No autorizado' };
    }

    const { data: profiles } = await supabaseAdmin.from('profiles').select('id').eq('company_id', companyId);
    
    if (profiles && profiles.length > 0) {
      for (const p of profiles) {
        await supabaseAdmin.auth.admin.deleteUser(p.id);
      }
    }

    const { error } = await supabaseAdmin.from('companies').delete().eq('id', companyId);

    if (error) {
      console.error('Error deleteTenant:', error);
      return { error: error.message };
    }

    revalidatePath('/admin');
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}
