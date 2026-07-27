'use client';

import React, { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  Activity,
  Phone,
  Coins,
  Edit,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import type { AtencionContact, AtencionService, AtencionStaff, AtencionVisit } from './types';
import {
  addPaymentAction,
  completeAndPayVisitAction,
  createVisitAction,
  editVisitAction,
  updateVisitStatusAction,
} from './actions';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { CustomDatePicker } from '@/components/ui/CustomDatePicker';
import {
  formatBusinessDateLabel,
  formatBusinessTime,
  formatBusinessDateTime,
} from '@/lib/business-date';
import { ClientProfileInteractiveName } from '@/components/clients/ClientProfilePopover';

const MySwal = withReactContent(Swal);

interface AtencionesManagerProps {
  services: AtencionService[];
  initialVisits: AtencionVisit[];
  contacts: AtencionContact[];
  staffList: AtencionStaff[];
  paymentMethods: string[];
  currentStartDate?: string;
  currentEndDate?: string;
}

export function AtencionesManager({
  services: propServices,
  initialVisits,
  contacts: propContacts,
  staffList,
  paymentMethods,
}: AtencionesManagerProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [prevVisits, setPrevVisits] = useState(initialVisits);
  const [visits, setVisits] = useState<AtencionVisit[]>(initialVisits);
  if (prevVisits !== initialVisits) {
    setPrevVisits(initialVisits);
    setVisits(initialVisits);
  }

  const [prevServices, setPrevServices] = useState(propServices);
  const [services, setServices] = useState<AtencionService[]>(propServices);
  if (prevServices !== propServices) {
    setPrevServices(propServices);
    setServices(propServices);
  }

  const [prevContacts, setPrevContacts] = useState(propContacts);
  const [contacts, setContacts] = useState<AtencionContact[]>(propContacts);
  if (prevContacts !== propContacts) {
    setPrevContacts(propContacts);
    setContacts(propContacts);
  }

  const [activeTab, setActiveTab] = useState<'activas' | 'proximas' | 'historial'>('activas');
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNewPatient, setShowNewPatient] = useState(false);

  // New visit form
  const [form, setForm] = useState({
    contact_id: '',
    service_id: '',
    staff_id: '',
    scheduled_date: '',
    price_charged: 0,
    notes: '',
  });

  const [newPatient, setNewPatient] = useState({
    name: '',
    phone: '',
  });

  // Past Date Confirmation Modal
  const [isPastOutcomeModalOpen, setIsPastOutcomeModalOpen] = useState(false);
  const [pastOutcome, setPastOutcome] = useState<{
    status: 'completado' | 'cancelado' | 'no_asistio';
    paymentMethod: string;
    initialPayment: number;
    isCredit: boolean;
    debtDueDate: string;
    notes: string;
  }>({
    status: 'completado',
    paymentMethod: paymentMethods[0] || 'efectivo',
    initialPayment: 0,
    isCredit: false,
    debtDueDate: '',
    notes: '',
  });

  // Complete / Pay Modal
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<AtencionVisit | null>(null);
  const [completeForm, setCompleteForm] = useState({
    payment_method: paymentMethods[0] || 'efectivo',
    is_credit: false,
    initial_payment: 0,
    debt_due_date: '',
    notes: '',
  });

  // Payment (Abono) Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentVisit, setPaymentVisit] = useState<AtencionVisit | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>(paymentMethods[0] || 'efectivo');

  // Edit Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    id: '',
    service_id: '',
    staff_id: '',
    scheduled_date: '',
    price_charged: 0,
    status: 'agendado',
    notes: '',
  });

  const handleOpenModal = () => {
    setForm({
      contact_id: contacts[0]?.id || '',
      service_id: services[0]?.id || '',
      staff_id: '',
      scheduled_date: new Date().toISOString().slice(0, 16),
      price_charged: services[0]?.price || 0,
      notes: '',
    });
    setShowNewPatient(false);
    setNewPatient({ name: '', phone: '' });
    setIsModalOpen(true);
  };

  const handleServiceChange = (serviceId: string) => {
    const s = services.find((x) => x.id === serviceId);
    setForm((prev) => ({
      ...prev,
      service_id: serviceId,
      price_charged: s ? (s.promo_price ?? s.price) : 0,
    }));
  };

  const handlePriceBlur = () => {
    const s = services.find((x) => x.id === form.service_id);
    if (s && s.promo_price && form.price_charged < s.promo_price) {
      toast.error(`El precio no puede ser menor al precio promocional (S/ ${s.promo_price})`);
      setForm((prev) => ({ ...prev, price_charged: s.promo_price as number }));
    }
  };

  // Submit NEW visit
  const handleSubmit = async () => {
    if (
      (!form.contact_id && !showNewPatient) ||
      (showNewPatient && (!newPatient.name || !newPatient.phone)) ||
      !form.service_id ||
      !form.scheduled_date
    ) {
      toast.error('Por favor completa los campos requeridos (Cliente, Servicio, Fecha).');
      return;
    }

    const selectedTime = new Date(form.scheduled_date).getTime();
    const nowTime = new Date().getTime();

    // Check if selected date is in the past (Problema 6)
    if (selectedTime < nowTime - 60000) {
      MySwal.fire({
        title: 'Fecha u Hora Pasada',
        html: `La fecha y hora seleccionadas ya pasaron.<br/><br/>¿Deseas registrar esta atención directamente en el <strong>historial</strong>?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Registrar en historial',
        cancelButtonText: 'Corregir fecha',
        customClass: { confirmButton: 'btn btn-primary', cancelButton: 'btn btn-outline-secondary' },
      }).then((result) => {
        if (result.isConfirmed) {
          setPastOutcome({
            status: 'completado',
            paymentMethod: paymentMethods[0] || 'efectivo',
            initialPayment: form.price_charged,
            isCredit: false,
            debtDueDate: '',
            notes: form.notes,
          });
          setIsPastOutcomeModalOpen(true);
        }
      });
      return;
    }

    // Normal future visit -> status: agendado / en_curso if today
    const selectedDateStr = new Date(form.scheduled_date).toISOString().split('T')[0];
    const todayStr = new Date().toISOString().split('T')[0];
    const computedStatus = selectedDateStr === todayStr ? 'en_curso' : 'agendado';

    setIsSubmitting(true);
    const res = await createVisitAction({
      contact_id: !showNewPatient ? form.contact_id : undefined,
      new_contact: showNewPatient ? newPatient : undefined,
      service_id: form.service_id,
      scheduled_date: form.scheduled_date,
      status: computedStatus,
      price_charged: form.price_charged,
      notes: form.notes,
      staff_id: form.staff_id || undefined,
    });

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success('Atención registrada exitosamente');
      setIsModalOpen(false);
      if (res.data) {
        const c = contacts.find((x) => x.id === res.data.contact_id) || {
          id: res.data.contact_id,
          name: showNewPatient ? newPatient.name : selectedContact?.name || 'Cliente',
          phone: showNewPatient ? newPatient.phone : selectedContact?.phone || '',
        };
        const s = services.find((x) => x.id === res.data.service_id);
        const newVisit: AtencionVisit = {
          ...res.data,
          contact_name: c.name,
          contact_phone: c.phone,
          service_name: s?.name || 'Servicio',
          amount_paid: 0,
          crm_marketing_contacts: c,
        };
        setVisits((prev) => [newVisit, ...prev]);
      }
      startTransition(() => {
        router.refresh();
      });
    }
    setIsSubmitting(false);
  };

  // Submit PAST Visit directly into History (Problema 6)
  const handlePastOutcomeSubmit = async () => {
    setIsSubmitting(true);

    const res = await createVisitAction({
      contact_id: !showNewPatient ? form.contact_id : undefined,
      new_contact: showNewPatient ? newPatient : undefined,
      service_id: form.service_id,
      scheduled_date: form.scheduled_date,
      status: pastOutcome.status,
      price_charged: form.price_charged,
      notes: pastOutcome.notes || form.notes,
      staff_id: form.staff_id || undefined,
    });

    if (res.error || !res.data) {
      toast.error(res.error || 'Error registrando atención en historial');
      setIsSubmitting(false);
      return;
    }

    let addedAmount = 0;
    if (pastOutcome.status === 'completado') {
      const compRes = await completeAndPayVisitAction(res.data.id, {
        payment_method: pastOutcome.paymentMethod,
        is_credit: pastOutcome.isCredit,
        initial_payment: pastOutcome.initialPayment,
        debt_due_date: pastOutcome.debtDueDate || undefined,
        notes: pastOutcome.notes,
      });
      if (compRes.error) {
        toast.error('Visita creada pero hubo error al registrar pago: ' + compRes.error);
      } else {
        addedAmount = pastOutcome.initialPayment || 0;
        toast.success('Atención histórica registrada y completada en el historial');
      }
    } else {
      toast.success('Atención registrada en el historial');
    }

    const c = contacts.find((x) => x.id === res.data.contact_id) || {
      id: res.data.contact_id,
      name: showNewPatient ? newPatient.name : selectedContact?.name || 'Cliente',
      phone: showNewPatient ? newPatient.phone : selectedContact?.phone || '',
    };
    const s = services.find((x) => x.id === res.data.service_id);
    const newVisit: AtencionVisit = {
      ...res.data,
      status: pastOutcome.status as AtencionVisit['status'],
      contact_name: c.name,
      contact_phone: c.phone,
      service_name: s?.name || 'Servicio',
      amount_paid: addedAmount,
      completed_at: pastOutcome.status === 'completado' ? new Date().toISOString() : undefined,
      crm_marketing_contacts: c,
    };
    setVisits((prev) => [newVisit, ...prev]);

    setIsPastOutcomeModalOpen(false);
    setIsModalOpen(false);
    startTransition(() => {
      router.refresh();
    });
    setIsSubmitting(false);
  };

  // Update Status (Complete / Cancel / No Asistio)
  const handleUpdateStatus = async (
    visitId: string,
    status: 'completado' | 'cancelado' | 'no_asistio',
  ) => {
    if (status === 'completado') {
      const v = visits.find((x) => x.id === visitId);
      if (v) {
        setSelectedVisit(v);
        setCompleteForm({
          payment_method: paymentMethods[0] || 'efectivo',
          is_credit: false,
          initial_payment: v.price_charged || 0,
          debt_due_date: '',
          notes: v.notes || '',
        });
        setIsCompleteModalOpen(true);
      }
      return;
    }

    setIsSubmitting(true);
    const res = await updateVisitStatusAction(visitId, status);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success('Estado actualizado correctamente');
      setVisits((prev) =>
        prev.map((v) => (v.id === visitId ? { ...v, status } : v)),
      );
      startTransition(() => {
        router.refresh();
      });
    }
    setIsSubmitting(false);
  };

  // Submit Completion & Payment
  const handleCompleteSubmit = async () => {
    if (!selectedVisit) return;
    setIsSubmitting(true);

    const res = await completeAndPayVisitAction(selectedVisit.id, completeForm);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success('Atención completada y pago registrado');
      setIsCompleteModalOpen(false);
      setVisits((prev) =>
        prev.map((v) => {
          if (v.id !== selectedVisit.id) return v;
          const addedPayment = completeForm.initial_payment || 0;
          const newAmountPaid = (v.amount_paid || 0) + addedPayment;
          const isFullyPaid = newAmountPaid >= (v.price_charged || 0);
          return {
            ...v,
            status: 'completado',
            payment_status: isFullyPaid ? 'pagado' : 'parcial',
            amount_paid: newAmountPaid,
            debt_due_date: completeForm.debt_due_date || v.debt_due_date,
            completed_at: new Date().toISOString(),
          };
        }),
      );
      setSelectedVisit(null);
      startTransition(() => {
        router.refresh();
      });
    }
    setIsSubmitting(false);
  };

  // Submit Payment Abono (Problema 4)
  const handleAddPaymentSubmit = async () => {
    if (!paymentVisit || paymentAmount <= 0) {
      toast.error('Ingresa un monto válido para el abono.');
      return;
    }

    setIsSubmitting(true);
    const res = await addPaymentAction(paymentVisit.id, paymentAmount, paymentMethod);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success('Abono registrado exitosamente');
      setIsPaymentModalOpen(false);
      setVisits((prev) =>
        prev.map((v) => {
          if (v.id !== paymentVisit.id) return v;
          const newAmountPaid = (v.amount_paid || 0) + paymentAmount;
          const isFullyPaid = newAmountPaid >= (v.price_charged || 0);
          return {
            ...v,
            amount_paid: newAmountPaid,
            payment_status: isFullyPaid ? 'pagado' : 'parcial',
          };
        }),
      );
      setPaymentVisit(null);
      startTransition(() => {
        router.refresh();
      });
    }
    setIsSubmitting(false);
  };

  // Edit Visit Click
  const handleEditClick = (v: AtencionVisit) => {
    setEditForm({
      id: v.id,
      service_id: v.service_id || '',
      staff_id: v.staff_id || '',
      scheduled_date: v.scheduled_date
        ? new Date(v.scheduled_date).toISOString().slice(0, 16)
        : '',
      price_charged: v.price_charged || 0,
      status: v.status,
      notes: v.notes || '',
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!editForm.id || !editForm.service_id || !editForm.scheduled_date) {
      toast.error('Completa los campos requeridos');
      return;
    }

    setIsSubmitting(true);
    const res = await editVisitAction(editForm.id, {
      service_id: editForm.service_id,
      staff_id: editForm.staff_id || undefined,
      scheduled_date: editForm.scheduled_date,
      price_charged: editForm.price_charged,
      status: editForm.status,
      notes: editForm.notes,
    });

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success('Atención actualizada exitosamente');
      setIsEditModalOpen(false);
      setVisits((prev) =>
        prev.map((v) => {
          if (v.id !== editForm.id) return v;
          const s = services.find((x) => x.id === editForm.service_id);
          return {
            ...v,
            service_id: editForm.service_id,
            service_name: s?.name || v.service_name,
            staff_id: editForm.staff_id || null,
            scheduled_date: editForm.scheduled_date,
            visit_date: editForm.scheduled_date,
            price_charged: editForm.price_charged,
            status: editForm.status as AtencionVisit['status'],
            notes: editForm.notes,
          };
        }),
      );
      startTransition(() => {
        router.refresh();
      });
    }
    setIsSubmitting(false);
  };

  // Filtered visits
  const filteredVisits = useMemo(() => {
    if (!search) return visits;
    return visits.filter(
      (v) =>
        v.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
        v.service_name?.toLowerCase().includes(search.toLowerCase()) ||
        v.contact_phone?.includes(search),
    );
  }, [search, visits]);

  const groupedVisits = filteredVisits
    .filter((v) => v.status === 'en_curso')
    .reduce<Record<string, AtencionVisit[]>>((acc, visit) => {
      const dateLabel = formatBusinessDateLabel(visit.visit_date || visit.scheduled_date);
      if (!acc[dateLabel]) acc[dateLabel] = [];
      acc[dateLabel].push(visit);
      return acc;
    }, {});

  const groupedFutureVisits = filteredVisits
    .filter((v) => v.status === 'agendado')
    .reduce<Record<string, AtencionVisit[]>>((acc, visit) => {
      const dateLabel = formatBusinessDateLabel(visit.visit_date || visit.scheduled_date);
      if (!acc[dateLabel]) acc[dateLabel] = [];
      acc[dateLabel].push(visit);
      return acc;
    }, {});

  const historyVisits = filteredVisits.filter(
    (v) => v.status === 'completado' || v.status === 'cancelado' || v.status === 'no_asistio',
  );

  const totalPages = Math.ceil(historyVisits.length / pageSize) || 1;
  const paginatedHistory = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return historyVisits.slice(start, start + pageSize);
  }, [historyVisits, currentPage, pageSize]);

  const selectedContact = contacts.find((c) => c.id === form.contact_id);
  const selectedService = services.find((s) => s.id === form.service_id);
  const selectedEditService = services.find((s) => s.id === editForm.service_id);

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="rounded-3xl bg-primary text-white border border-primary shadow-sm p-6 relative overflow-hidden group">
          <div className="flex justify-between items-start relative z-10">
            <div className="flex flex-col space-y-1">
              <p className="text-white/80 text-xs font-semibold uppercase tracking-widest">
                Total Atenciones
              </p>
              <h2 className="text-4xl font-bold tracking-tight mt-2">{visits.length}</h2>
            </div>
            <div className="p-3 bg-white/20 rounded-xl">
              <Activity className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-white dark:bg-dark border border-black-light dark:border-dark-light shadow-sm p-6 group">
          <div className="flex justify-between items-start">
            <div className="flex flex-col space-y-1">
              <p className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-widest">
                En Curso
              </p>
              <h2 className="text-4xl font-bold tracking-tight text-black dark:text-white mt-2">
                {visits.filter((v) => v.status === 'en_curso').length}
              </h2>
            </div>
            <div className="p-3 bg-white-light dark:bg-zinc-900 rounded-xl">
              <Clock className="w-6 h-6 text-amber-500" />
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-white dark:bg-dark border border-black-light dark:border-dark-light shadow-sm p-6 group">
          <div className="flex justify-between items-start">
            <div className="flex flex-col space-y-1">
              <p className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-widest">
                Próximas Citas
              </p>
              <h2 className="text-4xl font-bold tracking-tight text-black dark:text-white mt-2">
                {visits.filter((v) => v.status === 'agendado').length}
              </h2>
            </div>
            <div className="p-3 bg-white-light dark:bg-zinc-900 rounded-xl">
              <CalendarIcon className="w-6 h-6 text-blue-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar & Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white dark:bg-dark p-4 rounded-3xl border border-black-light dark:border-dark-light">
        <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-900 p-1.5 rounded-2xl w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('activas')}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all min-h-[44px] flex items-center justify-center flex-1 sm:flex-initial ${
              activeTab === 'activas'
                ? 'bg-white dark:bg-dark text-primary shadow-sm'
                : 'text-zinc-500 hover:text-black dark:hover:text-white'
            }`}
          >
            Atenciones Activas
          </button>
          <button
            onClick={() => setActiveTab('proximas')}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all min-h-[44px] flex items-center justify-center flex-1 sm:flex-initial ${
              activeTab === 'proximas'
                ? 'bg-white dark:bg-dark text-primary shadow-sm'
                : 'text-zinc-500 hover:text-black dark:hover:text-white'
            }`}
          >
            Próximas ({visits.filter((v) => v.status === 'agendado').length})
          </button>
          <button
            onClick={() => setActiveTab('historial')}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all min-h-[44px] flex items-center justify-center flex-1 sm:flex-initial ${
              activeTab === 'historial'
                ? 'bg-white dark:bg-dark text-primary shadow-sm'
                : 'text-zinc-500 hover:text-black dark:hover:text-white'
            }`}
          >
            Historial ({historyVisits.length})
          </button>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar por cliente o servicio..."
              className="form-input pl-10 rounded-xl border-black-light dark:border-dark-light text-sm w-full bg-zinc-50 dark:bg-zinc-900"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={handleOpenModal}
            className="btn btn-primary rounded-xl px-5 gap-2 font-bold min-h-[44px] flex items-center justify-center shrink-0"
          >
            <Plus className="w-4 h-4" /> Nueva Atención
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'activas' ? (
        Object.keys(groupedVisits).length === 0 ? (
          <div className="p-12 text-center text-zinc-500 bg-white dark:bg-dark border border-black-light dark:border-dark-light rounded-3xl">
            No hay atenciones en curso en este momento.
          </div>
        ) : (
          <div className="space-y-8">
            {Object.keys(groupedVisits).map((date) => (
              <div key={date}>
                <h3 className="text-lg font-bold text-black dark:text-white mb-4 capitalize">
                  {date}
                </h3>
                <div className="flex flex-col gap-3">
                  {groupedVisits[date].map((visit) => {
                    const price = visit.price_charged || 0;
                    const paid = visit.amount_paid || 0;
                    const pending = Math.max(0, price - paid);
                    return (
                      <div
                        key={visit.id}
                        className="bg-white dark:bg-dark border border-black-light dark:border-dark-light rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-primary/40 shadow-sm"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-900 rounded-2xl w-16 h-16 shrink-0 border border-black-light/50 dark:border-dark-light">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase">
                              Hora
                            </span>
                            <span className="text-lg font-extrabold text-black dark:text-white">
                              {formatBusinessTime(visit.visit_date || visit.scheduled_date)}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-0.5">
                              <ClientProfileInteractiveName
                                client={visit.crm_marketing_contacts}
                                pendingBalance={pending}
                              />
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                En Curso
                              </span>
                            </div>
                            <div className="text-sm font-semibold text-primary">
                              {visit.service_name}
                            </div>
                            <div className="flex items-center text-xs text-zinc-500 gap-3 mt-1 font-medium">
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" /> +{visit.contact_phone}
                              </span>
                              {visit.staff_id && staffList && (
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3" />{' '}
                                  {staffList.find((s) => s.id === visit.staff_id)?.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6 justify-between border-t md:border-t-0 pt-3 md:pt-0 border-black-light/30">
                          <div className="text-left md:text-right">
                            <span className="text-base font-extrabold text-black dark:text-white block">
                              S/ {price}
                            </span>
                            <span className="text-xs text-zinc-500 font-medium">
                              Pagado: S/ {paid}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              onClick={() => handleUpdateStatus(visit.id, 'completado')}
                              className="btn btn-sm btn-primary rounded-xl px-4 font-bold min-h-[44px] flex items-center gap-1"
                            >
                              <CheckCircle className="w-4 h-4" /> Finalizar Cita
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(visit.id, 'cancelado')}
                              className="btn btn-sm btn-outline-danger rounded-xl px-3 min-h-[44px] flex items-center"
                              title="Cancelar Cita"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )
      ) : activeTab === 'proximas' ? (
        Object.keys(groupedFutureVisits).length === 0 ? (
          <div className="p-12 text-center text-zinc-500 bg-white dark:bg-dark border border-black-light dark:border-dark-light rounded-3xl">
            No se encontraron citas futuras.
          </div>
        ) : (
          <div className="space-y-8">
            {Object.keys(groupedFutureVisits).map((date) => (
              <div key={date}>
                <h3 className="text-lg font-bold text-black dark:text-white mb-4 capitalize">
                  {date}
                </h3>
                <div className="flex flex-col gap-3">
                  {groupedFutureVisits[date].map((visit) => {
                    const price = visit.price_charged || 0;
                    const paid = visit.amount_paid || 0;
                    const pending = Math.max(0, price - paid);
                    return (
                      <div
                        key={visit.id}
                        className="bg-white dark:bg-dark border border-black-light dark:border-dark-light rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-primary/40 shadow-sm"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-900 rounded-2xl w-16 h-16 shrink-0 border border-black-light/50 dark:border-dark-light">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase">
                              Hora
                            </span>
                            <span className="text-lg font-extrabold text-black dark:text-white">
                              {formatBusinessTime(visit.visit_date || visit.scheduled_date)}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-0.5">
                              <ClientProfileInteractiveName
                                client={visit.crm_marketing_contacts}
                                pendingBalance={pending}
                              />
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                Agendada
                              </span>
                            </div>
                            <div className="text-sm font-semibold text-primary">
                              {visit.service_name}
                            </div>
                            <div className="flex items-center text-xs text-zinc-500 gap-3 mt-1 font-medium">
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" /> +{visit.contact_phone}
                              </span>
                              {visit.staff_id && staffList && (
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3" />{' '}
                                  {staffList.find((s) => s.id === visit.staff_id)?.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6 justify-between border-t md:border-t-0 pt-3 md:pt-0 border-black-light/30">
                          <div className="text-left md:text-right">
                            <span className="text-base font-extrabold text-black dark:text-white block">
                              S/ {price}
                            </span>
                            <span className="text-xs text-zinc-500 font-medium">
                              Cobrado: S/ {paid}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              onClick={() => handleUpdateStatus(visit.id, 'completado')}
                              className="btn btn-sm btn-primary rounded-xl px-4 font-bold min-h-[44px] flex items-center gap-1"
                            >
                              <CheckCircle className="w-4 h-4" /> Atender
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(visit.id, 'cancelado')}
                              className="btn btn-sm btn-outline-danger rounded-xl px-3 min-h-[44px] flex items-center"
                              title="Cancelar Cita"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* HISTORIAL TAB */
        <div className="bg-white dark:bg-dark border border-black-light dark:border-dark-light rounded-3xl p-4 sm:p-6 shadow-sm">
          {historyVisits.length === 0 ? (
            <div className="p-12 text-center text-zinc-500">
              No hay atenciones registradas en el historial.
            </div>
          ) : (
            <>
              {/* Desktop Table View (>= md) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[850px]">
                  <thead>
                    <tr className="border-b border-black-light dark:border-dark-light bg-zinc-50 dark:bg-zinc-900/50 text-xs font-bold uppercase tracking-wider text-zinc-400">
                      <th className="p-4">Fecha</th>
                      <th className="p-4">Cliente</th>
                      <th className="p-4">Servicio</th>
                      <th className="p-4">Especialista</th>
                      <th className="p-4">Pagos & Saldo</th>
                      <th className="p-4">Estado</th>
                      <th className="p-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black-light/40 dark:divide-dark-light">
                    {paginatedHistory.map((visit) => {
                      const total = visit.price_charged || 0;
                      const pagado = visit.amount_paid || 0;
                      const saldo = Math.max(0, total - pagado);
                      const isCompletado = visit.status === 'completado';

                      return (
                        <tr
                          key={visit.id}
                          className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors text-sm"
                        >
                          <td className="p-4 font-semibold text-black dark:text-white">
                            {formatBusinessDateTime(visit.visit_date || visit.scheduled_date)}
                          </td>

                          <td className="p-4">
                            <ClientProfileInteractiveName
                              client={visit.crm_marketing_contacts}
                              pendingBalance={saldo}
                            />
                            <div className="text-xs text-zinc-500 font-medium mt-0.5">
                              +{visit.contact_phone}
                            </div>
                          </td>

                          <td className="p-4 font-medium text-black dark:text-white">
                            {visit.service_name}
                            {visit.notes && (
                              <div className="text-xs text-zinc-400 truncate max-w-[150px] mt-0.5" title={visit.notes}>
                                {visit.notes}
                              </div>
                            )}
                          </td>

                          <td className="p-4 text-zinc-500 font-medium">
                            {visit.staff_id && staffList
                              ? staffList.find((s) => s.id === visit.staff_id)?.name || '-'
                              : '-'}
                          </td>

                          {/* Problema 4: Total, Pagado, Saldo breakdown */}
                          <td className="p-4">
                            <div className="text-xs space-y-0.5">
                              <div className="font-bold text-black dark:text-white">
                                Total: S/ {total}
                              </div>
                              <div className="text-zinc-500 font-medium">
                                Pagado: S/ {pagado}
                              </div>
                              {saldo <= 0 ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                  Pagado
                                </span>
                              ) : (
                                <div className="font-bold text-danger">
                                  Saldo: S/ {saldo}
                                </div>
                              )}
                            </div>
                          </td>

                          <td className="p-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                                visit.status === 'completado'
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  : visit.status === 'cancelado'
                                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                    : 'bg-zinc-500/10 text-zinc-500'
                              }`}
                            >
                              {visit.status.replace('_', ' ')}
                            </span>
                          </td>

                          {/* Problema 5: Remove Cancel button for completed/cancelled/no_asistio */}
                          <td className="p-4 text-right">
                            <div className="flex justify-end gap-2 items-center">
                              {isCompletado && saldo > 0 && (
                                <button
                                  onClick={() => {
                                    setPaymentVisit(visit);
                                    setPaymentAmount(saldo);
                                    setIsPaymentModalOpen(true);
                                  }}
                                  className="btn btn-sm btn-primary rounded-xl px-3 text-xs font-bold min-h-[44px] flex items-center gap-1 shadow-sm"
                                >
                                  <Coins className="w-3.5 h-3.5" /> Registrar Abono
                                </button>
                              )}
                              <button
                                onClick={() => handleEditClick(visit)}
                                className="p-2 text-zinc-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                                title="Editar"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards View for Historial (< md) (Problema 8) */}
              <div className="block md:hidden space-y-4">
                {paginatedHistory.map((visit) => {
                  const total = visit.price_charged || 0;
                  const pagado = visit.amount_paid || 0;
                  const saldo = Math.max(0, total - pagado);
                  const isCompletado = visit.status === 'completado';

                  return (
                    <div
                      key={visit.id}
                      className="bg-white dark:bg-dark border border-black-light/50 dark:border-dark-light rounded-2xl p-4 flex flex-col gap-3 shadow-sm"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-xs text-zinc-400 font-semibold mb-1">
                            {formatBusinessDateTime(visit.visit_date || visit.scheduled_date)}
                          </div>
                          <ClientProfileInteractiveName
                            client={visit.crm_marketing_contacts}
                            pendingBalance={saldo}
                          />
                        </div>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            visit.status === 'completado'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : visit.status === 'cancelado'
                                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                : 'bg-zinc-500/10 text-zinc-500'
                          }`}
                        >
                          {visit.status.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-black-light/30 dark:border-dark-light">
                        <div>
                          <span className="text-zinc-400 block text-[10px] uppercase font-semibold">
                            Servicio
                          </span>
                          <span className="font-semibold text-black dark:text-white">
                            {visit.service_name}
                          </span>
                        </div>
                        <div>
                          <span className="text-zinc-400 block text-[10px] uppercase font-semibold">
                            Especialista
                          </span>
                          <span className="font-semibold text-black dark:text-white">
                            {visit.staff_id && staffList
                              ? staffList.find((s) => s.id === visit.staff_id)?.name || '-'
                              : '-'}
                          </span>
                        </div>
                        <div>
                          <span className="text-zinc-400 block text-[10px] uppercase font-semibold">
                            Total / Pagado
                          </span>
                          <span className="font-semibold text-black dark:text-white">
                            S/ {total} / S/ {pagado}
                          </span>
                        </div>
                        <div>
                          <span className="text-zinc-400 block text-[10px] uppercase font-semibold">
                            Saldo
                          </span>
                          {saldo <= 0 ? (
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              Pagado
                            </span>
                          ) : (
                            <span className="font-bold text-danger">S/ {saldo}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2 border-t border-black-light/30 dark:border-dark-light">
                        {isCompletado && saldo > 0 && (
                          <button
                            onClick={() => {
                              setPaymentVisit(visit);
                              setPaymentAmount(saldo);
                              setIsPaymentModalOpen(true);
                            }}
                            className="btn btn-sm btn-primary rounded-xl px-4 text-xs font-bold min-h-[44px] flex items-center gap-1 shadow-sm"
                          >
                            <Coins className="w-3.5 h-3.5" /> Registrar Abono
                          </button>
                        )}
                        <button
                          onClick={() => handleEditClick(visit)}
                          className="btn btn-sm btn-outline-secondary rounded-xl px-3 min-h-[44px] flex items-center"
                        >
                          <Edit className="w-4 h-4" /> Editar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Pagination Footer */}
          {historyVisits.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-black-light dark:border-dark-light bg-zinc-50 dark:bg-zinc-900/50 gap-4 mt-4 rounded-2xl">
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">Mostrar</span>
                <select
                  className="form-select text-xs rounded-lg border-black-light dark:border-dark-light bg-white dark:bg-dark py-1 pl-2 pr-8"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                >
                  <option value={10}>10 por página</option>
                  <option value={25}>25 por página</option>
                  <option value={50}>50 por página</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  className="btn btn-sm btn-outline-secondary rounded-lg px-3 py-1 text-xs"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Anterior
                </button>
                <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                  Página {currentPage} de {totalPages}
                </span>
                <button
                  className="btn btn-sm btn-outline-secondary rounded-lg px-3 py-1 text-xs"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal - Nueva Atención */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center p-4 py-4 sm:py-6 bg-black/40 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-300"
          onKeyDown={(e) => {
            if (e.key === 'Escape') setIsModalOpen(false);
          }}
        >
          <div className="bg-white dark:bg-dark border border-black-light dark:border-dark-light rounded-3xl w-full max-w-xl max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-black-light dark:border-dark-light shrink-0">
              <h3 className="text-xl font-bold tracking-tight text-black dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" /> Registrar Nueva Atención
              </h3>
              <button
                type="button"
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-white transition-colors bg-zinc-100 dark:bg-zinc-800 p-2 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center"
                onClick={() => setIsModalOpen(false)}
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 min-h-0 overflow-y-auto">
              {/* Toggle Cliente Existente vs Nuevo */}
              <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl">
                <button
                  type="button"
                  onClick={() => setShowNewPatient(false)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all min-h-[44px] ${
                    !showNewPatient
                      ? 'bg-white dark:bg-dark text-primary shadow-sm'
                      : 'text-zinc-500'
                  }`}
                >
                  Cliente Existente
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewPatient(true)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all min-h-[44px] ${
                    showNewPatient
                      ? 'bg-white dark:bg-dark text-primary shadow-sm'
                      : 'text-zinc-500'
                  }`}
                >
                  Nuevo Cliente
                </button>
              </div>

              {!showNewPatient ? (
                <div>
                  <label className="text-xs font-bold uppercase text-zinc-400 block mb-1">
                    Seleccionar Cliente *
                  </label>
                  <CustomSelect
                    options={contacts
                      .filter((c): c is AtencionContact & { id: string } => Boolean(c.id))
                      .map((c) => ({
                        value: c.id,
                        label: `${c.name || 'Sin nombre'} (+${c.phone || ''})`,
                      }))}
                    value={
                      selectedContact && selectedContact.id
                        ? {
                            value: selectedContact.id,
                            label: `${selectedContact.name || 'Sin nombre'} (+${selectedContact.phone || ''})`,
                          }
                        : null
                    }
                    onChange={(sel) => setForm((prev) => ({ ...prev, contact_id: sel?.value || '' }))}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold uppercase text-zinc-400 block mb-1">
                      Nombre *
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: María Pérez"
                      className="form-input rounded-xl border-black-light dark:border-dark-light text-sm"
                      value={newPatient.name}
                      onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase text-zinc-400 block mb-1">
                      Teléfono *
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: 51987654321"
                      className="form-input rounded-xl border-black-light dark:border-dark-light text-sm"
                      value={newPatient.phone}
                      onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase text-zinc-400 block mb-1">
                    Servicio *
                  </label>
                  <CustomSelect
                    options={services.map((s) => ({
                      value: s.id,
                      label: `${s.name} - S/ ${s.price}`,
                    }))}
                    value={
                      selectedService
                        ? {
                            value: selectedService.id,
                            label: `${selectedService.name} - S/ ${selectedService.price}`,
                          }
                        : null
                    }
                    onChange={(sel) => handleServiceChange(sel?.value || '')}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-zinc-400 block mb-1">
                    Especialista
                  </label>
                  <CustomSelect
                    options={[
                      { value: '', label: 'Sin asignar' },
                      ...staffList.map((st) => ({ value: st.id, label: st.name })),
                    ]}
                    value={
                      form.staff_id
                        ? {
                            value: form.staff_id,
                            label: staffList.find((s) => s.id === form.staff_id)?.name || 'Sin asignar',
                          }
                        : { value: '', label: 'Sin asignar' }
                    }
                    onChange={(sel) => setForm((prev) => ({ ...prev, staff_id: sel?.value || '' }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase text-zinc-400 block mb-1">
                    Fecha y Hora *
                  </label>
                  <CustomDatePicker
                    value={form.scheduled_date}
                    onChangeDate={(dateStr) => setForm((prev) => ({ ...prev, scheduled_date: dateStr }))}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-zinc-400 block mb-1">
                    Precio Cobrado (S/)
                  </label>
                  <input
                    type="number"
                    min={0}
                    className="form-input rounded-xl border-black-light dark:border-dark-light text-sm"
                    value={form.price_charged}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, price_charged: Number(e.target.value) }))
                    }
                    onBlur={handlePriceBlur}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-zinc-400 block mb-1">
                  Notas de la atención
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalles o requerimientos especiales..."
                  className="form-textarea rounded-xl border-black-light dark:border-dark-light text-sm w-full"
                  value={form.notes}
                  onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                />
              </div>
            </div>

            <div className="p-4 bg-zinc-50 dark:bg-zinc-900 border-t border-black-light dark:border-dark-light flex justify-end gap-3 shrink-0">
              <button
                type="button"
                className="btn btn-outline-danger rounded-xl px-6 min-h-[44px]"
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary rounded-xl px-8 min-h-[44px]"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Guardando...' : 'Guardar Cita'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal - Confirmación de Registro Histórico para Fecha Pasada (Problema 6) */}
      {isPastOutcomeModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-dark border border-black-light dark:border-dark-light rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-black-light dark:border-dark-light pb-4">
              <h3 className="text-lg font-bold text-black dark:text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" /> Registrar en Historial
              </h3>
              <button
                onClick={() => setIsPastOutcomeModalOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              Como la fecha seleccionada ya pasó, define el resultado final para guardarla directamente en el <strong>historial</strong>:
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase text-zinc-400 block mb-1">
                  Resultado de la Atención
                </label>
                <select
                  className="form-select rounded-xl border-black-light dark:border-dark-light text-sm w-full bg-white dark:bg-dark"
                  value={pastOutcome.status}
                  onChange={(e) =>
                    setPastOutcome((prev) => ({
                      ...prev,
                      status: e.target.value as 'completado' | 'cancelado' | 'no_asistio',
                    }))
                  }
                >
                  <option value="completado">Completada</option>
                  <option value="cancelado">Cancelada</option>
                  <option value="no_asistio">No Asistió</option>
                </select>
              </div>

              {pastOutcome.status === 'completado' && (
                <div className="space-y-3 p-4 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-black-light/40 dark:border-dark-light">
                  <div>
                    <label className="text-xs font-bold uppercase text-zinc-400 block mb-1">
                      Método de Pago
                    </label>
                    <select
                      className="form-select rounded-xl border-black-light dark:border-dark-light text-sm w-full bg-white dark:bg-dark capitalize"
                      value={pastOutcome.paymentMethod}
                      onChange={(e) =>
                        setPastOutcome((prev) => ({ ...prev, paymentMethod: e.target.value }))
                      }
                    >
                      {paymentMethods.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase text-zinc-400 block mb-1">
                      Monto Pagado Inicial (S/)
                    </label>
                    <input
                      type="number"
                      min={0}
                      className="form-input rounded-xl border-black-light dark:border-dark-light text-sm w-full"
                      value={pastOutcome.initialPayment}
                      onChange={(e) =>
                        setPastOutcome((prev) => ({
                          ...prev,
                          initialPayment: Number(e.target.value),
                        }))
                      }
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="pastIsCredit"
                      className="form-checkbox rounded text-primary"
                      checked={pastOutcome.isCredit}
                      onChange={(e) =>
                        setPastOutcome((prev) => ({ ...prev, isCredit: e.target.checked }))
                      }
                    />
                    <label htmlFor="pastIsCredit" className="text-xs font-bold text-black dark:text-white cursor-pointer">
                      ¿Quedó saldo pendiente / a crédito?
                    </label>
                  </div>

                  {pastOutcome.isCredit && (
                    <div>
                      <label className="text-xs font-bold uppercase text-zinc-400 block mb-1">
                        Fecha Máxima de Pago
                      </label>
                      <input
                        type="date"
                        className="form-input rounded-xl border-black-light dark:border-dark-light text-sm w-full bg-white dark:bg-dark"
                        value={pastOutcome.debtDueDate}
                        onChange={(e) =>
                          setPastOutcome((prev) => ({ ...prev, debtDueDate: e.target.value }))
                        }
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-black-light dark:border-dark-light">
              <button
                type="button"
                className="btn btn-outline-danger rounded-xl px-4 min-h-[44px]"
                onClick={() => setIsPastOutcomeModalOpen(false)}
              >
                Corregir Fecha
              </button>
              <button
                type="button"
                className="btn btn-primary rounded-xl px-6 min-h-[44px]"
                onClick={handlePastOutcomeSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Guardando...' : 'Guardar en Historial'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal - Registrar Abono (Problema 4) */}
      {isPaymentModalOpen && paymentVisit && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-dark border border-black-light dark:border-dark-light rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-black-light dark:border-dark-light pb-3">
              <h3 className="text-lg font-bold text-black dark:text-white flex items-center gap-2">
                <Coins className="w-5 h-5 text-emerald-500" /> Registrar Abono de Pago
              </h3>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-zinc-500 space-y-1">
              <div>
                Cliente: <strong className="text-black dark:text-white">{paymentVisit.contact_name}</strong>
              </div>
              <div>
                Servicio: <strong className="text-black dark:text-white">{paymentVisit.service_name}</strong>
              </div>
              <div>
                Saldo Deuda Actual: <strong className="text-danger font-bold">S/ {Math.max(0, (paymentVisit.price_charged || 0) - (paymentVisit.amount_paid || 0))}</strong>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <label className="text-xs font-bold uppercase text-zinc-400 block mb-1">
                  Monto del Abono (S/) *
                </label>
                <input
                  type="number"
                  min={1}
                  max={Math.max(0, (paymentVisit.price_charged || 0) - (paymentVisit.amount_paid || 0))}
                  className="form-input rounded-xl border-black-light dark:border-dark-light text-sm w-full font-bold"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-zinc-400 block mb-1">
                  Método de Pago *
                </label>
                <select
                  className="form-select rounded-xl border-black-light dark:border-dark-light text-sm w-full capitalize"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  {paymentMethods.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-black-light dark:border-dark-light">
              <button
                type="button"
                className="btn btn-outline-secondary rounded-xl px-4 min-h-[44px]"
                onClick={() => setIsPaymentModalOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary rounded-xl px-6 min-h-[44px]"
                onClick={handleAddPaymentSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Guardando...' : 'Confirmar Abono'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal - Finalizar y Cobrar Atención */}
      {isCompleteModalOpen && selectedVisit && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-dark border border-black-light dark:border-dark-light rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-black-light dark:border-dark-light pb-3">
              <h3 className="text-lg font-bold text-black dark:text-white flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-500" /> Finalizar y Cobrar Atención
              </h3>
              <button
                onClick={() => setIsCompleteModalOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-zinc-500 space-y-1">
              <div>
                Cliente: <strong className="text-black dark:text-white">{selectedVisit.contact_name}</strong>
              </div>
              <div>
                Servicio: <strong className="text-black dark:text-white">{selectedVisit.service_name}</strong>
              </div>
              <div>
                Precio Total: <strong className="text-primary font-bold">S/ {selectedVisit.price_charged}</strong>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <label className="text-xs font-bold uppercase text-zinc-400 block mb-1">
                  Método de Pago
                </label>
                <select
                  className="form-select rounded-xl border-black-light dark:border-dark-light text-sm w-full capitalize"
                  value={completeForm.payment_method}
                  onChange={(e) =>
                    setCompleteForm((prev) => ({ ...prev, payment_method: e.target.value }))
                  }
                >
                  {paymentMethods.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-zinc-400 block mb-1">
                  Monto Recibido Hoy (S/)
                </label>
                <input
                  type="number"
                  min={0}
                  className="form-input rounded-xl border-black-light dark:border-dark-light text-sm w-full"
                  value={completeForm.initial_payment}
                  onChange={(e) =>
                    setCompleteForm((prev) => ({
                      ...prev,
                      initial_payment: Number(e.target.value),
                    }))
                  }
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isCredit"
                  className="form-checkbox rounded text-primary"
                  checked={completeForm.is_credit}
                  onChange={(e) =>
                    setCompleteForm((prev) => ({ ...prev, is_credit: e.target.checked }))
                  }
                />
                <label htmlFor="isCredit" className="text-xs font-bold text-black dark:text-white cursor-pointer">
                  ¿Queda un saldo a crédito?
                </label>
              </div>

              {completeForm.is_credit && (
                <div>
                  <label className="text-xs font-bold uppercase text-zinc-400 block mb-1">
                    Fecha Límite de Pago
                  </label>
                  <input
                    type="date"
                    className="form-input rounded-xl border-black-light dark:border-dark-light text-sm w-full bg-white dark:bg-dark"
                    value={completeForm.debt_due_date}
                    onChange={(e) =>
                      setCompleteForm((prev) => ({ ...prev, debt_due_date: e.target.value }))
                    }
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-bold uppercase text-zinc-400 block mb-1">
                  Notas Finales
                </label>
                <textarea
                  rows={2}
                  className="form-textarea rounded-xl border-black-light dark:border-dark-light text-sm w-full"
                  value={completeForm.notes}
                  onChange={(e) =>
                    setCompleteForm((prev) => ({ ...prev, notes: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-black-light dark:border-dark-light">
              <button
                type="button"
                className="btn btn-outline-secondary rounded-xl px-4 min-h-[44px]"
                onClick={() => setIsCompleteModalOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary rounded-xl px-6 min-h-[44px]"
                onClick={handleCompleteSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Guardando...' : 'Finalizar Atención'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal - Editar Atención (Problema 5: Restricción de Estado) */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-dark border border-black-light dark:border-dark-light rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-black-light dark:border-dark-light pb-3">
              <h3 className="text-lg font-bold text-black dark:text-white flex items-center gap-2">
                <Edit className="w-5 h-5 text-primary" /> Editar Atención
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold uppercase text-zinc-400 block mb-1">
                  Servicio
                </label>
                <CustomSelect
                  options={services.map((s) => ({ value: s.id, label: s.name }))}
                  value={
                    selectedEditService
                      ? { value: selectedEditService.id, label: selectedEditService.name }
                      : null
                  }
                  onChange={(sel) =>
                    setEditForm((prev) => ({ ...prev, service_id: sel?.value || '' }))
                  }
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-zinc-400 block mb-1">
                  Especialista
                </label>
                <CustomSelect
                  options={[
                    { value: '', label: 'Sin asignar' },
                    ...staffList.map((st) => ({ value: st.id, label: st.name })),
                  ]}
                  value={
                    editForm.staff_id
                      ? {
                          value: editForm.staff_id,
                          label: staffList.find((s) => s.id === editForm.staff_id)?.name || 'Sin asignar',
                        }
                      : { value: '', label: 'Sin asignar' }
                  }
                  onChange={(sel) =>
                    setEditForm((prev) => ({ ...prev, staff_id: sel?.value || '' }))
                  }
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-zinc-400 block mb-1">
                  Fecha y Hora
                </label>
                <CustomDatePicker
                  value={editForm.scheduled_date}
                  onChangeDate={(dateStr) =>
                    setEditForm((prev) => ({ ...prev, scheduled_date: dateStr }))
                  }
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-zinc-400 block mb-1">
                  Precio Cobrado (S/)
                </label>
                <input
                  type="number"
                  min={0}
                  className="form-input rounded-xl border-black-light dark:border-dark-light text-sm"
                  value={editForm.price_charged}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, price_charged: Number(e.target.value) }))
                  }
                />
              </div>

              {/* Problema 5: Restricción de estado al editar */}
              <div>
                <label className="text-xs font-bold uppercase text-zinc-400 block mb-1">
                  Estado
                </label>
                <select
                  className="form-select rounded-xl border-black-light dark:border-dark-light text-sm w-full capitalize bg-white dark:bg-dark"
                  value={editForm.status}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value }))}
                >
                  <option value="agendado">Agendado</option>
                  <option value="en_curso">En curso</option>
                  <option value="completado">Completado</option>
                  {/* Se oculta opción cancelado si la visita original era completado */}
                  {visits.find((v) => v.id === editForm.id)?.status !== 'completado' && (
                    <option value="cancelado">Cancelado</option>
                  )}
                  <option value="no_asistio">No Asistió</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-zinc-400 block mb-1">
                  Notas
                </label>
                <textarea
                  rows={2}
                  className="form-textarea rounded-xl border-black-light dark:border-dark-light text-sm w-full"
                  value={editForm.notes}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, notes: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-black-light dark:border-dark-light">
              <button
                type="button"
                className="btn btn-outline-secondary rounded-xl px-4 min-h-[44px]"
                onClick={() => setIsEditModalOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary rounded-xl px-6 min-h-[44px]"
                onClick={handleEditSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
