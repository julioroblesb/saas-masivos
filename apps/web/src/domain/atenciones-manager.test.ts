import { describe, it, expect } from 'vitest';
import type { AtencionVisit } from '@/app/dashboard/atenciones/types';
import {
  completeVisitInState,
  updateVisitStatusInState,
  applyPaymentToVisitState,
  editVisitInState,
  insertVisitInState,
} from '@/app/dashboard/atenciones/visit-state';

describe('Production Visit State Transformations (visit-state.ts)', () => {
  const sampleVisit: AtencionVisit = {
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

  it('completeVisitInState: updates visit to completed using total_paid and payment_status from RPC', () => {
    const visits = [{ ...sampleVisit, amount_paid: 200, payment_status: 'parcial' }];
    // Server returned total_paid: 500, payment_status: 'pagado'
    const updated = completeVisitInState(visits, 'visit-1', 500, 'pagado', '2026-07-26T11:00:00Z');

    expect(updated[0].status).toBe('completado');
    expect(updated[0].amount_paid).toBe(500);
    expect(updated[0].payment_status).toBe('pagado');
    expect(updated[0].completed_at).toBe('2026-07-26T11:00:00Z');
  });

  it('updateVisitStatusInState: updates visit status to cancelado', () => {
    const visits = [sampleVisit];
    const updated = updateVisitStatusInState(visits, 'visit-1', 'cancelado');

    expect(updated[0].status).toBe('cancelado');
  });

  it('applyPaymentToVisitState: updates amount_paid and payment_status using server response', () => {
    const visits = [{ ...sampleVisit, amount_paid: 100, payment_status: 'parcial' }];
    // Server returns new total_paid: 300, payment_status: 'parcial'
    const updated = applyPaymentToVisitState(visits, 'visit-1', 300, 'parcial');

    expect(updated[0].amount_paid).toBe(300);
    expect(updated[0].payment_status).toBe('parcial');
  });

  it('editVisitInState: updates visit service, date, price, and status', () => {
    const visits = [sampleVisit];
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

  it('insertVisitInState: prepends new visit to list for instant UI feedback in Agenda and Atenciones', () => {
    const visits = [sampleVisit];
    const newVisit: AtencionVisit = {
      ...sampleVisit,
      id: 'visit-2',
      contact_name: 'Carlos Ruiz',
    };
    const updated = insertVisitInState(visits, newVisit);

    expect(updated.length).toBe(2);
    expect(updated[0].id).toBe('visit-2');
    expect(updated[0].contact_name).toBe('Carlos Ruiz');
  });
});
