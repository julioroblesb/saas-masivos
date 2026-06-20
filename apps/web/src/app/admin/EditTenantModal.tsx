'use client';

import { useState, useEffect } from 'react';
import { updateTenantSubscription } from './actions';
import { toast } from 'react-hot-toast';
import { X, Calendar, Settings, AlertTriangle } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-800 w-full max-w-lg overflow-hidden">
        
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Gestionar Cliente: {company.name}</h2>
          <button onClick={onClose} className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-md transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Plan y Estado */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Tipo de Plan</label>
              <select 
                value={planType} 
                onChange={(e) => handlePlanChange(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="prueba">Periodo de Prueba</option>
                <option value="mensual">Mensual</option>
                <option value="bimestral">Bimestral</option>
                <option value="trimestral">Trimestral</option>
                <option value="semestral">Semestral</option>
                <option value="anual">Anual</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Estado del Servicio</label>
              <select 
                value={status} 
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="activa">Activa (Conectado)</option>
                <option value="suspendida">Suspendida (Bloqueado)</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>
          </div>

          {/* Fechas */}
          <div>
            <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Fecha de Vencimiento</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="w-full pl-10 pr-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <p className="mt-1 text-xs text-zinc-500">Al vencer esta fecha, el cliente será desconectado de WhatsApp automáticamente.</p>
          </div>

          {status !== 'activa' && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
              <AlertTriangle className="text-red-500 mt-0.5" size={20} />
              <p className="text-sm text-red-800 dark:text-red-300">
                Al guardar con estado <strong>{status}</strong>, el bot de WhatsApp del cliente se detendrá inmediatamente y no podrá reconectarlo.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
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
