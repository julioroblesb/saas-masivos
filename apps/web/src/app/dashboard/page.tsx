import CampaignsView from '@/modules/campaigns/CampaignsView';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { WhatsappConnection } from '@/modules/whatsapp/WhatsappConnection';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Verificar si es tenant
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single();

  if (profile?.role === 'super_admin') {
    redirect('/admin');
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h5 className="text-lg font-semibold dark:text-white-light">Panel de Campañas</h5>
        <WhatsappConnection companyId={profile?.company_id} />
      </div>
      <div className="panel">
        <CampaignsView />
      </div>
    </div>
  );
}
