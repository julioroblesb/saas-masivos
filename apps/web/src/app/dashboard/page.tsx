import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { WhatsappConnection } from '@/modules/whatsapp/WhatsappConnection';
import { TenantDashboard } from '@/modules/dashboard/TenantDashboard';

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

  // Obtener estado de conexión
  const { data: session } = await supabase
    .from('wa_sessions')
    .select('status, phone_number')
    .eq('company_id', profile?.company_id)
    .single();

  // Fecha de hace 7 días y hoy
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 6);

  // Obtener historial de envíos de la cola de los últimos 7 días
  const { data: queueData } = await supabase
    .from('crm_wa_queue')
    .select('status, sent_at')
    .eq('company_id', profile?.company_id)
    .gte('sent_at', sevenDaysAgo.toISOString());

  // Obtener sumatoria de campañas para tasa de conversión global
  const { data: campaigns } = await supabase
    .from('crm_wa_campaigns')
    .select('sent_count, replied_count')
    .eq('company_id', profile?.company_id);

  let totalSent = 0;
  let totalReplies = 0;
  if (campaigns) {
    campaigns.forEach(c => {
      totalSent += c.sent_count || 0;
      totalReplies += c.replied_count || 0;
    });
  }
  const conversionRate = totalSent > 0 ? Math.round((totalReplies / totalSent) * 100) : 0;

  // Procesar stats de hoy
  let sentToday = 0;
  let failedToday = 0;
  
  // Procesar historial de 7 días
  const chartData = {
    exitosos: [0, 0, 0, 0, 0, 0, 0],
    fallidos: [0, 0, 0, 0, 0, 0, 0],
    categorias: [] as string[]
  };

  const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgo);
    d.setDate(d.getDate() + i);
    chartData.categorias.push(daysOfWeek[d.getDay()]);
  }

  if (queueData) {
    queueData.forEach(msg => {
      if (!msg.sent_at) return;
      
      const sentAt = new Date(msg.sent_at);
      
      // Hoy?
      if (sentAt >= today) {
        if (msg.status === 'enviado') sentToday++;
        if (msg.status === 'fallido') failedToday++;
      }
      
      // Encontrar índice para el chart (0 a 6)
      const diffTime = Math.abs(sentAt.getTime() - sevenDaysAgo.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays >= 0 && diffDays < 7) {
        if (msg.status === 'enviado') chartData.exitosos[diffDays]++;
        if (msg.status === 'fallido') chartData.fallidos[diffDays]++;
      }
    });
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h5 className="text-lg font-semibold dark:text-white-light">Dashboard General</h5>
        <WhatsappConnection companyId={profile?.company_id} />
      </div>
      <div>
        <TenantDashboard 
          waStatus={session?.status === 'conectado'} 
          waPhone={session?.phone_number || 'N/A'}
          sentToday={sentToday}
          failedToday={failedToday}
          chartData={chartData}
          conversionRate={conversionRate}
          totalReplies={totalReplies}
        />
      </div>
    </div>
  );
}
