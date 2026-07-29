import { describe, expect, it } from 'vitest';
import { createPaymentDraft, requiresOperationReference } from './PaymentCaptureFields';

describe('payment capture rules', () => {
  it('requires an operation reference for every electronic method', () => {
    expect(requiresOperationReference('efectivo')).toBe(false);
    expect(requiresOperationReference('yape')).toBe(true);
    expect(requiresOperationReference('plin')).toBe(true);
    expect(requiresOperationReference('transferencia')).toBe(true);
    expect(requiresOperationReference('tarjeta')).toBe(true);
  });

  it('starts a full payment with the exact remaining balance', () => {
    const draft = createPaymentDraft(159.5, 'full', new Date('2026-07-29T15:30:00-05:00'));
    expect(draft.amount).toBe(159.5);
    expect(draft.mode).toBe('full');
    expect(draft.method).toBe('efectivo');
  });

  it('starts partial and deferred payments without inventing an amount', () => {
    expect(createPaymentDraft(159, 'partial').amount).toBe(0);
    expect(createPaymentDraft(159, 'none').amount).toBe(0);
  });
});
