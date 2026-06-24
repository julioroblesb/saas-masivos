'use client';

import { useState, useEffect } from 'react';
import { updateTenantSubscription } from './actions';
import { toast } from 'react-hot-toast';
import { X, Calendar, Settings, AlertTriangle, Loader2 } from 'lucide-react';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { CustomDatePicker } from '@/components/ui/CustomDatePicker';

interface Company {
  id: string;
  name: string;
  status: string;
  plan_type: string;
  subscription_start_at: string;
  subscription_end_at: string;
}

interface EditTenantModalProps {
  company: Company;
  isOpen: boolean;
  onClose: () => void;
}

export function EditTenantModal({ company, isOpen, onClose }: EditTenantModalProps) {
  const [planType, setPlanType] = useState(company.plan_type || 'prueba');
  const [status, setStatus] = useState(company.status || 'activa');
  
  // Extraemos YYYY-MM-DD para el input type="date"
  const formatDateForInput = (isoDate: string) => {
    if (!isoDate) return '';
    const date = new Date(isoDate);
    return date.toISOString().split('T')[0];
  };

  const [endDate, setEndDate] = useState(formatDateForInput(company.subscription_end_at));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPlanType(company.plan_type || 'prueba');
      setStatus(company.status || 'activa');
      setEndDate(formatDateForInput(company.subscription_end_at));
    }
  }, [isOpen, company]);

  const handlePlanChange = (newPlan: string) => {
    setPlanType(newPlan);
    
    // Auto calcular la fecha de término basada en la fecha de inicio o en "hoy"
    const startDate = new Date(company.subscription_start_at || new Date().toISOString());
    const newEndDate = new Date(startDate);

    switch (newPlan) {
      case 'prueba': newEndDate.setDate(startDate.getDate() + 7); break; // 7 días de prueba default
      case 'mensual': newEndDate.setMonth(startDate.getMonth() + 1); break;
      case 'bimestral': newEndDate.setMonth(startDate.getMonth() + 2); break;
      case 'trimestral': newEndDate.setMonth(startDate.getMonth() + 3); break;
      case 'semestral': newEndDate.setMonth(startDate.getMonth() + 6); break;
      case 'anual': newEndDate.setFullYear(startDate.getFullYear() + 1); break;
    }
    setEndDate(newEndDate.toISOString().split('T')[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const data = {
      plan_type: planType,
      status: status,
      subscription_start_at: company.subscription_start_at || new Date().toISOString(),
      subscription_end_at: new Date(endDate).toISOString()
    };

    const res = await updateTenantSubscription(company.id, data);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success('Cliente actualizado correctamente');
      onClose();
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="panel w-full max-w-lg border border-black-light dark:border-dark-light rounded-2xl bg-white dark:bg-dark p-0 shadow-xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        
        <div className="flex items-center justify-between p-6 border-b border-black-light dark:border-dark-light">
          <h2 className="text-xl font-bold text-black dark:text-white">Gestionar Cliente: {company.name}</h2>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-black dark:hover:text-white rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Plan y Estado */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="text-sm font-semibold text-black dark:text-white mb-2 block">Tipo de Plan</label>
              <CustomSelect 
                value={{ value: planType, label: planType === 'prueba' ? 'Periodo de Prueba' : planType.charAt(0).toUpperCase() + planType.slice(1) }}
                onChange={(option: any) => handlePlanChange(option.value)}
                options={[
                  { value: 'prueba', label: 'Periodo de Prueba' },
                  { value: 'mensual', label: 'Mensual' },
                  { value: 'bimestral', label: 'Bimestral' },
                  { value: 'trimestral', label: 'Trimestral' },
                  { value: 'semestral', label: 'Semestral' },
                  { value: 'anual', label: 'Anual' }
                ]}
                isSearchable={false}
              />
            </div>
            
            <div>
              <label className="text-sm font-semibold text-black dark:text-white mb-2 block">Estado del Servicio</label>
              <CustomSelect 
                value={{ value: status, label: status === 'activa' ? 'Activa (Conectado)' : status === 'suspendida' ? 'Suspendida (Bloqueado)' : 'Cancelada' }}
                onChange={(option: any) => setStatus(option.value)}
                options={[
                  { value: 'activa', label: 'Activa (Conectado)' },
                  { value: 'suspendida', label: 'Suspendida (Bloqueado)' },
                  { value: 'cancelada', label: 'Cancelada' }
                ]}
                isSearchable={false}
              />
            </div>
          </div>

          {/* Fechas */}
          <div>
            <label className="text-sm font-semibold text-black dark:text-white mb-2 block">Fecha de Vencimiento</label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 z-10" size={18} />
              <CustomDatePicker
                value={endDate}
                onChangeDate={setEndDate}
                placeholder="Seleccionar fecha"
                className="form-input pl-11 w-full rounded-xl border-black-light dark:border-dark-light focus:border-primary focus:ring-primary shadow-sm bg-zinc-50 dark:bg-zinc-900/50"
              />
            </div>
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">Al vencer esta fecha, el cliente será desconectado de WhatsApp automáticamente.</p>
          </div>

          {status !== 'activa' && (
            <div className="p-4 bg-danger/10 border border-danger/20 rounded-xl flex items-start gap-3">
              <AlertTriangle className="text-danger mt-0.5 shrink-0" size={20} />
              <p className="text-sm text-danger leading-relaxed">
                Al guardar con estado <strong className="font-bold">{status}</strong>, el bot de WhatsApp del cliente se detendrá inmediatamente y no podrá reconectarlo.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-black-light dark:border-dark-light">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="btn btn-outline-danger rounded-xl px-6"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary rounded-xl px-6 shadow-md hover:shadow-lg transition-all flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Settings size={18} />}
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
