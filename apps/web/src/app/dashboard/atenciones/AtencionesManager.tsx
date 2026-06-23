'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Plus, CheckCircle, XCircle, Search, Calendar, User, ShoppingBag, Coins, FileText, Clock, AlertTriangle, Activity, Phone, Users } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { createVisitAction, updateVisitStatusAction } from './actions';
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [form, setForm] = useState({
    contact_id: '',
    service_id: '',
    visit_date: new Date().toISOString().split('T')[0],
    status: 'en_curso' as 'en_curso' | 'completado' | 'cancelado',
    price_charged: 0,
    notes: '',
    staff_id: ''
  });
  
  const [showNewPatient, setShowNewPatient] = useState(false);
  const [newPatient, setNewPatient] = useState({ name: '', phone: '' });
  
  const [search, setSearch] = useState('');

  // Handle service selection to auto-fill price
  const handleServiceChange = (serviceId: string) => {
    const s = services.find(x => x.id === serviceId);
    setForm(prev => ({
      ...prev,
      service_id: serviceId,
      price_charged: s ? (s.promo_price || s.price) : 0
    }));
  };

  const handleSubmit = async () => {
    if ((!form.contact_id && !showNewPatient) || (showNewPatient && (!newPatient.name || !newPatient.phone)) || !form.service_id || !form.visit_date) {
      toast.error('Por favor completa los campos requeridos (Cliente, Servicio, Fecha).');
      return;
    }
    
    setIsSubmitting(true);
    const res = await createVisitAction({
      contact_id: !showNewPatient ? form.contact_id : undefined,
      new_contact: showNewPatient ? newPatient : undefined,
      service_id: form.service_id,
      visit_date: form.visit_date,
      status: form.status,
      price_charged: form.price_charged,
      notes: form.notes,
      staff_id: form.staff_id || undefined
    });
    
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success('Atención registrada exitosamente');
      setIsModalOpen(false);
      // We could ideally re-fetch or optimistically update
      window.location.reload(); 
    }
    setIsSubmitting(false);
  };
  
  const handleUpdateStatus = async (visitId: string, status: 'completado' | 'cancelado') => {
    if (!confirm(`¿Marcar esta atención como ${status}?`)) return;
    
    const res = await updateVisitStatusAction(visitId, status);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(`Atención ${status}.`);
      window.location.reload();
    }
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
      const date = new Date(visit.visit_date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' });
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

        <div className="flex flex-col sm:flex-row items-center gap-4">
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
            className="btn btn-primary rounded-xl transition-all gap-2 w-full sm:w-auto px-6"
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
                        <div className="flex items-center justify-between pt-2">
                          <div className="text-xs text-zinc-400">
                            Creado: {new Date(visit.created_at).toLocaleDateString()}
                          </div>
                          {visit.status === 'en_curso' && (
                            <button 
                              className="btn btn-sm btn-outline-success"
                              onClick={() => handleUpdateStatus(visit.id, 'completado')}
                            >
                              Completar
                            </button>
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {historyVisits.map((visit: any) => (
                    <tr key={visit.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                      <td className="p-4 text-black dark:text-white font-medium">{new Date(visit.visit_date).toLocaleDateString()}</td>
                      <td className="p-4">
                        <div className="font-semibold text-black dark:text-white">{visit.contact_name}</div>
                        <div className="text-xs text-zinc-500">+{visit.contact_phone}</div>
                      </td>
                      <td className="p-4 text-zinc-600 dark:text-zinc-300">{visit.service_name}</td>
                      <td className="p-4 text-zinc-500">
                        {visit.staff_id && staffList ? staffList.find((s: any) => s.id === visit.staff_id)?.name || '-' : '-'}
                      </td>
                      <td className="p-4 font-semibold text-black dark:text-white">S/ {visit.price_charged}</td>
                      <td className="p-4">
                        <span className={`badge ${visit.status === 'completado' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                          {visit.status.replace('_', ' ')}
                        </span>
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
          <div className="bg-white dark:bg-dark border border-black-light dark:border-dark-light rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-2 duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]">
            <div className="flex items-center justify-between p-6 border-b border-black-light dark:border-dark-light">
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
            
            <div className="p-6">
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
                    <Calendar className="w-4 h-4 text-primary" /> Fecha de Visita *
                  </label>
                  <CustomDatePicker 
                    value={form.visit_date}
                    onChangeDate={(dateStr) => setForm(prev => ({ ...prev, visit_date: dateStr }))}
                    placeholder="Seleccione la fecha"
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
                      value={form.price_charged}
                      onChange={e => setForm(prev => ({ ...prev, price_charged: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" /> Estado Inicial
                  </label>
                  <CustomSelect
                    options={[
                      { value: 'completado', label: 'Completado (Programa mensajes aut.)' },
                      { value: 'en_curso', label: 'En Curso (No programa mensajes aut.)' }
                    ]}
                    value={{ value: form.status, label: form.status === 'completado' ? 'Completado (Programa mensajes aut.)' : 'En Curso (No programa mensajes aut.)' }}
                    onChange={(selected: any) => setForm(prev => ({ ...prev, status: selected ? selected.value : 'completado' }))}
                  />
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
                
                {form.status === 'completado' && (
                  <div className="col-span-1 md:col-span-2 bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm text-black dark:text-white font-medium">Programación Automática Activada</p>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                        Al guardar como "Completado", el sistema llamará automáticamente a la función de programación de mensajes post-cuidado y seguimiento, de acuerdo a la configuración del servicio seleccionado.
                      </p>
                    </div>
                  </div>
                )}
                
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-3 p-6 border-t border-black-light dark:border-dark-light">
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
    </div>
  );
}
