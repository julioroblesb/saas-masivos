'use client';

import { useState, useMemo } from 'react';
import { Plus, CheckCircle, XCircle, Search, Calendar, User, ShoppingBag, DollarSign, FileText, Clock, AlertTriangle, Activity } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { createVisitAction, updateVisitStatusAction } from './actions';
import { CustomSelect } from '@/components/ui/CustomSelect';

export function AtencionesManager({ 
  initialVisits, 
  services, 
  contacts 
}: { 
  initialVisits: any[]; 
  services: any[]; 
  contacts: any[]; 
}) {
  const [visits, setVisits] = useState(initialVisits);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [form, setForm] = useState({
    contactId: '',
    serviceId: '',
    visitDate: new Date().toISOString().split('T')[0],
    status: 'completado' as 'en_curso' | 'completado' | 'cancelado',
    priceCharged: 0,
    notes: ''
  });
  
  const [search, setSearch] = useState('');

  // Handle service selection to auto-fill price
  const handleServiceChange = (serviceId: string) => {
    const s = services.find(x => x.id === serviceId);
    setForm(prev => ({
      ...prev,
      serviceId,
      priceCharged: s ? (s.promo_price || s.price) : 0
    }));
  };

  const handleSubmit = async () => {
    if (!form.contactId || !form.serviceId || !form.visitDate) {
      toast.error('Por favor completa los campos requeridos (Cliente, Servicio, Fecha).');
      return;
    }
    
    setIsSubmitting(true);
    const res = await createVisitAction({
      contactId: form.contactId,
      serviceId: form.serviceId,
      visitDate: form.visitDate,
      status: form.status,
      priceCharged: form.priceCharged,
      notes: form.notes
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
  
  const handleComplete = async (visitId: string) => {
    if (!confirm('¿Marcar esta atención como completada? Esto programará los mensajes automáticos.')) return;
    
    const res = await updateVisitStatusAction(visitId, 'completado');
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success('Atención completada. Mensajes programados.');
      window.location.reload();
    }
  };

  const filteredVisits = useMemo(() => {
    if (!search) return visits;
    return visits.filter(v => 
      v.contactName?.toLowerCase().includes(search.toLowerCase()) || 
      v.serviceName?.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, visits]);

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

      <div className="rounded-3xl border border-black-light dark:border-dark-light shadow-sm p-0 overflow-hidden bg-white dark:bg-dark">
        {/* Top Bar */}
        <div className="p-6 border-b border-black-light dark:border-dark-light flex flex-col sm:flex-row justify-between items-center gap-4">
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

        {/* Table */}
        <div className="table-responsive">
          <table className="table-hover w-full min-w-[800px]">
            <thead className="bg-zinc-50 dark:bg-zinc-900/50">
              <tr>
                <th className="py-4 text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-widest">Paciente</th>
                <th className="py-4 text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-widest">Servicio</th>
                <th className="py-4 text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-widest text-center">Fecha</th>
                <th className="py-4 text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-widest text-center">Precio</th>
                <th className="py-4 text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-widest text-center">Estado</th>
                <th className="py-4 text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-widest text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black-light dark:divide-dark-light">
              {filteredVisits.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center text-zinc-400">
                      <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                        <ShoppingBag className="w-8 h-8 text-zinc-300 dark:text-zinc-500" />
                      </div>
                      <p className="text-lg font-medium text-zinc-500 dark:text-zinc-400">No hay atenciones registradas.</p>
                      <p className="text-sm text-zinc-400 dark:text-zinc-500">Registra una nueva atención para comenzar.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredVisits.map(visit => (
                  <tr key={visit.id} className="group hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {visit.contactName?.charAt(0) || <User className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="font-semibold text-black dark:text-white">{visit.contactName || 'Sin nombre'}</div>
                          <div className="text-sm text-zinc-500 dark:text-zinc-400">+{visit.contactPhone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 font-medium text-black dark:text-white">
                      {visit.serviceName}
                    </td>
                    <td className="py-4 text-center">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white-light dark:bg-zinc-800 text-black dark:text-white text-sm font-medium">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(visit.visit_date).toLocaleDateString('es-ES')}
                      </span>
                    </td>
                    <td className="py-4 text-center font-semibold text-black dark:text-white">
                      ${visit.price_charged}
                    </td>
                    <td className="py-4 text-center">
                      {visit.status === 'completado' ? (
                        <span className="badge bg-success/10 text-success border border-success/20 px-3 py-1">Completado</span>
                      ) : visit.status === 'en_curso' ? (
                        <span className="badge bg-warning/10 text-warning border border-warning/20 px-3 py-1">En Curso</span>
                      ) : (
                        <span className="badge bg-danger/10 text-danger border border-danger/20 px-3 py-1">Cancelado</span>
                      )}
                    </td>
                    <td className="py-4 text-right">
                      {visit.status === 'en_curso' && (
                        <button 
                          onClick={() => handleComplete(visit.id)}
                          className="btn btn-sm btn-outline-success gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Marcar como completado"
                        >
                          <CheckCircle className="w-4 h-4" /> Completar
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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
                  <label className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" /> Paciente *
                  </label>
                  <CustomSelect
                    placeholder="Selecciona un paciente..."
                    options={contacts.map(c => ({ value: c.id, label: `${c.name || 'Sin nombre'} (+${c.phone})` }))}
                    value={form.contactId ? { value: form.contactId, label: contacts.find(c => c.id === form.contactId) ? `${contacts.find(c => c.id === form.contactId).name || 'Sin nombre'} (+${contacts.find(c => c.id === form.contactId).phone})` : 'Seleccionado' } : null}
                    onChange={(selected: any) => setForm(prev => ({ ...prev, contactId: selected ? selected.value : '' }))}
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-primary" /> Servicio *
                  </label>
                  <CustomSelect
                    placeholder="Selecciona un servicio..."
                    options={services.map(s => ({ value: s.id, label: `${s.name} ($${s.promo_price || s.price})` }))}
                    value={form.serviceId ? { value: form.serviceId, label: services.find(s => s.id === form.serviceId) ? `${services.find(s => s.id === form.serviceId).name} ($${services.find(s => s.id === form.serviceId).promo_price || services.find(s => s.id === form.serviceId).price})` : 'Seleccionado' } : null}
                    onChange={(selected: any) => handleServiceChange(selected ? selected.value : '')}
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" /> Fecha de Visita *
                  </label>
                  <input 
                    type="date"
                    className="form-input w-full rounded-xl border-black-light dark:border-dark-light focus:border-primary focus:ring-primary shadow-sm bg-white dark:bg-dark"
                    value={form.visitDate}
                    onChange={e => setForm(prev => ({ ...prev, visitDate: e.target.value }))}
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-primary" /> Precio Cobrado
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-medium">$</span>
                    <input 
                      type="number"
                      className="form-input pl-8 w-full rounded-xl border-black-light dark:border-dark-light focus:border-primary focus:ring-primary shadow-sm bg-white dark:bg-dark"
                      value={form.priceCharged}
                      onChange={e => setForm(prev => ({ ...prev, priceCharged: parseFloat(e.target.value) || 0 }))}
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
