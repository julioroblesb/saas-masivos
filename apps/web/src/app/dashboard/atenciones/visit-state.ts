import type { AtencionVisit } from './types';

export function insertVisitInState<T extends { id: string }>(
  visits: T[],
  newVisit: T,
): T[] {
  const idx = visits.findIndex((v) => v.id === newVisit.id);
  if (idx !== -1) {
    const next = [...visits];
    next[idx] = newVisit;
    return next;
  }
  return [newVisit, ...visits];
}

export function completeVisitInState(
  visits: AtencionVisit[],
  visitId: string,
  totalPaid: number,
  paymentStatus: string,
  completedAt?: string,
  payment?: NonNullable<AtencionVisit['payments']>[number] | null,
): AtencionVisit[] {
  return visits.map((v) => {
    if (v.id !== visitId) return v;
    return {
      ...v,
      status: 'completado',
      payment_status: paymentStatus,
      amount_paid: totalPaid,
      completed_at: completedAt || new Date().toISOString(),
      payments: payment ? [payment, ...(v.payments || [])] : v.payments,
    };
  });
}

export function updateVisitStatusInState(
  visits: AtencionVisit[],
  visitId: string,
  status: AtencionVisit['status'],
): AtencionVisit[] {
  return visits.map((v) => (v.id === visitId ? { ...v, status } : v));
}

export function applyPaymentToVisitState(
  visits: AtencionVisit[],
  visitId: string,
  totalPaid: number,
  paymentStatus: string,
  payment?: NonNullable<AtencionVisit['payments']>[number] | null,
): AtencionVisit[] {
  return visits.map((v) => {
    if (v.id !== visitId) return v;
    return {
      ...v,
      amount_paid: totalPaid,
      payment_status: paymentStatus,
      payments: payment ? [payment, ...(v.payments || [])] : v.payments,
    };
  });
}

export function editVisitInState(
  visits: AtencionVisit[],
  editData: {
    id: string;
    service_id: string;
    service_name?: string;
    staff_id?: string | null;
    scheduled_date: string;
    price_charged: number;
    status: AtencionVisit['status'];
    notes?: string;
  },
): AtencionVisit[] {
  return visits.map((v) => {
    if (v.id !== editData.id) return v;
    return {
      ...v,
      service_id: editData.service_id,
      service_name: editData.service_name || v.service_name,
      staff_id: editData.staff_id || null,
      scheduled_date: editData.scheduled_date,
      visit_date: editData.scheduled_date,
      price_charged: editData.price_charged,
      status: editData.status,
      notes: editData.notes !== undefined ? editData.notes : v.notes,
    };
  });
}
