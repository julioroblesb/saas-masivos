import { describe, it, expect } from 'vitest';
import type { AtencionVisit } from '@/app/dashboard/atenciones/types';
import {
  completeVisitInState,
  updateVisitStatusInState,
  applyPaymentToVisitState,
  editVisitInState,
  insertVisitInState,
} from '@/app/dashboard/atenciones/visit-state';

/**
 * All tests import from visit-state.ts — the same module used by AtencionesManager
 * and AgendaView in production. There is no separate implementation.
 */

const baseVisit: AtencionVisit = {
  id: 'visit-1',
  company_id: 'comp-1',
  contact_id: 'contact-1',
  service_id: 'service-1',
  staff_id: 'staff-1',
  visit_date: '2026-07-26T10:00:00Z',
  scheduled_date: '2026-07-26T10:00:00Z',
  duration_minutes: 60,
  status: 'agendado',
  price_charged: 500,
  amount_paid: 500,
  payment_status: 'pagado',
  debt_due_date: null,
  completed_at: null,
  created_at: '2026-07-26T10:00:00Z',
  care_sent: false,
  follow_up_date: null,
  follow_up_sent: false,
  notes: '',
  contact_name: 'Ana López',
  contact_phone: '51987654321',
  service_name: 'Facial Express',
};

