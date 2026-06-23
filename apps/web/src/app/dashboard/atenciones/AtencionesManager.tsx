'use client';

import { useState, useMemo } from 'react';
import { Plus, CheckCircle, XCircle, Search, Calendar, User, ShoppingBag, DollarSign, FileText, Clock, AlertTriangle, Activity } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { createVisitAction, updateVisitStatusAction } from './actions';

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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="panel bg-gradient-to-br from-indigo-500 to-indigo-700 text-white border-0 shadow-lg shadow-indigo-500/30 rounded-2xl p-6 relative overflow-hidden group hover:scale-[1.02] transition-transform">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-indigo-100 font-medium mb-1">Total Atenciones</p>
              <h2 className="text-3xl font-bold">{visits.length}</h2>
            </div>
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <Activity className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        
        <div className="panel bg-white dark:bg-[#191e3a] border-0 shadow-sm rounded-2xl p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 dark:text-white-dark font-medium mb-1">En Curso</p>
              <h2 className="text-3xl font-bold text-slate-800 dark:text-white-light">
                {visits.filter(v => v.status === 'en_curso').length}
              </h2>
            </div>
            <div className="p-3 bg-warning/10 rounded-xl">
              <Clock className="w-6 h-6 text-warning" />
            </div>
          </div>
        </div>
        
        <div className="panel bg-white dark:bg-[#191e3a] border-0 shadow-sm rounded-2xl p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 dark:text-white-dark font-medium mb-1">Completadas</p>
              <h2 className="text-3xl font-bold text-slate-800 dark:text-white-light">
                {visits.filter(v => v.status === 'completado').length}
              </h2>
            </div>
            <div className="p-3 bg-success/10 rounded-xl">
              <CheckCircle className="w-6 h-6 text-success" />
            </div>
          </div>
        </div>
      </div>

      <div className="panel border-0 shadow-sm p-0 overflow-hidden rounded-2xl">
        {/* Top Bar */}
        <div className="p-6 border-b border-zinc-100 dark:border-[#1b2e4b] flex flex-col sm:flex-row justify-between items-center gap-4 bg-white dark:bg-[#191e3a]">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Buscar paciente o servicio..." 
              className="form-input pl-10 rounded-xl border-slate-200 dark:border-[#1b2e4b] focus:ring-primary focus:border-primary transition-shadow w-full"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button 
            className="btn btn-primary rounded-xl shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all gap-2 w-full sm:w-auto px-6"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus className="w-5 h-5" /> Nueva Atención
          </button>
        </div>

        {/* Table */}
        <div className="table-responsive bg-white dark:bg-[#191e3a]">
          <table className="table-hover w-full min-w-[800px]">
            <thead className="bg-slate-50 dark:bg-[#1b2e4b]/50">
              <tr>
                <th className="py-4 text-slate-500 dark:text-white-dark font-semibold">Paciente</th>
                <th className="py-4 text-slate-500 dark:text-white-dark font-semibold">Servicio</th>
                <th className="py-4 text-slate-500 dark:text-white-dark font-semibold text-center">Fecha</th>
                <th className="py-4 text-slate-500 dark:text-white-dark font-semibold text-center">Precio</th>
                <th className="py-4 text-slate-500 dark:text-white-dark font-semibold text-center">Estado</th>
                <th className="py-4 text-slate-500 dark:text-white-dark font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-[#1b2e4b]">
              {filteredVisits.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <div className="w-16 h-16 bg-slate-100 dark:bg-[#1b2e4b] rounded-full flex items-center justify-center mb-4">
                        <ShoppingBag className="w-8 h-8 text-slate-300" />
                      </div>
                      <p className="text-lg font-medium text-slate-500">No hay atenciones registradas.</p>
                      <p className="text-sm">Registra una nueva atención para comenzar.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredVisits.map(visit => (
                  <tr key={visit.id} className="group hover:bg-slate-50/50 dark:hover:bg-[#1b2e4b]/30 transition-colors">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
                          {visit.contactName?.charAt(0) || <User className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-800 dark:text-white-light">{visit.contactName || 'Sin nombre'}</div>
                          <div className="text-sm text-slate-500">+{visit.contactPhone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 font-medium text-slate-700 dark:text-white-dark">
                      {visit.serviceName}
                    </td>
                    <td className="py-4 text-center">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-[#1b2e4b] text-slate-600 dark:text-white-dark text-sm font-medium">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(visit.visit_date).toLocaleDateString('es-ES')}
                      </span>
                    </td>
                    <td className="py-4 text-center font-semibold text-slate-800 dark:text-white-light">
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
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#191e3a] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-[#1b2e4b] bg-slate-50/50 dark:bg-transparent">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white-light flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-primary" />
                </div>
                Registrar Atención
              </h3>
              <button 
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors bg-slate-100 dark:bg-[#1b2e4b] p-2 rounded-full" 
                onClick={() => setIsModalOpen(false)}
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="space-y-4 col-span-1 md:col-span-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-white-dark flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" /> Paciente *
                  </label>
                  <select 
                    className="form-select w-full rounded-xl border-slate-200 focus:border-primary focus:ring-primary shadow-sm"
                    value={form.contactId}
                    onChange={e => setForm(prev => ({ ...prev, contactId: e.target.value }))}
                  >
                    <option value="">Selecciona un paciente...</option>
                    {contacts.map(c => (
                      <option key={c.id} value={c.id}>{c.name || 'Sin nombre'} (+{c.phone})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-4">
                  <label className="text-sm font-semibold text-slate-700 dark:text-white-dark flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-primary" /> Servicio *
                  </label>
                  <select 
                    className="form-select w-full rounded-xl border-slate-200 focus:border-primary focus:ring-primary shadow-sm"
                    value={form.serviceId}
                    onChange={e => handleServiceChange(e.target.value)}
                  >
                    <option value="">Selecciona un servicio...</option>
                    {services.map(s => (
                      <option key={s.id} value={s.id}>{s.name} (${s.promo_price || s.price})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-4">
                  <label className="text-sm font-semibold text-slate-700 dark:text-white-dark flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" /> Fecha de Visita *
                  </label>
                  <input 
                    type="date"
                    className="form-input w-full rounded-xl border-slate-200 focus:border-primary focus:ring-primary shadow-sm"
                    value={form.visitDate}
                    onChange={e => setForm(prev => ({ ...prev, visitDate: e.target.value }))}
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-sm font-semibold text-slate-700 dark:text-white-dark flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-primary" /> Precio Cobrado
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">$</span>
                    <input 
                      type="number"
                      className="form-input pl-8 w-full rounded-xl border-slate-200 focus:border-primary focus:ring-primary shadow-sm"
                      value={form.priceCharged}
                      onChange={e => setForm(prev => ({ ...prev, priceCharged: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-sm font-semibold text-slate-700 dark:text-white-dark flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" /> Estado Inicial
                  </label>
                  <select 
                    className="form-select w-full rounded-xl border-slate-200 focus:border-primary focus:ring-primary shadow-sm"
                    value={form.status}
                    onChange={e => setForm(prev => ({ ...prev, status: e.target.value as any }))}
                  >
                    <option value="completado">Completado (Programa mensajes aut.)</option>
                    <option value="en_curso">En Curso (No programa mensajes aut.)</option>
                  </select>
                </div>

                <div className="space-y-4 col-span-1 md:col-span-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-white-dark flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" /> Notas de la sesión
                  </label>
                  <textarea 
                    className="form-textarea w-full rounded-xl border-slate-200 focus:border-primary focus:ring-primary shadow-sm"
                    placeholder="Detalles sobre el procedimiento, preferencias del paciente, etc."
                    rows={3}
                    value={form.notes}
                    onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                  />
                </div>
                
                {form.status === 'completado' && (
                  <div className="col-span-1 md:col-span-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 rounded-xl p-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm text-indigo-900 dark:text-indigo-200 font-medium">Programación Automática Activada</p>
                      <p className="text-xs text-indigo-700/80 dark:text-indigo-300/80 mt-1">
                        Al guardar como "Completado", el sistema llamará automáticamente a la función de programación de mensajes post-cuidado y seguimiento, de acuerdo a la configuración del servicio seleccionado.
                      </p>
                    </div>
                  </div>
                )}
                
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-100 dark:border-[#1b2e4b] bg-slate-50/50 dark:bg-transparent">
              <button 
                className="btn btn-outline-secondary rounded-xl px-6" 
                onClick={() => setIsModalOpen(false)}
              >
                Cancelar
              </button>
              <button 
                className="btn btn-primary rounded-xl px-8 shadow-lg shadow-primary/30" 
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
