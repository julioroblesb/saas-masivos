import CampaignsView from '@/modules/campaigns/CampaignsView';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { Header } from '@/components/Header';
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
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Panel de Campañas</h1>
          <p className="text-zinc-500 dark:text-gray-400 mt-1">Gestiona y monitoriza tus envíos masivos</p>
        </div>
        <WhatsappConnection companyId={profile?.company_id} />
      </header>
      <main>
        <CampaignsView />
      </main>
    </div>
  );
}
