import { Banknote, Hash } from 'lucide-react';
import { formatBusinessDateTime } from '@/lib/business-date';

export interface PaymentHistoryItem {
  amount: number;
  id: string;
  operation_reference?: string | null;
  payment_date: string | null;
  payment_method: string;
}

function paymentMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    efectivo: 'Efectivo',
    yape: 'Yape',
    plin: 'Plin',
    transferencia: 'Transferencia',
    tarjeta: 'Tarjeta / POS',
  };
  return labels[method.toLowerCase()] || method;
}

function PaymentRow({ payment }: { payment: PaymentHistoryItem }) {
  return (
    <li className="flex items-start justify-between gap-3 py-2 text-xs">
      <div className="min-w-0">
        <p className="font-semibold text-black dark:text-white">
          {paymentMethodLabel(payment.payment_method)}
        </p>
        <p className="mt-0.5 text-zinc-500">
          {payment.payment_date ? formatBusinessDateTime(payment.payment_date) : 'Fecha no registrada'}
        </p>
        {payment.operation_reference && (
          <p className="mt-0.5 flex items-center gap-1 text-zinc-500">
            <Hash aria-hidden="true" className="h-3 w-3 shrink-0" />
            <span className="truncate">Operación {payment.operation_reference}</span>
          </p>
        )}
      </div>
      <span className="shrink-0 font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
        S/ {Number(payment.amount).toFixed(2)}
      </span>
    </li>
  );
}

export function PaymentHistory({ payments }: { payments?: PaymentHistoryItem[] | null }) {
  const ordered = [...(payments || [])].sort(
    (left, right) =>
      new Date(right.payment_date || 0).getTime() - new Date(left.payment_date || 0).getTime(),
  );

  if (ordered.length === 0) {
    return <p className="text-xs text-zinc-500">Sin pagos registrados</p>;
  }

  if (ordered.length === 1) {
    return (
      <ul aria-label="Pago registrado">
        <PaymentRow payment={ordered[0]} />
      </ul>
    );
  }

  return (
    <details className="group">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-xs font-semibold text-primary">
        <Banknote aria-hidden="true" className="h-4 w-4" />
        Ver {ordered.length} pagos
      </summary>
      <ul className="divide-y divide-black-light/40 dark:divide-dark-light">
        {ordered.map((payment) => (
          <PaymentRow key={payment.id} payment={payment} />
        ))}
      </ul>
    </details>
  );
}
