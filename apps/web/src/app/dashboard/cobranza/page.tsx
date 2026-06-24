import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import CobranzaManager from './CobranzaManager';

export const metadata = {
  title: 'Cobranza | CRM Spa',
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
      marketing_contacts (name, phone),
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

  const debts = (rawVisits || []).map((v: any) => {
    const vPayments = (payments || []).filter((p: any) => p.visit_id === v.id);
    const amount_paid = vPayments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
    return {
      id: v.id,
      contact_name: v.marketing_contacts?.name,
      contact_phone: v.marketing_contacts?.phone,
      service_name: v.spa_services?.name,
      visit_date: v.visit_date,
      scheduled_date: v.scheduled_date,
      price_charged: v.price_charged,
      amount_paid,
      debt_due_date: v.debt_due_date,
      payment_status: v.payment_status
    };
  });

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
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
