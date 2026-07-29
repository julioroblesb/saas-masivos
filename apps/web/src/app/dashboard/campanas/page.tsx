import CampaignsView from '@/modules/campaigns/CampaignsView';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { WhatsappConnection } from '@/modules/whatsapp/WhatsappConnection';

export default async function CampanasPage() {
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
      <div className="mb-6 flex flex-col gap-4 border-b border-black-light/50 pb-6 dark:border-dark-light lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="type-page-title text-dark dark:text-white-light">Campañas</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Segmenta tus contactos, prepara el mensaje y controla cada envío desde un solo lugar.
          </p>
        </div>
        <WhatsappConnection companyId={profile?.company_id} />
      </div>
      <CampaignsView />
    </div>
  );
}
