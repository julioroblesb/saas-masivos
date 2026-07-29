'use client';

import { Banknote, CalendarClock, CreditCard, Hash } from 'lucide-react';

export const PAYMENT_METHOD_OPTIONS = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'yape', label: 'Yape' },
  { value: 'plin', label: 'Plin' },
  { value: 'transferencia', label: 'Transferencia bancaria' },
  { value: 'tarjeta', label: 'Tarjeta / POS' },
] as const;

export type PaymentMode = 'full' | 'partial' | 'none';

export interface PaymentDraft {
  amount: number;
  method: string;
  mode: PaymentMode;
  operationReference: string;
  paidAt: string;
}

export function toLocalDateTimeValue(date = new Date()): string {
  const timezoneOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

export function createPaymentDraft(
  remaining: number,
  mode: PaymentMode = 'full',
  paidAt = new Date(),
): PaymentDraft {
  return {
    amount: mode === 'full' ? remaining : 0,
    method: 'efectivo',
    mode,
    operationReference: '',
    paidAt: toLocalDateTimeValue(paidAt),
  };
}

export function requiresOperationReference(method: string): boolean {
  return method.toLowerCase() !== 'efectivo';
}

interface PaymentCaptureFieldsProps {
  allowNoPayment?: boolean;
  draft: PaymentDraft;
  onChange: (draft: PaymentDraft) => void;
  remaining: number;
}

export function PaymentCaptureFields({
  allowNoPayment = false,
  draft,
  onChange,
  remaining,
}: PaymentCaptureFieldsProps) {
  const setMode = (mode: PaymentMode) => {
    onChange({
      ...draft,
      amount:
        mode === 'full'
          ? remaining
          : mode === 'none'
            ? 0
            : draft.amount > 0 && draft.amount < remaining
              ? draft.amount
              : 0,
      mode,
      operationReference: mode === 'none' ? '' : draft.operationReference,
    });
  };

  const modes: Array<{ label: string; value: PaymentMode }> = [
    { value: 'full', label: 'Pago completo' },
    { value: 'partial', label: 'Abono parcial' },
    ...(allowNoPayment ? [{ value: 'none' as const, label: 'Cobrar después' }] : []),
  ];

  return (
    <fieldset className="space-y-4">
      <legend className="text-sm font-semibold text-black dark:text-white">Pago de la atención</legend>

      <div className="grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900">
        {modes.map((mode) => (
          <button
            key={mode.value}
            type="button"
            aria-pressed={draft.mode === mode.value}
            className={`min-h-11 rounded-lg px-3 text-sm font-semibold transition-[background-color,color,transform] duration-150 active:scale-[0.97] ${
              draft.mode === mode.value
                ? 'bg-white text-primary shadow-sm dark:bg-zinc-800'
                : 'text-zinc-600 dark:text-zinc-300'
            } ${modes.length === 3 && mode.value === 'none' ? 'col-span-2' : ''}`}
            onClick={() => setMode(mode.value)}
          >
            {mode.label}
          </button>
        ))}
      </div>

      {draft.mode === 'none' ? (
        <p className="text-sm leading-5 text-zinc-500 dark:text-zinc-400">
          La atención quedará completada con el saldo pendiente en Cobranza.
        </p>
      ) : (
        <div className="space-y-4">
          <div>
            <label
              htmlFor="payment-amount"
              className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-black dark:text-white"
            >
              <Banknote aria-hidden="true" className="h-4 w-4 text-primary" />
              {draft.mode === 'full' ? 'Monto total' : 'Monto del abono'}
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
                S/
              </span>
              <input
                id="payment-amount"
                type="number"
                inputMode="decimal"
                min={draft.mode === 'partial' ? 0.01 : remaining}
                max={remaining}
                step="0.01"
                readOnly={draft.mode === 'full'}
                className="form-input min-h-11 w-full rounded-xl border-black-light bg-white pl-9 text-base tabular-nums dark:border-dark-light dark:bg-dark"
                value={draft.amount}
                onChange={(event) =>
                  onChange({ ...draft, amount: Number.parseFloat(event.target.value) || 0 })
                }
              />
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              Saldo disponible: S/ {remaining.toFixed(2)}
            </p>
          </div>

          <div>
            <label
              htmlFor="payment-method"
              className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-black dark:text-white"
            >
              <CreditCard aria-hidden="true" className="h-4 w-4 text-primary" />
              Método de pago
            </label>
            <select
              id="payment-method"
              className="form-select min-h-11 w-full rounded-xl border-black-light bg-white text-base dark:border-dark-light dark:bg-dark"
              value={draft.method}
              onChange={(event) =>
                onChange({
                  ...draft,
                  method: event.target.value,
                  operationReference:
                    event.target.value === 'efectivo' ? '' : draft.operationReference,
                })
              }
            >
              {PAYMENT_METHOD_OPTIONS.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </div>

          {requiresOperationReference(draft.method) && (
            <div>
              <label
                htmlFor="payment-operation"
                className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-black dark:text-white"
              >
                <Hash aria-hidden="true" className="h-4 w-4 text-primary" />
                Número de operación
              </label>
              <input
                id="payment-operation"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                maxLength={120}
                required
                placeholder="Ej. 0068241937"
                className="form-input min-h-11 w-full rounded-xl border-black-light bg-white text-base dark:border-dark-light dark:bg-dark"
                value={draft.operationReference}
                onChange={(event) =>
                  onChange({ ...draft, operationReference: event.target.value })
                }
              />
              <p className="mt-1 text-xs text-zinc-500">
                Requerido para Yape, Plin, transferencia y tarjeta.
              </p>
            </div>
          )}

          <div>
            <label
              htmlFor="payment-date"
              className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-black dark:text-white"
            >
              <CalendarClock aria-hidden="true" className="h-4 w-4 text-primary" />
              Fecha y hora del pago
            </label>
            <input
              id="payment-date"
              type="datetime-local"
              required
              className="form-input min-h-11 w-full rounded-xl border-black-light bg-white text-base dark:border-dark-light dark:bg-dark"
              value={draft.paidAt}
              onChange={(event) => onChange({ ...draft, paidAt: event.target.value })}
            />
          </div>
        </div>
      )}
    </fieldset>
  );
}
