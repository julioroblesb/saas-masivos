import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { WhatsappConnection } from '@/modules/whatsapp/WhatsappConnection';
import { SpaDashboard } from '@/modules/dashboard/SpaDashboard';

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

  // Obtener estado de conexión WA
  const { data: session } = await supabase
    .from('wa_sessions')
    .select('status, phone_number')
    .eq('company_id', profile?.company_id)
    .single();

  // Llamar a RPC function para stats del spa
  const { data: spaStats, error: rpcError } = await supabase
    .rpc('rpc_get_spa_dashboard', { p_company_id: profile?.company_id });

  let metrics = {
    clients_today: 0,
    revenue_today: 0,
    auto_messages_7d: 0,
    recovered_clients: 0
  };

  if (!rpcError && spaStats) {
    const data = Array.isArray(spaStats) ? spaStats[0] : spaStats;
    metrics = { ...metrics, ...data };
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between pb-6 border-b border-black-light dark:border-dark-light">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-white">
            Panel de Control
          </h1>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mt-2">
            Resumen de tu Spa
          </p>
        </div>
        <WhatsappConnection companyId={profile?.company_id} />
      </div>
      
      <SpaDashboard metrics={metrics} />
    </div>
  );
}

