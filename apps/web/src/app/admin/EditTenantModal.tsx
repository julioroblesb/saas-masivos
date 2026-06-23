'use client';

import { useState, useEffect } from 'react';
import { updateTenantSubscription } from './actions';
import { toast } from 'react-hot-toast';
import { X, Calendar, Settings, AlertTriangle } from 'lucide-react';
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
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="panel w-full max-w-lg overflow-hidden border-0 p-0">
        
        <div className="flex items-center justify-between p-5 dark:border-[#191e3a]">
          <h2 className="text-lg font-bold">Gestionar Cliente: {company.name}</h2>
          <button onClick={onClose} className="p-2 text-white-dark hover:text-dark rounded-md transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          
          {/* Plan y Estado */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-white-dark mb-2 block">Tipo de Plan</label>
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
              <label className="text-white-dark mb-2 block">Estado del Servicio</label>
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
            <label className="text-white-dark mb-2 block">Fecha de Vencimiento</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-white-dark z-10" size={18} />
              <CustomDatePicker
                value={endDate}
                onChangeDate={setEndDate}
                placeholder="Seleccionar fecha"
                className="form-input pl-10 w-full"
              />
            </div>
            <p className="mt-1 text-xs text-white-dark">Al vencer esta fecha, el cliente será desconectado de WhatsApp automáticamente.</p>
          </div>

          {status !== 'activa' && (
            <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg flex items-start gap-3">
              <AlertTriangle className="text-danger mt-0.5" size={20} />
              <p className="text-sm text-danger">
                Al guardar con estado <strong>{status}</strong>, el bot de WhatsApp del cliente se detendrá inmediatamente y no podrá reconectarlo.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-5 mt-5 border-t border-[#e0e6ed] dark:border-[#1b2e4b]">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="btn btn-outline-danger"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary flex items-center gap-2"
            >
              <Settings size={18} />
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
