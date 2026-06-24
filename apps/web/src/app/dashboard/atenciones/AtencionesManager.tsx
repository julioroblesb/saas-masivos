'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, CheckCircle, XCircle, Search, Calendar, User, ShoppingBag, Coins, FileText, Clock, AlertTriangle, Activity, Phone, Users } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { createVisitAction, updateVisitStatusAction, addPaymentAction, completeAndPayVisitAction, deleteVisitAction, editVisitAction } from './actions';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { CustomDatePicker } from '@/components/ui/CustomDatePicker';

export function AtencionesManager({ 
  initialVisits, 
  services, 
  contacts,
  staffList 
}: { 
  initialVisits: any[]; 
  services: any[]; 
  contacts: any[]; 
  staffList?: any[];
}) {
  const [activeTab, setActiveTab] = useState<'activas' | 'historial'>('activas');
  const [visits, setVisits] = useState(initialVisits);
  const router = useRouter();

  // Mantener el estado sincronizado con los datos del servidor (router.refresh)
  useEffect(() => {
    setVisits(initialVisits);
  }, [initialVisits]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [completeVisit, setCompleteVisit] = useState<any>(null);
  const [completeIsCredit, setCompleteIsCredit] = useState(false);
  const [completePayment, setCompletePayment] = useState(0);
  const [completeMethod, setCompleteMethod] = useState('efectivo');
  const [completeDebtDate, setCompleteDebtDate] = useState('');
  const [completeNotes, setCompleteNotes] = useState('');
  
  const [paymentVisit, setPaymentVisit] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [form, setForm] = useState({
    contact_id: '',
    service_id: '',
    staff_id: '',
    scheduled_date: new Date().toISOString().slice(0, 16),
    price_charged: 0,
    notes: '',
  });
  
  const [showNewPatient, setShowNewPatient] = useState(false);
  const [newPatient, setNewPatient] = useState({ name: '', phone: '' });
  
  const [search, setSearch] = useState('');

  // Handle service selection to auto-fill price
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<any>(null);

  const [editForm, setEditForm] = useState({
    service_id: '',
    staff_id: '',
    scheduled_date: '',
    price_charged: 0,
    status: '',
    notes: ''
  });

  const handleEditClick = (visit: any) => {
    setSelectedVisit(visit);
    setEditForm({
      service_id: visit.service_id,
      staff_id: visit.staff_id || '',
      scheduled_date: (visit.scheduled_date || visit.visit_date).slice(0, 16),
      price_charged: visit.price_charged,
      status: visit.status,
      notes: visit.notes || ''
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async () => {
    setIsSubmitting(true);
    const res = await editVisitAction(selectedVisit.id, editForm);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success('Atención editada');
      setIsEditModalOpen(false);
      setVisits(visits.map(v => v.id === selectedVisit.id ? { ...v, ...editForm, service_name: services.find(s => s.id === editForm.service_id)?.name } : v));
      router.refresh();
    }
    setIsSubmitting(false);
  };

  const handleDeleteSubmit = async () => {
    setIsSubmitting(true);
    const res = await deleteVisitAction(selectedVisit.id);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success('Atención eliminada');
      setIsDeleteModalOpen(false);
      setVisits(visits.filter(v => v.id !== selectedVisit.id));
      router.refresh();
    }
    setIsSubmitting(false);
  };

  const handleServiceChange = (serviceId: string) => {
    const s = services.find(x => x.id === serviceId);
    setForm(prev => ({
      ...prev,
      service_id: serviceId,
      price_charged: s ? s.price : 0,
    }));
  };

  const handlePriceBlur = () => {
    const s = services.find(x => x.id === form.service_id);
    if (s && s.promo_price && form.price_charged < s.promo_price) {
      toast.error(`El precio no puede ser menor al precio promo (S/ ${s.promo_price})`);
      setForm(prev => ({ ...prev, price_charged: s.promo_price as number }));
    }
  };

  const handleSubmit = async () => {
    if ((!form.contact_id && !showNewPatient) || (showNewPatient && (!newPatient.name || !newPatient.phone)) || !form.service_id || !form.scheduled_date) {
      toast.error('Por favor completa los campos requeridos (Cliente, Servicio, Fecha).');
      return;
    }
    
    // Auto-determine status based on date
    const selectedDateStr = form.scheduled_date.split('T')[0];
    const todayStr = new Date(new Date().getTime() - 5 * 60 * 60 * 1000).toISOString().split('T')[0];
    const computedStatus = selectedDateStr === todayStr ? 'en_curso' : 'agendada';
    
    setIsSubmitting(true);
    const res = await createVisitAction({
      contact_id: !showNewPatient ? form.contact_id : undefined,
      new_contact: showNewPatient ? newPatient : undefined,
      service_id: form.service_id,
      scheduled_date: form.scheduled_date,
      status: computedStatus,
      price_charged: form.price_charged,
      notes: form.notes,
      staff_id: form.staff_id || undefined
    });
    
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success('Atención registrada exitosamente');
      setIsModalOpen(false);
      router.refresh(); 
    }
    setIsSubmitting(false);
  };
  
  const handleUpdateStatus = async (visitId: string, status: 'completado' | 'cancelado') => {
    if (status === 'completado') {
      const v = visits.find(x => x.id === visitId);
      if (v) {
        setCompleteVisit(v);
        setCompleteIsCredit(false);
        setCompletePayment(v.price_charged);
        setCompleteMethod('efectivo');
        setCompleteNotes(v.notes || '');
        setCompleteDebtDate('');
        setIsCompleteModalOpen(true);
      }
      return;
    }

    if (!confirm(`¿Marcar esta atención como ${status}?`)) return;
    
    setVisits(prev => prev.map(v => v.id === visitId ? { ...v, status } : v));
    
    const res = await updateVisitStatusAction(visitId, status);
    if (res.error) {
      toast.error(res.error);
      router.refresh(); 
    } else {
      toast.success(`Atención ${status}.`);
      router.refresh();
    }
  };

  const handleCompleteSubmit = async () => {
    if (!completeVisit) return;
    if (completeIsCredit && (!completeDebtDate || completePayment < 0)) {
      toast.error('Por favor completa la fecha de próximo pago y el abono válido.');
      return;
    }

    setIsSubmitting(true);
    const res = await completeAndPayVisitAction(completeVisit.id, {
      payment_method: completeMethod,
      is_credit: completeIsCredit,
      initial_payment: completePayment,
      debt_due_date: completeDebtDate,
      notes: completeNotes
    });

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success('Atención completada y cobrada exitosamente');
      setIsCompleteModalOpen(false);
      router.refresh();
    }
    setIsSubmitting(false);
  };

  const handleAddPayment = async () => {
    if (!paymentVisit || paymentAmount <= 0) return;
    setIsSubmitting(true);
    const res = await addPaymentAction(paymentVisit.id, paymentAmount, paymentMethod);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success('Abono registrado exitosamente');
      setIsPaymentModalOpen(false);
      router.refresh();
    }
    setIsSubmitting(false);
  };

  const filteredVisits = useMemo(() => {
    if (!search) return visits;
    return visits.filter(v => 
      v.contact_name?.toLowerCase().includes(search.toLowerCase()) || 
      v.service_name?.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, visits]);

  // Agrupar atenciones por fecha (solo para la pestaña Activas)
  const groupedVisits = filteredVisits
    .filter(v => v.status === 'en_curso')
    .reduce((acc: any, visit: any) => {
      const date = new Date((visit.visit_date || '').split('T')[0] + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' });
      if (!acc[date]) acc[date] = [];
      acc[date].push(visit);
      return acc;
    }, {});

  const historyVisits = filteredVisits.filter(v => v.status === 'completado' || v.status === 'cancelado');

  return (
    <div className="flex flex-col h-full space-y-6">
      
      {/* Header Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="rounded-3xl bg-primary text-white border border-primary shadow-sm p-6 relative overflow-hidden group">
          <div className="flex justify-between items-start relative z-10">
            <div className="flex flex-col space-y-1">
              <p className="text-white/80 text-xs font-semibold uppercase tracking-widest">Total Atenciones</p>
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
              <p className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-widest">En Curso</p>
              <h2 className="text-4xl font-bold tracking-tight text-black dark:text-white mt-2">
                {visits.filter(v => v.status === 'en_curso').length}
              </h2>
            </div>
            <div className="p-3 bg-white-light dark:bg-zinc-900 rounded-xl">
              <Clock className="w-6 h-6 text-warning" />
            </div>
          </div>
        </div>
        
        <div className="rounded-3xl bg-white dark:bg-dark border border-black-light dark:border-dark-light shadow-sm p-6 group">
          <div className="flex justify-between items-start">
            <div className="flex flex-col space-y-1">
              <p className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-widest">Completadas</p>
              <h2 className="text-4xl font-bold tracking-tight text-black dark:text-white mt-2">
                {visits.filter(v => v.status === 'completado').length}
              </h2>
            </div>
            <div className="p-3 bg-white-light dark:bg-zinc-900 rounded-xl">
              <CheckCircle className="w-6 h-6 text-success" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="flex bg-white dark:bg-zinc-900 border border-black-light dark:border-dark-light rounded-xl overflow-hidden self-start">
          <button 
            className={`px-5 py-2.5 text-sm font-semibold transition-colors ${activeTab === 'activas' ? 'bg-primary/10 text-primary' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}
            onClick={() => setActiveTab('activas')}
          >
            Atenciones Activas
          </button>
          <button 
            className={`px-5 py-2.5 text-sm font-semibold transition-colors border-l border-black-light dark:border-dark-light ${activeTab === 'historial' ? 'bg-primary/10 text-primary' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}
            onClick={() => setActiveTab('historial')}
          >
            Historial
          </button>
        </div>

        <div className="flex flex-row items-center gap-4 w-full md:w-auto">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Buscar paciente o servicio..." 
              className="form-input pl-10 rounded-xl border-black-light dark:border-dark-light focus:ring-primary focus:border-primary transition-shadow w-full bg-white dark:bg-dark"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button 
            className="btn btn-primary rounded-xl gap-2 px-6 whitespace-nowrap"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus className="w-5 h-5" /> Nueva Atención
          </button>
        </div>
      </div>

      {/* Contenido principal basado en la pestaña */}
      {activeTab === 'activas' ? (
        Object.keys(groupedVisits).length === 0 ? (
          <div className="p-12 text-center text-zinc-500 bg-white dark:bg-dark border border-black-light dark:border-dark-light rounded-3xl">
            No se encontraron atenciones activas.
          </div>
        ) : (
          <div className="space-y-8">
            {Object.keys(groupedVisits).map(date => (
              <div key={date}>
                <h3 className="text-lg font-bold text-black dark:text-white mb-4 capitalize">{date}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {groupedVisits[date].map((visit: any) => (
                    <div key={visit.id} className="panel p-0 hover:-translate-y-1 transition-transform duration-300 overflow-hidden relative group border-2 border-transparent hover:border-primary/20">
                      <div className="p-5 border-b border-black-light dark:border-dark-light bg-gradient-to-br from-white to-zinc-50 dark:from-dark dark:to-zinc-900/50">
                        <div className="flex justify-between items-start mb-3">
                          <span className={`badge ${visit.status === 'en_curso' ? 'bg-warning/10 text-warning' : visit.status === 'completado' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                            {visit.status.replace('_', ' ')}
                          </span>
                          <span className="text-xl font-bold text-black dark:text-white">
                            S/ {visit.price_charged}
                          </span>
                        </div>
                        <h4 className="text-lg font-bold text-black dark:text-white mb-1">{visit.contact_name || 'Paciente Sin Nombre'}</h4>
                        <div className="flex items-center text-sm text-zinc-500 gap-1 mb-1">
                          <Phone size={14} /> +{visit.contact_phone}
                        </div>
                        <div className="text-sm font-semibold text-primary">{visit.service_name}</div>
                        {visit.staff_id && staffList && (
                          <div className="text-xs text-zinc-500 mt-2">
                            Atendido por: <span className="font-medium text-zinc-700 dark:text-zinc-300">{staffList.find((s: any) => s.id === visit.staff_id)?.name || 'Desconocido'}</span>
                          </div>
                        )}
                      </div>
                      <div className="p-5 bg-white dark:bg-dark space-y-3">
                        {visit.notes && (
                          <p className="text-sm text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-lg border border-black-light dark:border-dark-light">
                            {visit.notes}
                          </p>
                        )}
                        <div className="flex flex-col gap-2 pt-2 border-t border-black-light dark:border-dark-light mt-2">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-zinc-500">Cobrado:</span>
                            <span className="font-semibold text-black dark:text-white">S/ {visit.amount_paid || 0} de S/ {visit.price_charged}</span>
                          </div>
                          {(visit.payment_status === 'pendiente' || visit.payment_status === 'parcial') && (
                            <button 
                              onClick={() => {
                                setPaymentVisit(visit);
                                setPaymentAmount(visit.price_charged - (visit.amount_paid || 0));
                                setIsPaymentModalOpen(true);
                              }}
                              className="w-full btn btn-sm btn-outline-primary bg-primary/5 border-primary/20 hover:bg-primary hover:text-white transition-colors"
                            >
                              <Coins className="w-4 h-4 mr-2" /> Agregar Abono
                            </button>
                          )}
                        </div>
                        <div className="flex justify-end gap-2 pt-2 border-t border-black-light dark:border-dark-light mt-2">
                          <div className="text-xs text-zinc-400">
                            Creado: {new Date(visit.created_at).toLocaleString('es-PE', { hour: 'numeric', minute: '2-digit', hour12: true, day: '2-digit', month: 'short' })}
                          </div>
                          {visit.status === 'en_curso' && (
                            <div className="flex items-center gap-2">
                              <button 
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleUpdateStatus(visit.id, 'cancelado')}
                              >
                                Cancelar
                              </button>
                              <button 
                                className="btn btn-sm btn-outline-success"
                                onClick={() => handleUpdateStatus(visit.id, 'completado')}
                              >
                                Completar
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="panel p-0 overflow-hidden">
          <div className="table-responsive">
            {historyVisits.length === 0 ? (
              <div className="p-8 text-center text-zinc-500">No hay atenciones en el historial.</div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                  <tr>
                    <th className="p-4">Fecha</th>
                    <th className="p-4">Paciente</th>
                    <th className="p-4">Servicio</th>
                    <th className="p-4">Trabajadora</th>
                    <th className="p-4">Monto</th>
                    <th className="p-4">Estado</th>
                    <th className="p-4">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {historyVisits.map((visit: any) => (
                    <tr key={visit.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                      <td className="p-4 text-black dark:text-white font-medium">{new Date(visit.scheduled_date || visit.visit_date).toLocaleString('es-PE', { hour: 'numeric', minute: '2-digit', hour12: true, day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                      <td className="p-4">
                        <div className="font-semibold text-black dark:text-white">{visit.contact_name}</div>
                        <div className="text-xs text-zinc-500">+{visit.contact_phone}</div>
                      </td>
                      <td className="p-4 text-zinc-600 dark:text-zinc-300">
                        <div className="flex items-center gap-2">
                          {visit.service_name}
                          {visit.notes && (
                            <div className="group relative flex items-center">
                              <FileText className="w-4 h-4 text-primary cursor-help" />
                              <div className="absolute left-full ml-2 w-48 p-2 bg-black text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 pointer-events-none">
                                {visit.notes}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-zinc-500">
                        {visit.staff_id && staffList ? staffList.find((s: any) => s.id === visit.staff_id)?.name || '-' : '-'}
                      </td>
                      <td className="p-4 font-semibold text-black dark:text-white">S/ {visit.price_charged}</td>
                      <td className="p-4">
                        <span className={`badge ${visit.status === 'completado' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                          {visit.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <button onClick={() => handleEditClick(visit)} className="text-primary hover:text-primary/80 transition-colors text-sm font-medium">Editar</button>
                          <button onClick={() => { setSelectedVisit(visit); setIsDeleteModalOpen(true); }} className="text-danger hover:text-danger/80 transition-colors text-sm font-medium">Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Modal - Nueva Atención */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]">
          <div className="bg-white dark:bg-dark border border-black-light dark:border-dark-light rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 slide-in-from-bottom-2 duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]">
            <div className="flex items-center justify-between p-6 border-b border-black-light dark:border-dark-light shrink-0">
              <h3 className="text-2xl font-semibold tracking-tight text-black dark:text-white flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Plus className="w-5 h-5 text-primary" />
                </div>
                Registrar Atención
              </h3>
              <button 
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-white transition-colors bg-white-light dark:bg-zinc-800 p-2 rounded-full" 
                onClick={() => setIsModalOpen(false)}
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="space-y-4 col-span-1 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
                      <User className="w-4 h-4 text-primary" /> Paciente *
                    </label>
                    <button 
                      type="button"
                      onClick={() => setShowNewPatient(!showNewPatient)}
                      className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                    >
                      {showNewPatient ? 'Seleccionar existente' : '+ Nuevo paciente'}
                    </button>
                  </div>
                  
                  {showNewPatient ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <input 
                        type="text" 
                        placeholder="Nombre completo" 
                        className="form-input rounded-xl border-black-light dark:border-dark-light focus:border-primary focus:ring-primary shadow-sm"
                        value={newPatient.name}
                        onChange={e => setNewPatient(p => ({ ...p, name: e.target.value }))}
                      />
                      <input 
                        type="text" 
                        placeholder="Teléfono (ej: 51987654321)" 
                        className="form-input rounded-xl border-black-light dark:border-dark-light focus:border-primary focus:ring-primary shadow-sm"
                        value={newPatient.phone}
                        onChange={e => setNewPatient(p => ({ ...p, phone: e.target.value }))}
                      />
                    </div>
                  ) : (
                    <CustomSelect
                      placeholder="Selecciona un paciente..."
                      options={contacts.map(c => ({ value: c.id, label: `${c.name || 'Sin nombre'} (+${c.phone})` }))}
                      value={form.contact_id ? { value: form.contact_id, label: contacts.find(c => c.id === form.contact_id) ? `${contacts.find(c => c.id === form.contact_id).name || 'Sin nombre'} (+${contacts.find(c => c.id === form.contact_id).phone})` : 'Seleccionado' } : null}
                      onChange={(selected: any) => setForm(prev => ({ ...prev, contact_id: selected ? selected.value : '' }))}
                    />
                  )}
                </div>

                <div className="space-y-4">
                  <label className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-primary" /> Servicio *
                  </label>
                  <CustomSelect
                    placeholder="Selecciona un servicio..."
                    options={services.map(s => ({ value: s.id, label: `${s.name} (S/ ${s.promo_price || s.price})` }))}
                    value={form.service_id ? { value: form.service_id, label: services.find(s => s.id === form.service_id) ? `${services.find(s => s.id === form.service_id).name} (S/ ${services.find(s => s.id === form.service_id).promo_price || services.find(s => s.id === form.service_id).price})` : 'Seleccionado' } : null}
                    onChange={(selected: any) => handleServiceChange(selected ? selected.value : '')}
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" /> Trabajadora
                  </label>
                  <CustomSelect
                    placeholder="Selecciona la trabajadora..."
                    options={staffList ? staffList.map((s: any) => ({ value: s.id, label: s.name })) : []}
                    value={form.staff_id && staffList ? { value: form.staff_id, label: staffList.find((s: any) => s.id === form.staff_id)?.name || 'Seleccionada' } : null}
                    onChange={(selected: any) => setForm(prev => ({ ...prev, staff_id: selected ? selected.value : '' }))}
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" /> Fecha Programada (Cita) *
                  </label>
                  <CustomDatePicker
                    enableTime={true}
                    value={form.scheduled_date}
                    onChangeDate={(dateStr) => setForm(prev => ({ ...prev, scheduled_date: dateStr }))}
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
                    <Coins className="w-4 h-4 text-primary" /> Precio Total Acordado
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-medium">S/</span>
                    <input 
                      type="number"
                      className="form-input pl-8 w-full rounded-xl border-black-light dark:border-dark-light focus:border-primary focus:ring-primary shadow-sm bg-white dark:bg-dark"
                      value={form.price_charged}
                      onChange={e => setForm(prev => ({ ...prev, price_charged: parseFloat(e.target.value) || 0 }))}
                      onBlur={handlePriceBlur}
                    />
                  </div>
                </div>

                <div className="space-y-4 col-span-1 md:col-span-2">
                  <label className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" /> Notas de la sesión
                  </label>
                  <textarea 
                    className="form-textarea w-full rounded-xl border-black-light dark:border-dark-light focus:border-primary focus:ring-primary shadow-sm bg-white dark:bg-dark"
                    placeholder="Detalles sobre el procedimiento, preferencias del paciente, etc."
                    rows={3}
                    value={form.notes}
                    onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                  />
                </div>
                
                {/* The automatic warning text is removed since status isn't chosen directly here */}
                
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-3 p-6 border-t border-black-light dark:border-dark-light shrink-0">
              <button 
                className="btn btn-outline-secondary rounded-xl px-6" 
                onClick={() => setIsModalOpen(false)}
              >
                Cancelar
              </button>
              <button 
                className="btn btn-primary rounded-xl px-8" 
                onClick={handleSubmit} 
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Guardando...' : 'Registrar Atención'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal - Completar Atención */}
      {isCompleteModalOpen && completeVisit && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-dark border border-black-light dark:border-dark-light rounded-3xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between p-6 border-b border-black-light dark:border-dark-light bg-gradient-to-r from-success/5 to-white dark:from-success/10 dark:to-dark shrink-0 rounded-t-3xl">
              <h3 className="text-xl font-bold tracking-tight text-black dark:text-white flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-success" />
                Completar Atención
              </h3>
              <button 
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-white transition-colors bg-white-light dark:bg-zinc-800 p-2 rounded-full" 
                onClick={() => setIsCompleteModalOpen(false)}
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
                <div className="text-sm text-zinc-500 mb-1">Costo Total del Servicio</div>
                <div className="text-2xl font-bold text-primary">S/ {completeVisit.price_charged}</div>
              </div>

              <div className="space-y-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="form-checkbox text-primary focus:ring-primary h-5 w-5 rounded border-zinc-300"
                    checked={completeIsCredit}
                    onChange={(e) => setCompleteIsCredit(e.target.checked)}
                  />
                  <span className="text-sm font-semibold text-black dark:text-white">¿Es pago a crédito / parcial?</span>
                </label>
              </div>

              <div className="space-y-4">
                <label className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
                  <Coins className="w-4 h-4 text-primary" /> Monto cobrado AHORA
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-medium">S/</span>
                  <input 
                    type="number"
                    className="form-input pl-8 w-full rounded-xl border-black-light dark:border-dark-light focus:border-primary focus:ring-primary shadow-sm bg-white dark:bg-dark"
                    value={completePayment}
                    onChange={e => setCompletePayment(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              {completePayment > 0 && (
                <div className="space-y-4">
                  <label className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" /> Método de Pago
                  </label>
                  <CustomSelect
                    options={[
                      { value: 'efectivo', label: 'Efectivo' },
                      { value: 'yape', label: 'Yape' },
                      { value: 'plin', label: 'Plin' },
                      { value: 'transferencia', label: 'Transferencia' },
                      { value: 'tarjeta', label: 'Tarjeta' }
                    ]}
                    value={{ value: completeMethod, label: completeMethod.charAt(0).toUpperCase() + completeMethod.slice(1) }}
                    onChange={(selected: any) => setCompleteMethod(selected ? selected.value : 'efectivo')}
                  />
                </div>
              )}

              {completeIsCredit && (
                <div className="space-y-4 p-4 bg-warning/5 rounded-xl border border-warning/20">
                  <label className="text-sm font-semibold text-warning-dark flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Fecha Promesa de Pago *
                  </label>
                  <input 
                    type="date"
                    className="form-input rounded-xl border-black-light dark:border-dark-light focus:border-primary focus:ring-primary shadow-sm bg-white dark:bg-dark w-full"
                    value={completeDebtDate}
                    onChange={e => setCompleteDebtDate(e.target.value)}
                  />
                  <p className="text-xs text-zinc-500">Debe seleccionar una fecha para enviar la alerta de cobranza.</p>
                </div>
              )}

              <div className="space-y-4">
                <label className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" /> Observaciones (Opcional)
                </label>
                <textarea 
                  className="form-textarea w-full rounded-xl border-black-light dark:border-dark-light focus:border-primary focus:ring-primary shadow-sm bg-white dark:bg-dark"
                  placeholder="Detalles sobre cómo quedó el paciente..."
                  rows={3}
                  value={completeNotes}
                  onChange={e => setCompleteNotes(e.target.value)}
                />
              </div>

              <div className="pt-4 border-t border-black-light dark:border-dark-light flex justify-end gap-3">
                <button 
                  className="btn btn-outline-secondary rounded-xl px-6"
                  onClick={() => setIsCompleteModalOpen(false)}
                >
                  Cancelar
                </button>
                <button 
                  className="btn btn-success rounded-xl px-8 text-white"
                  onClick={handleCompleteSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Guardando...' : 'Completar Atención'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal - Registrar Abono */}
      {isPaymentModalOpen && paymentVisit && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-dark border border-black-light dark:border-dark-light rounded-3xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between p-6 border-b border-black-light dark:border-dark-light bg-gradient-to-r from-zinc-50 to-white dark:from-zinc-900/50 dark:to-dark shrink-0 rounded-t-3xl">
              <h3 className="text-xl font-bold tracking-tight text-black dark:text-white flex items-center gap-2">
                <Coins className="w-5 h-5 text-primary" />
                Registrar Abono
              </h3>
              <button 
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-white transition-colors bg-white-light dark:bg-zinc-800 p-2 rounded-full" 
                onClick={() => setIsPaymentModalOpen(false)}
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
                <div className="text-sm text-zinc-500 mb-1">Saldo pendiente</div>
                <div className="text-2xl font-bold text-primary">S/ {paymentVisit.price_charged - (paymentVisit.amount_paid || 0)}</div>
              </div>

              <div className="space-y-4">
                <label className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
                  <Coins className="w-4 h-4 text-primary" /> Monto a abonar
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-medium">S/</span>
                  <input 
                    type="number"
                    className="form-input pl-8 w-full rounded-xl border-black-light dark:border-dark-light focus:border-primary focus:ring-primary shadow-sm bg-white dark:bg-dark"
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" /> Método de Pago
                </label>
                <CustomSelect
                  options={[
                    { value: 'efectivo', label: 'Efectivo' },
                    { value: 'yape', label: 'Yape' },
                    { value: 'plin', label: 'Plin' },
                    { value: 'transferencia', label: 'Transferencia' },
                    { value: 'tarjeta', label: 'Tarjeta' }
                  ]}
                  value={{ value: paymentMethod, label: paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1) }}
                  onChange={(selected: any) => setPaymentMethod(selected ? selected.value : 'efectivo')}
                />
              </div>

              <div className="pt-4 border-t border-black-light dark:border-dark-light flex justify-end gap-3">
                <button 
                  className="btn btn-outline-secondary rounded-xl px-6"
                  onClick={() => setIsPaymentModalOpen(false)}
                >
                  Cancelar
                </button>
                <button 
                  className="btn btn-primary rounded-xl px-8"
                  onClick={handleAddPayment}
                  disabled={isSubmitting || paymentAmount <= 0}
                >
                  {isSubmitting ? 'Guardando...' : 'Guardar Abono'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal - Editar Atención */}
      {isEditModalOpen && selectedVisit && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]">
          <div className="bg-white dark:bg-dark border border-black-light dark:border-dark-light rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 slide-in-from-bottom-2 duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]">
            <div className="flex items-center justify-between p-6 border-b border-black-light dark:border-dark-light shrink-0">
              <h3 className="text-xl font-bold tracking-tight text-black dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Editar Atención
              </h3>
              <button 
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-white transition-colors bg-white-light dark:bg-zinc-800 p-2 rounded-full" 
                onClick={() => setIsEditModalOpen(false)}
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <label className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-primary" /> Servicio *
                  </label>
                  <CustomSelect
                    options={services.map(s => ({ value: s.id, label: s.name }))}
                    value={editForm.service_id ? { value: editForm.service_id, label: services.find(s => s.id === editForm.service_id)?.name || '' } : null}
                    onChange={(selected: any) => setEditForm(prev => ({ ...prev, service_id: selected ? selected.value : '' }))}
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" /> Trabajadora
                  </label>
                  <CustomSelect
                    options={staffList ? staffList.map((s: any) => ({ value: s.id, label: s.name })) : []}
                    value={editForm.staff_id && staffList ? { value: editForm.staff_id, label: staffList.find((s: any) => s.id === editForm.staff_id)?.name || '' } : null}
                    onChange={(selected: any) => setEditForm(prev => ({ ...prev, staff_id: selected ? selected.value : '' }))}
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" /> Fecha
                  </label>
                  <CustomDatePicker
                    enableTime={true}
                    value={editForm.scheduled_date}
                    onChangeDate={(dateStr) => setEditForm(prev => ({ ...prev, scheduled_date: dateStr }))}
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
                    <Coins className="w-4 h-4 text-primary" /> Precio Cobrado
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-medium">S/</span>
                    <input 
                      type="number"
                      className="form-input pl-8 w-full rounded-xl border-black-light dark:border-dark-light focus:border-primary focus:ring-primary shadow-sm bg-white dark:bg-dark"
                      value={editForm.price_charged}
                      onChange={e => setEditForm(prev => ({ ...prev, price_charged: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" /> Estado
                  </label>
                  <CustomSelect
                    options={[
                      { value: 'completado', label: 'Completado' },
                      { value: 'en_curso', label: 'En Curso' },
                      { value: 'agendada', label: 'Agendada' },
                      { value: 'cancelado', label: 'Cancelado' }
                    ]}
                    value={{ value: editForm.status, label: editForm.status }}
                    onChange={(selected: any) => setEditForm(prev => ({ ...prev, status: selected ? selected.value : 'completado' }))}
                  />
                </div>

                <div className="space-y-4 col-span-1 md:col-span-2">
                  <label className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" /> Notas
                  </label>
                  <textarea 
                    className="form-textarea w-full rounded-xl border-black-light dark:border-dark-light focus:border-primary focus:ring-primary shadow-sm bg-white dark:bg-dark"
                    rows={3}
                    value={editForm.notes}
                    onChange={e => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-black-light dark:border-dark-light flex justify-end gap-3 shrink-0">
              <button 
                className="btn btn-outline-secondary rounded-xl px-6"
                onClick={() => setIsEditModalOpen(false)}
              >
                Cancelar
              </button>
              <button 
                className="btn btn-primary rounded-xl px-8"
                onClick={handleEditSubmit}
                disabled={isSubmitting || !editForm.service_id || !editForm.scheduled_date}
              >
                {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal - Confirmar Eliminación */}
      {isDeleteModalOpen && selectedVisit && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-dark border border-black-light dark:border-dark-light rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-2 duration-300">
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 bg-danger/10 text-danger rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold tracking-tight text-black dark:text-white">
                ¿Eliminar Atención?
              </h3>
              <p className="text-zinc-500 text-sm">
                Se borrará permanentemente la atención de <strong>{selectedVisit.contact_name}</strong>. Esta acción no se puede deshacer.
              </p>
              
              <div className="flex gap-3 justify-center pt-4">
                <button 
                  className="btn btn-outline-secondary rounded-xl px-6"
                  onClick={() => setIsDeleteModalOpen(false)}
                >
                  Cancelar
                </button>
                <button 
                  className="btn btn-danger rounded-xl px-6"
                  onClick={handleDeleteSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Eliminando...' : 'Sí, Eliminar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
