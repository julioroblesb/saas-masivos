'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Plus, X, Coins } from 'lucide-react';
import { updatePaymentMethodsAction } from './actions';

export function PaymentMethodsConfig({ initialMethods }: { initialMethods: string[] }) {
  const [methods, setMethods] = useState<string[]>(initialMethods);
  const [newMethod, setNewMethod] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleAdd = () => {
    const trimmed = newMethod.trim();
    if (!trimmed) return;
    if (methods.map(m => m.toLowerCase()).includes(trimmed.toLowerCase())) {
      toast.error('Este método de pago ya existe');
      return;
    }
    setMethods([...methods, trimmed]);
    setNewMethod('');
  };

  const handleRemove = (index: number) => {
    setMethods(methods.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setIsSaving(true);
    const result = await updatePaymentMethodsAction(methods);
    if (result.error) {
      toast.error('Error al guardar los métodos de pago');
    } else {
      toast.success('Métodos de pago actualizados');
    }
    setIsSaving(false);
  };

  return (
    <div className="bg-white dark:bg-dark border border-black-light dark:border-dark-light rounded-3xl p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
          <Coins className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-black dark:text-white">Métodos de Pago</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Configura los métodos de pago aceptados en tu negocio.</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex gap-2">
          <input
            type="text"
            className="form-input flex-1 rounded-xl border-black-light dark:border-dark-light focus:border-primary focus:ring-primary shadow-sm bg-white dark:bg-dark"
            placeholder="Ej: Efectivo, Yape, Zelle..."
            value={newMethod}
            onChange={(e) => setNewMethod(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <button
            onClick={handleAdd}
            className="btn btn-primary rounded-xl px-4 gap-2 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> Agregar
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          {methods.length === 0 ? (
            <div className="text-sm text-zinc-500 italic">No hay métodos de pago configurados. Se usarán los valores por defecto.</div>
          ) : (
            methods.map((method, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 rounded-lg border border-black-light dark:border-dark-light">
                <span className="text-sm font-medium text-black dark:text-white capitalize">{method}</span>
                <button
                  onClick={() => handleRemove(idx)}
                  className="text-zinc-400 hover:text-danger transition-colors p-0.5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="pt-6 mt-6 border-t border-black-light dark:border-dark-light flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="btn btn-primary rounded-xl px-6"
          >
            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}
