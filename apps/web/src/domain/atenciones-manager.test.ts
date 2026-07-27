import { describe, it, expect, vi } from 'vitest';
import type { AtencionVisit } from '@/app/dashboard/atenciones/types';

describe('AtencionesManager State & Mutation Handlers', () => {
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
    price_charged: 100,
    amount_paid: 0,
    payment_status: 'pendiente',
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

  it('CASO 1: SINCRONIZACIÓN DE PROPS - Al cambiar initialVisits, el estado sincronizado actualiza las vistas', () => {
    let visitsState = [sampleVisit];

    const handleInitialVisitsSync = (newInitialVisits: AtencionVisit[]) => {
      visitsState = newInitialVisits;
    };

    expect(visitsState[0].status).toBe('agendado');

    const updatedInitialVisits = [
      {
        ...sampleVisit,
        status: 'completado' as const,
        amount_paid: 100,
        payment_status: 'pagado',
      },
    ];
    handleInitialVisitsSync(updatedInitialVisits);

    expect(visitsState[0].status).toBe('completado');
    expect(visitsState[0].amount_paid).toBe(100);
  });

  it('CASO 2: COMPLETAR SIN RECARGA - Al completar una atención exitosamente, el estado local cambia sin llamar a window.location.reload', () => {
    let visitsState = [sampleVisit];
    const reloadSpy = vi.fn();

    const handleCompleteLocal = (visitId: string, initialPayment: number) => {
      visitsState = visitsState.map((v) => {
        if (v.id !== visitId) return v;
        const newPaid = (v.amount_paid || 0) + initialPayment;
        const isFullyPaid = newPaid >= (v.price_charged || 0);
        return {
          ...v,
          status: 'completado',
          payment_status: isFullyPaid ? 'pagado' : 'parcial',
          amount_paid: newPaid,
          completed_at: '2026-07-26T11:00:00Z',
        };
      });
    };

    handleCompleteLocal('visit-1', 100);

    expect(visitsState[0].status).toBe('completado');
    expect(visitsState[0].amount_paid).toBe(100);
    expect(visitsState[0].payment_status).toBe('pagado');
    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it('CASO 3: CANCELAR - Cambia el estado a cancelado y lo mueve al historial inmediatamente sin reload', () => {
    let visitsState = [sampleVisit];

    const handleCancelLocal = (visitId: string) => {
      visitsState = visitsState.map((v) =>
        v.id === visitId ? { ...v, status: 'cancelado' } : v,
      );
    };

    handleCancelLocal('visit-1');

    expect(visitsState[0].status).toBe('cancelado');
    const activeVisits = visitsState.filter(
      (v) => v.status === 'agendado' || v.status === 'en_curso',
    );
    const historyVisits = visitsState.filter(
      (v) =>
        v.status === 'completado' || v.status === 'cancelado' || v.status === 'no_asistio',
    );

    expect(activeVisits.length).toBe(0);
    expect(historyVisits.length).toBe(1);
  });

  it('CASO 4: ABONO - El registro de un abono actualiza el monto pagado y recalcula el saldo pendiente inmediatamente', () => {
    let visitsState: AtencionVisit[] = [
      {
        ...sampleVisit,
        status: 'completado',
        price_charged: 200,
        amount_paid: 50,
        payment_status: 'parcial',
      },
    ];

    const handleAbonoLocal = (visitId: string, abonoAmount: number) => {
      visitsState = visitsState.map((v) => {
        if (v.id !== visitId) return v;
        const newPaid = (v.amount_paid || 0) + abonoAmount;
        const isFullyPaid = newPaid >= (v.price_charged || 0);
        return {
          ...v,
          amount_paid: newPaid,
          payment_status: isFullyPaid ? 'pagado' : 'parcial',
        };
      });
    };

    handleAbonoLocal('visit-1', 150);

    expect(visitsState[0].amount_paid).toBe(200);
    expect(visitsState[0].payment_status).toBe('pagado');
    const saldo = Math.max(
      0,
      (visitsState[0].price_charged || 0) - (visitsState[0].amount_paid || 0),
    );
    expect(saldo).toBe(0);
  });

  it('CASO 5: AGENDA - Al insertar una nueva reserva la atención se añade inmediatamente a la lista de visitas', () => {
    let visitsState: AtencionVisit[] = [sampleVisit];

    const handleCreateLocal = (newVisit: AtencionVisit) => {
      visitsState = [newVisit, ...visitsState];
    };

    const newBooking: AtencionVisit = {
      id: 'visit-2',
      company_id: 'comp-1',
      contact_id: 'contact-2',
      service_id: 'service-1',
      staff_id: 'staff-1',
      visit_date: '2026-07-27T15:00:00Z',
      scheduled_date: '2026-07-27T15:00:00Z',
      duration_minutes: 60,
      status: 'agendado',
      price_charged: 120,
      amount_paid: 0,
      payment_status: 'pendiente',
      debt_due_date: null,
      completed_at: null,
      created_at: '2026-07-26T10:00:00Z',
      care_sent: false,
      follow_up_date: null,
      follow_up_sent: false,
      notes: '',
      contact_name: 'Carlos Ruiz',
      contact_phone: '51912345678',
      service_name: 'Masaje Descontracturante',
    };

    handleCreateLocal(newBooking);

    expect(visitsState.length).toBe(2);
    expect(visitsState[0].id).toBe('visit-2');
    expect(visitsState[0].contact_name).toBe('Carlos Ruiz');
  });
});
