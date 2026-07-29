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
      <div className="mb-6 border-b border-black-light/50 pb-6 dark:border-dark-light">
        <h1 className="type-page-title text-dark dark:text-white-light">Mensajería</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Revisa los mensajes programados, su entrega y los envíos que todavía puedes modificar.
        </p>
      </div>
      <MensajeriaView />
    </div>
  );
}