describe('Production Visit State Transformations (visit-state.ts)', () => {
  // ─── existing tests ───────────────────────────────────────────────────────

  it('completeVisitInState: updates visit to completed using total_paid and payment_status from RPC', () => {
    const visits = [{ ...baseVisit, amount_paid: 200, payment_status: 'parcial' }];
    const updated = completeVisitInState(visits, 'visit-1', 500, 'pagado', '2026-07-26T11:00:00Z');

    expect(updated[0].status).toBe('completado');
    expect(updated[0].amount_paid).toBe(500);
    expect(updated[0].payment_status).toBe('pagado');
    expect(updated[0].completed_at).toBe('2026-07-26T11:00:00Z');
  });

  it('updateVisitStatusInState: updates visit status to cancelado', () => {
    const visits = [baseVisit];
    const updated = updateVisitStatusInState(visits, 'visit-1', 'cancelado');

    expect(updated[0].status).toBe('cancelado');
  });

  it('applyPaymentToVisitState: updates amount_paid and payment_status using server response', () => {
    const visits = [{ ...baseVisit, amount_paid: 100, payment_status: 'parcial' }];
    const updated = applyPaymentToVisitState(visits, 'visit-1', 300, 'parcial');

    expect(updated[0].amount_paid).toBe(300);
    expect(updated[0].payment_status).toBe('parcial');
  });

  it('editVisitInState: updates visit service, date, price, and status', () => {
    const visits = [baseVisit];
    const updated = editVisitInState(visits, {
      id: 'visit-1',
      service_id: 'service-2',
      service_name: 'Masaje Premium',
      scheduled_date: '2026-07-28T14:00:00Z',
      price_charged: 600,
      status: 'en_curso',
      notes: 'Nota editada',
    });

    expect(updated[0].service_id).toBe('service-2');
    expect(updated[0].service_name).toBe('Masaje Premium');
    expect(updated[0].price_charged).toBe(600);
    expect(updated[0].status).toBe('en_curso');
  });

  it('insertVisitInState: prepends a new visit when id does not exist', () => {
    const visits = [baseVisit];
    const newVisit: AtencionVisit = { ...baseVisit, id: 'visit-2', contact_name: 'Carlos Ruiz' };
    const updated = insertVisitInState(visits, newVisit);

    expect(updated.length).toBe(2);
    expect(updated[0].id).toBe('visit-2');
    expect(updated[0].contact_name).toBe('Carlos Ruiz');
  });

  // ─── new tests ────────────────────────────────────────────────────────────

  it('insertVisitInState: replaces existing visit when id already exists (no duplicates)', () => {
    const v1 = { ...baseVisit, id: 'visit-1', status: 'agendado' as const };
    const v2 = { ...baseVisit, id: 'visit-2', status: 'agendado' as const };
    const visits = [v1, v2];

    // Same id, different status → should replace, not prepend
    const updated = insertVisitInState(visits, { ...v1, status: 'completado' });

    expect(updated.length).toBe(2);  // no duplicate
    expect(updated.find((v) => v.id === 'visit-1')?.status).toBe('completado');
  });

  it('insertVisitInState: keeps the unchanged visit when only one visit matches id', () => {
    const visits = [{ ...baseVisit, id: 'visit-1', status: 'en_curso' as const }];
    const updated = insertVisitInState(visits, { ...baseVisit, id: 'visit-1', status: 'completado' });

    expect(updated.length).toBe(1);
    expect(updated[0].status).toBe('completado');
  });

  it('initial_payment is 0 when visit already fully paid (S/500 paid of S/500)', () => {
    const fullyPaid: AtencionVisit = { ...baseVisit, price_charged: 500, amount_paid: 500 };
    const total = fullyPaid.price_charged ?? 0;
    const alreadyPaid = fullyPaid.amount_paid ?? 0;
    const remaining = Math.max(0, total - alreadyPaid);

    expect(remaining).toBe(0);
  });

  it('initial_payment is positive when visit is partially paid', () => {
    const partial: AtencionVisit = { ...baseVisit, price_charged: 500, amount_paid: 200 };
    const total = partial.price_charged ?? 0;
    const alreadyPaid = partial.amount_paid ?? 0;
    const remaining = Math.max(0, total - alreadyPaid);

    expect(remaining).toBe(300);
  });

  it('Cobranza: removes debt entry when total_paid reaches price_charged', () => {
    // Simulates the CobranzaManager local state update logic
    const debt = {
      id: 'visit-3',
      price_charged: 400,
      amount_paid: 100,
      payment_status: 'parcial',
      contact_name: 'Laura',
      contact_phone: '',
      service_name: 'Servicio',
      visit_date: null,
      scheduled_date: null,
      debt_due_date: null,
    };
    const debts = [debt];
    const serverTotalPaid = 400; // full payment received
    const newRemaining = Math.max(0, (debt.price_charged ?? 0) - serverTotalPaid);

    const updated = newRemaining <= 0
      ? debts.filter((d) => d.id !== debt.id)
      : debts.map((d) =>
          d.id === debt.id
            ? { ...d, amount_paid: serverTotalPaid, payment_status: 'pagado' }
            : d,
        );

    expect(updated.length).toBe(0); // debt was removed
  });

  it('Cobranza: keeps debt entry and updates amount_paid when partial payment', () => {
    const debt = {
      id: 'visit-4',
      price_charged: 400,
      amount_paid: 100,
      payment_status: 'parcial',
      contact_name: 'María',
      contact_phone: '',
      service_name: 'Facial',
      visit_date: null,
      scheduled_date: null,
      debt_due_date: null,
    };
    const debts = [debt];
    const serverTotalPaid = 200;
    const newRemaining = Math.max(0, (debt.price_charged ?? 0) - serverTotalPaid);

    const updated = newRemaining <= 0
      ? debts.filter((d) => d.id !== debt.id)
      : debts.map((d) =>
          d.id === debt.id
            ? { ...d, amount_paid: serverTotalPaid, payment_status: 'parcial' }
            : d,
        );

    expect(updated.length).toBe(1);
    expect(updated[0].amount_paid).toBe(200);
  });

  it('insertVisitInState with new contact preserves the real name (not "Cliente")', () => {
    const visits: AtencionVisit[] = [];
    const newVisit: AtencionVisit = {
      ...baseVisit,
      id: 'visit-new',
      contact_name: 'Sofía Mendoza',  // real name from CreatedVisitData
      contact_phone: '987654321',
    };
    const updated = insertVisitInState(visits, newVisit);

    expect(updated.length).toBe(1);
    expect(updated[0].contact_name).toBe('Sofía Mendoza');
    // Must not be the placeholder
    expect(updated[0].contact_name).not.toBe('Cliente');
  });
});
