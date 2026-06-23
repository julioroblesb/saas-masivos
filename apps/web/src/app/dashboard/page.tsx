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
      <div className="mb-8 flex items-center justify-between backdrop-blur-md bg-white/30 dark:bg-black/30 p-4 rounded-xl border border-white/20 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
            Panel de Control
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Resumen de tu Spa
          </p>
        </div>
        <WhatsappConnection companyId={profile?.company_id} />
      </div>
      
      <SpaDashboard metrics={metrics} />
    </div>
  );
}

