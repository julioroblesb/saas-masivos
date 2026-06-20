'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseAdmin } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';

export async function createTenant(formData: FormData) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const companyName = formData.get('companyName') as string;
    const fullName = formData.get('fullName') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    // Crear la compañía (tenant)
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .insert({
        name: companyName,
        plan_type: 'prueba',
        status: 'activa',
      })
      .select()
      .single();

    if (companyError || !company) {
      return { error: companyError?.message || 'Error al crear la empresa' };
    }

    // Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName || '',
      }
    });

    if (authError || !authData.user) {
      // Revertir la creación de compañía si falla la creación de usuario
      await supabaseAdmin.from('companies').delete().eq('id', company.id);
      return { error: authError?.message || 'Error al crear el usuario auth' };
    }

    // Actualizar el perfil recién creado (creado automáticamente por el trigger de supabase si lo tuviéramos)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: authData.user.id,
        email: email,
        company_id: company.id,
        role: 'tenant',
        full_name: fullName || '',
      });

    if (profileError) {
      // Revertir
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

export async function updateTenantSubscription(companyId: string, data: any) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
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

    const { error } = await supabaseAdmin
      .from('companies')
      .update(data)
      .eq('id', companyId);

    if (error) {
      console.error('Error updateTenantSubscription:', error);
      return { error: error.message };
    }

    // Si pasamos a un estado distinto a activa, desconectar sesión en db
    if (data.status && data.status !== 'activa') {
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

    // 1. Obtener todos los perfiles de la compañía
    const { data: profiles } = await supabaseAdmin.from('profiles').select('id').eq('company_id', companyId);
    
    // 2. Eliminar usuarios de auth.users (Supabase Admin)
    if (profiles && profiles.length > 0) {
      for (const p of profiles) {
        await supabaseAdmin.auth.admin.deleteUser(p.id);
      }
    }

    // 3. Eliminar compañía (cascade borrará profiles, contacts, campaigns)
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
