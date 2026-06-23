'use server';

import { createClient } from '@/utils/supabase/server';
import { SpaStaff } from '@/types/crm';
import { revalidatePath } from 'next/cache';

export async function getStaffListAction(): Promise<SpaStaff[]> {
  const supabase = await createClient();
  
  // Obtenemos los trabajadores
  const { data: staff, error: staffError } = await supabase
    .from('spa_staff')
    .select('*')
    .order('name', { ascending: true });
    
  if (staffError) {
    console.error('Error fetching staff:', staffError);
    return [];
  }

  // Obtenemos los servicios asociados
  const { data: staffServices, error: servicesError } = await supabase
    .from('spa_staff_services')
    .select('staff_id, service_id');
    
  if (servicesError) {
    console.error('Error fetching staff services:', servicesError);
    return staff; // Devolvemos el staff aunque falten los servicios
  }

  // Combinamos la información
  return staff.map((member: any) => ({
    id: member.id,
    name: member.name,
    birthday: member.birthday,
    role: member.role,
    isActive: member.is_active,
    services: staffServices
      .filter((ss: any) => ss.staff_id === member.id)
      .map((ss: any) => ss.service_id)
  }));
}

export async function upsertStaffAction(payload: {
  id?: string;
  name: string;
  birthday?: string;
  role?: string;
  isActive: boolean;
  services: string[];
}) {
  const supabase = await createClient();
  
  // 1. Obtener el company_id actual
  const { data: profile } = await supabase.from('profiles').select('company_id').single();
  if (!profile?.company_id) return { error: 'No autorizado' };

  let staffId = payload.id;

  // 2. Insertar o actualizar staff
  if (staffId) {
    const { error } = await supabase
      .from('spa_staff')
      .update({
        name: payload.name,
        birthday: payload.birthday || null,
        role: payload.role || null,
        is_active: payload.isActive,
        updated_at: new Date().toISOString()
      })
      .eq('id', staffId);
      
    if (error) return { error: 'Error actualizando trabajadora: ' + error.message };
  } else {
    const { data, error } = await supabase
      .from('spa_staff')
      .insert({
        company_id: profile.company_id,
        name: payload.name,
        birthday: payload.birthday || null,
        role: payload.role || null,
        is_active: payload.isActive
      })
      .select('id')
      .single();
      
    if (error) return { error: 'Error creando trabajadora: ' + error.message };
    staffId = data.id;
  }

  if (!staffId) return { error: 'No se pudo obtener el ID de la trabajadora' };

  // 3. Actualizar servicios (borrar y volver a insertar)
  await supabase.from('spa_staff_services').delete().eq('staff_id', staffId);
  
  if (payload.services.length > 0) {
    const servicesToInsert = payload.services.map(serviceId => ({
      staff_id: staffId,
      service_id: serviceId
    }));
    
    const { error: servicesError } = await supabase
      .from('spa_staff_services')
      .insert(servicesToInsert);
      
    if (servicesError) return { error: 'Error asignando servicios: ' + servicesError.message };
  }

  revalidatePath('/dashboard/trabajadoras');
  return { success: true };
}

export async function deleteStaffAction(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('spa_staff').delete().eq('id', id);
  if (error) return { error: 'Error eliminando trabajadora: ' + error.message };
  
  revalidatePath('/dashboard/trabajadoras');
  return { success: true };
}
