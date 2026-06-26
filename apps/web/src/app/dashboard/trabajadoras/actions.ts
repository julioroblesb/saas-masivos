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

    // 2.5 Insertar horario por defecto (Lunes a Viernes de 09:00 a 18:00)
    const defaultSchedules = [1, 2, 3, 4, 5, 6, 0].map(day => ({
      company_id: profile.company_id,
      staff_id: staffId,
      day_of_week: day,
      start_time: '09:00:00',
      end_time: '18:00:00',
      is_working: day >= 1 && day <= 5
    }));
    await supabase.from('spa_staff_schedules').insert(defaultSchedules);
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

export async function getStaffSchedulesAction(staffId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('spa_staff_schedules')
    .select('*')
    .eq('staff_id', staffId)
    .order('day_of_week', { ascending: true });
    
  if (error) {
    console.error('Error fetching staff schedules:', error);
    return [];
  }
  return data;
}

export async function upsertStaffSchedulesAction(staffId: string, schedules: any[]) {
  const supabase = await createClient();
  const { data: profile } = await supabase.from('profiles').select('company_id').single();
  if (!profile?.company_id) return { error: 'No autorizado' };

  // Eliminar los horarios anteriores para este staff (sobreescribir)
  await supabase.from('spa_staff_schedules').delete().eq('staff_id', staffId);

  // Insertar los nuevos
  if (schedules.length > 0) {
    const schedulesToInsert = schedules.map(sch => ({
      company_id: profile.company_id,
      staff_id: staffId,
      day_of_week: sch.day_of_week,
      start_time: sch.start_time,
      end_time: sch.end_time,
      is_working: sch.is_working
    }));

    const { error } = await supabase.from('spa_staff_schedules').insert(schedulesToInsert);
    if (error) return { error: 'Error guardando horarios: ' + error.message };
  }

  revalidatePath('/dashboard/trabajadoras');
  return { success: true };
}
