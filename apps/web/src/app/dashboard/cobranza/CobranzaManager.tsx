'use client';

import { useState, useTransition } from 'react';
import { Coins, Phone, Search, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { addPaymentAction } from '../atenciones/actions';
import {
  createPaymentDraft,
  PaymentCaptureFields,
  type PaymentDraft,
  requiresOperationReference,
} from '@/components/payments/PaymentCaptureFields';
import { PaymentHistory, type PaymentHistoryItem } from '@/components/payments/PaymentHistory';
import { formatBusinessDateTime, formatDateOnly } from '@/lib/business-date';

interface DebtVisit {
  amount_paid: number;
  contact_name?: string | null;
  contact_phone?: string | null;
  debt_due_date?: string | null;
  id: string;
  payment_status?: string | null;
  payments: PaymentHistoryItem[];
  price_charged?: number | null;
  scheduled_date?: string | null;
  service_name?: string | null;
  visit_date?: string | null;
}

const money = (value: number) => `S/ ${Number(value).toFixed(2)}`;

export default function CobranzaManager({ debts }: { debts: DebtVisit[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [localDebts, setLocalDebts] = useState(debts);
  const [search, setSearch] = useState('');
  const [paymentVisit, setPaymentVisit] = useState<DebtVisit | null>(null);
  const [paymentDraft, setPaymentDraft] = useState<PaymentDraft>(() => createPaymentDraft(0));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const query = search.trim().toLowerCase();
  const filteredDebts = query
    ? localDebts.filter(
        (debt) =>
          (debt.contact_name || '').toLowerCase().includes(query) ||
          (debt.service_name || '').toLowerCase().includes(query) ||
          (debt.contact_phone || '').includes(query),
      )
    : localDebts;
  const totalDebt = filteredDebts.reduce(
    (sum, debt) => sum + Math.max(0, (debt.price_charged ?? 0) - debt.amount_paid),
    0,
  );

  const openPayment = (debt: DebtVisit) => {
    const remaining = Math.max(0, (debt.price_charged ?? 0) - debt.amount_paid);
    setPaymentVisit(debt);
    setPaymentDraft(createPaymentDraft(remaining));
  };

  const handleAddPayment = async () => {
    if (!paymentVisit) return;
    const total = paymentVisit.price_charged ?? 0;
    const remaining = Math.max(0, total - paymentVisit.amount_paid);
    if (paymentDraft.amount <= 0 || paymentDraft.amount > remaining) {
      toast.error(`El pago debe ser mayor que cero y no superar ${money(remaining)}.`);
      return;
    }
    if (paymentDraft.mode === 'partial' && paymentDraft.amount >= remaining) {
      toast.error('Para pagar todo el saldo, selecciona “Pago completo”.');
      return;
    }
    if (
      requiresOperationReference(paymentDraft.method) &&
      paymentDraft.operationReference.trim().length < 3
    ) {
      toast.error('Ingresa el número de operación.');
      return;
    }

    setIsSubmitting(true);
    const res = await addPaymentAction(paymentVisit.id, {
      amount: paymentDraft.amount,
      payment_method: paymentDraft.method as
        | 'efectivo'
        | 'yape'
        | 'plin'
        | 'transferencia'
        | 'tarjeta',
      payment_date: new Date(paymentDraft.paidAt).toISOString(),
      operation_reference: paymentDraft.operationReference || undefined,
    });
    if (res.error) {
      toast.error(res.error);
      setIsSubmitting(false);
      return;
    }

    const serverTotalPaid = Number(res.data?.total_paid ?? paymentVisit.amount_paid + paymentDraft.amount);
    const newRemaining = Math.max(0, total - serverTotalPaid);
    setLocalDebts((current) =>
      newRemaining <= 0
        ? current.filter((debt) => debt.id !== paymentVisit.id)
        : current.map((debt) =>
            debt.id === paymentVisit.id
              ? {
                  ...debt,
                  amount_paid: serverTotalPaid,
                  payment_status: String(res.data?.payment_status || 'parcial'),
                  payments: res.data?.payment
                    ? [res.data.payment as PaymentHistoryItem, ...debt.payments]
                    : debt.payments,
                }
              : debt,
          ),
    );
    toast.success(newRemaining <= 0 ? 'Saldo pagado por completo' : 'Abono parcial registrado');
    setPaymentVisit(null);
    setIsSubmitting(false);
    startTransition(() => router.refresh());
  };

  return (
    <div className="space-y-5">
      <section
        aria-label="Resumen de cobranza"
        className="flex items-center justify-between border-y border-black-light py-4 dark:border-dark-light sm:rounded-2xl sm:border sm:px-5"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Saldo por cobrar</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-danger">{money(totalDebt)}</p>
        </div>
        <Coins aria-hidden="true" className="h-6 w-6 text-danger" />
      </section>

      <label className="relative block w-full sm:max-w-sm">
        <span className="sr-only">Buscar deuda</span>
        <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          type="search"
          placeholder="Buscar cliente, teléfono o servicio"
          className="form-input min-h-11 w-full rounded-xl border-black-light bg-white pl-10 dark:border-dark-light dark:bg-dark"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>

      {filteredDebts.length === 0 ? (
        <p className="py-12 text-center text-zinc-500">No hay saldos pendientes.</p>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {filteredDebts.map((debt) => {
              const pending = Math.max(0, (debt.price_charged ?? 0) - debt.amount_paid);
              return (
                <article key={debt.id} className="rounded-2xl border border-black-light p-4 dark:border-dark-light">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate font-bold text-black dark:text-white">{debt.contact_name || 'Sin nombre'}</h2>
                      <p className="mt-1 truncate text-sm text-zinc-600 dark:text-zinc-300">{debt.service_name}</p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-zinc-500">
                        <Phone aria-hidden="true" className="h-3 w-3" /> +{debt.contact_phone}
                      </p>
                    </div>
                    <strong className="shrink-0 tabular-nums text-danger">{money(pending)}</strong>
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 border-y border-black-light py-3 text-xs dark:border-dark-light">
                    <div><dt className="text-zinc-500">Atención</dt><dd className="mt-1 font-semibold">{formatBusinessDateTime(debt.scheduled_date || debt.visit_date)}</dd></div>
                    <div><dt className="text-zinc-500">Fecha acordada</dt><dd className="mt-1 font-semibold">{debt.debt_due_date ? formatDateOnly(debt.debt_due_date) : 'Sin fecha'}</dd></div>
                    <div><dt className="text-zinc-500">Total</dt><dd className="mt-1 font-semibold tabular-nums">{money(debt.price_charged ?? 0)}</dd></div>
                    <div><dt className="text-zinc-500">Pagado</dt><dd className="mt-1 font-semibold tabular-nums text-emerald-600">{money(debt.amount_paid)}</dd></div>
                  </dl>
                  <div className="mt-2"><PaymentHistory payments={debt.payments} /></div>
                  <button type="button" onClick={() => openPayment(debt)} className="btn btn-primary mt-3 min-h-11 w-full rounded-xl">
                    Registrar pago
                  </button>
                </article>
              );
            })}
          </div>

          <div className="hidden overflow-hidden rounded-2xl border border-black-light dark:border-dark-light md:block">
            <table className="w-full text-left">
              <thead className="border-b border-black-light bg-zinc-50 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:border-dark-light dark:bg-zinc-900/50">
                <tr><th className="px-5 py-3">Cliente y servicio</th><th className="px-5 py-3">Pagos</th><th className="px-5 py-3 text-right">Saldo</th><th className="px-5 py-3 text-right">Acción</th></tr>
              </thead>
              <tbody className="divide-y divide-black-light dark:divide-dark-light">
                {filteredDebts.map((debt) => {
                  const pending = Math.max(0, (debt.price_charged ?? 0) - debt.amount_paid);
                  return (
                    <tr key={debt.id}>
                      <td className="px-5 py-4"><p className="font-semibold">{debt.contact_name || 'Sin nombre'}</p><p className="text-sm text-zinc-500">{debt.service_name} · {formatBusinessDateTime(debt.scheduled_date || debt.visit_date)}</p></td>
                      <td className="px-5 py-4"><PaymentHistory payments={debt.payments} /></td>
                      <td className="px-5 py-4 text-right"><p className="font-bold tabular-nums text-danger">{money(pending)}</p><p className="text-xs text-zinc-500">de {money(debt.price_charged ?? 0)}</p></td>
                      <td className="px-5 py-4 text-right"><button type="button" onClick={() => openPayment(debt)} className="btn btn-primary min-h-11 rounded-xl px-4">Registrar pago</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {paymentVisit && (
        <div className="fixed inset-0 z-[999] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="payment-title" className="max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl dark:bg-dark sm:max-w-md sm:rounded-3xl">
            <header className="sticky top-0 z-10 flex items-center justify-between border-b border-black-light bg-white px-5 py-4 dark:border-dark-light dark:bg-dark">
              <div><h2 id="payment-title" className="text-xl font-bold">Registrar pago</h2><p className="mt-1 text-sm text-zinc-500">Saldo: {money((paymentVisit.price_charged ?? 0) - paymentVisit.amount_paid)}</p></div>
              <button type="button" aria-label="Cerrar" onClick={() => setPaymentVisit(null)} className="grid min-h-11 min-w-11 place-items-center rounded-full hover:bg-zinc-100 active:scale-95 dark:hover:bg-zinc-800"><X aria-hidden="true" className="h-5 w-5" /></button>
            </header>
            <div className="space-y-5 p-5">
              <PaymentCaptureFields draft={paymentDraft} onChange={setPaymentDraft} remaining={(paymentVisit.price_charged ?? 0) - paymentVisit.amount_paid} />
              <div className="flex gap-3 border-t border-black-light pt-4 dark:border-dark-light">
                <button type="button" onClick={() => setPaymentVisit(null)} className="btn btn-outline-secondary min-h-11 flex-1 rounded-xl">Cancelar</button>
                <button type="button" onClick={handleAddPayment} disabled={isSubmitting} className="btn btn-primary min-h-11 flex-1 rounded-xl">{isSubmitting ? 'Guardando…' : 'Guardar pago'}</button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
