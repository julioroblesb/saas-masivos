'use server';

import { createClient } from '@/utils/supabase/server';

export async function updatePaymentMethodsAction(methods: string[]) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autorizado' };

    const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();
    if (!profile?.company_id) return { error: 'Empresa no encontrada' };

    const { data: currentCompany } = await supabase.from('companies').select('settings').eq('id', profile.company_id).single();
    
    const newSettings = {
      ...(currentCompany?.settings || {}),
      payment_methods: methods
    };

    const { error } = await supabase
      .from('companies')
      .update({ settings: newSettings })
      .eq('id', profile.company_id);

    if (error) throw error;
    
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}
