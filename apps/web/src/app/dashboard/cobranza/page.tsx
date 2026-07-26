import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import CobranzaManager from './CobranzaManager';

export const metadata = {
  title: 'Cobranza | CRM Negocios',
};

export default async function CobranzaPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single();

  if (!profile?.company_id) redirect('/login');

  // Fetch only pending/partial visits
  const { data: rawVisits } = await supabase
    .from('spa_visits')
    .select(`
      id,
      visit_date,
      scheduled_date,
      status,
      price_charged,
      payment_status,
      debt_due_date,
      contact_id,
      crm_marketing_contacts!spa_visits_contact_tenant_fkey (name, phone),
      spa_services (name)
    `)
    .eq('company_id', profile.company_id)
    .in('payment_status', ['pendiente', 'parcial'])
    .order('debt_due_date', { ascending: true, nullsFirst: false });

  // Fetch payments to calculate remaining debts
  const { data: payments } = await supabase
    .from('spa_payments')
    .select('visit_id, amount')
    .eq('company_id', profile.company_id);

  const debts = (rawVisits || []).map((visit) => {
    const visitPayments = (payments || []).filter((payment) => payment.visit_id === visit.id);
    const amount_paid = visitPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    return {
      id: visit.id,
      contact_name: visit.crm_marketing_contacts?.[0]?.name,
      contact_phone: visit.crm_marketing_contacts?.[0]?.phone,
      service_name: visit.spa_services?.[0]?.name,
      visit_date: visit.visit_date,
      scheduled_date: visit.scheduled_date,
      price_charged: visit.price_charged,
      amount_paid,
      debt_due_date: visit.debt_due_date,
      payment_status: visit.payment_status
    };
  });

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-black dark:text-white">
            Cobranza
          </h1>
          <p className="text-zinc-500 mt-1 font-medium">Gestión de deudas y saldos pendientes.</p>
        </div>
      </div>
      <CobranzaManager debts={debts} />
    </div>
  );
}
