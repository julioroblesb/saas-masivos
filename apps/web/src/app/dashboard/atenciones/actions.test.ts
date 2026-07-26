import { describe, it, expect } from 'vitest';
import { z } from 'zod';

const emptyToUndefinedDate = z.preprocess((val) => {
  if (typeof val === 'string') {
    const trimmed = val.trim();
    return trimmed === '' ? undefined : trimmed;
  }
  if (val === null) return undefined;
  return val;
}, z.string().date().optional());

const completeVisitSchema = z
  .object({
    payment_method: z.string().trim().min(1).max(80).optional(),
    is_credit: z.boolean(),
    initial_payment: z.number().finite().min(0),
    debt_due_date: emptyToUndefinedDate,
    notes: z.string().trim().max(2000).optional(),
  })
  .refine(
    (payload) =>
      payload.initial_payment === 0 || payload.payment_method !== undefined,
    { message: 'Selecciona un método de pago', path: ['payment_method'] },
  )
  .refine(
    (payload) => !payload.is_credit || payload.debt_due_date !== undefined,
    {
      message: 'Selecciona la fecha de pago de la deuda',
      path: ['debt_due_date'],
    },
  );

describe('completeVisitSchema regression tests', () => {
  it('converts empty string debt_due_date to undefined for normal non-credit payment', () => {
    const result = completeVisitSchema.safeParse({
      payment_method: 'efectivo',
      is_credit: false,
      initial_payment: 100,
      debt_due_date: '',
      notes: '',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.debt_due_date).toBeUndefined();
    }
  });

  it('fails validation when is_credit is true but debt_due_date is empty string', () => {
    const result = completeVisitSchema.safeParse({
      payment_method: 'efectivo',
      is_credit: true,
      initial_payment: 50,
      debt_due_date: '',
      notes: '',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Selecciona la fecha de pago de la deuda');
    }
  });

  it('accepts valid debt_due_date when is_credit is true', () => {
    const result = completeVisitSchema.safeParse({
      payment_method: 'yape',
      is_credit: true,
      initial_payment: 30,
      debt_due_date: '2026-07-31',
      notes: 'Pago parcial',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.debt_due_date).toBe('2026-07-31');
    }
  });
});
