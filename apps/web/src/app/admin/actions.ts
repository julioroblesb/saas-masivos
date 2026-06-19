'use server';

import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/utils/supabase/admin';

export async function createTenant(formData: FormData) {
  const companyName = formData.get('companyName') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const fullName = formData.get('fullName') as string;

  if (!companyName || !email || !password) {
    return { error: 'Faltan campos obligatorios' };
  }

  try {
    // 1. Crear la empresa
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .insert({ name: companyName, status: 'activa' })
      .select('id')
      .single();

    if (companyError || !company) {
      console.error('Error creando empresa:', companyError);
      return { error: 'No se pudo crear la empresa' };
    }

    // 2. Crear el usuario en Auth de Supabase usando el Service Role
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirmar el correo para que puedan entrar directo
    });

    if (authError || !authData.user) {
      console.error('Error creando usuario Auth:', authError);
      // Rollback: borrar la empresa si falló el usuario
      await supabaseAdmin.from('companies').delete().eq('id', company.id);
      return { error: 'No se pudo crear el usuario o el correo ya existe' };
    }

    // 3. Crear el Perfil (Profile) vinculándolo a la empresa
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        company_id: company.id,
        role: 'tenant',
        full_name: fullName,
      });

    if (profileError) {
      console.error('Error creando perfil:', profileError);
      // Rollback: borrar auth y empresa
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      await supabaseAdmin.from('companies').delete().eq('id', company.id);
      return { error: 'No se pudo crear el perfil del usuario' };
    }

    // Recargar la página de admin para mostrar el nuevo cliente
    revalidatePath('/admin');
    
    return { success: true };
    
  } catch (err: any) {
    console.error('Error inesperado en createTenant:', err);
    return { error: 'Error del servidor al crear cliente' };
  }
}
