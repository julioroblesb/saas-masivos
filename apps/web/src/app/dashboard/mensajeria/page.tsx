import MensajeriaView from '@/modules/mensajeria/MensajeriaView';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function MensajeriaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single();

  if (profile?.role === 'super_admin') {
    redirect('/admin');
  }

  return (
    <div className="animate-in fade-in duration-500">
      <div className="mb-5 flex items-center justify-between">
        <h5 className="text-lg font-semibold dark:text-white-light">Historial y Mensajes en Cola</h5>
      </div>
      <div className="panel p-0 border-0">
        <MensajeriaView />
      </div>
    </div>
  );
}
