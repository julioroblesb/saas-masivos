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

  // Fetch completed visits with pending or partial payment status
  const { data: rawVisits, error: visitsErr } = await supabase
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
    .eq('status', 'completado')
    .in('payment_status', ['pendiente', 'parcial'])
    .order('debt_due_date', { ascending: true, nullsFirst: false });

  if (visitsErr) {
    console.error('Error fetching cobranza visits:', visitsErr);
  }

  // Fetch payments to calculate remaining debts
  const { data: payments, error: paymentsErr } = await supabase
    .from('spa_payments')
    .select('id, visit_id, amount, payment_method, payment_date, operation_reference')
    .eq('company_id', profile.company_id)
    .order('payment_date', { ascending: false });

  if (paymentsErr) {
    console.error('Error fetching cobranza payments:', paymentsErr);
  }

  const debts = (rawVisits || [])
    .map((visit) => {
      const visitPayments = (payments || []).filter((payment) => payment.visit_id === visit.id);
      const amount_paid = visitPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
      const price_charged = visit.price_charged ?? 0;
      const pending = price_charged - amount_paid;

      if (pending <= 0) return null;

      const contactObj = Array.isArray(visit.crm_marketing_contacts)
        ? visit.crm_marketing_contacts[0]
        : visit.crm_marketing_contacts;

      const serviceObj = Array.isArray(visit.spa_services)
        ? visit.spa_services[0]
        : visit.spa_services;

      return {
        id: visit.id,
        contact_name: contactObj?.name || null,
        contact_phone: contactObj?.phone || null,
        service_name: serviceObj?.name || null,
        visit_date: visit.visit_date,
        scheduled_date: visit.scheduled_date,
        price_charged,
        amount_paid,
        payments: visitPayments.map((payment) => ({
          ...payment,
          payment_date: payment.payment_date || visit.visit_date || visit.scheduled_date || new Date().toISOString(),
        })),
        debt_due_date: visit.debt_due_date,
        payment_status: visit.payment_status,
      };
    })
    .filter((d): d is NonNullable<typeof d> => d !== null);

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="type-page-title text-black dark:text-white">
            Cobranza
          </h1>
          <p className="text-zinc-500 mt-1 font-medium">Gestión de deudas y saldos pendientes.</p>
        </div>
      </div>
      <CobranzaManager debts={debts} />
    </div>
  );
}
