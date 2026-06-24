'use client';

import { useState } from 'react';
import { createTenant } from './actions';
import { toast } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

export function CreateTenantForm() {
  const [loading, setLoading] = useState(false);

  async function onSubmit(formData: FormData) {
    setLoading(true);
    const result = await createTenant(formData);
    
    if (result?.error) {
      toast.error(result.error);
    } else if (result?.success) {
      toast.success('Cliente creado exitosamente');
      // Limpiar formulario si quisieramos, pero en un caso simple recarga igual
    }
    setLoading(false);
  }

  return (
    <form action={onSubmit} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="space-y-2">
          <label htmlFor="companyName" className="text-sm font-semibold text-black dark:text-white">Nombre de Empresa</label>
          <input type="text" id="companyName" name="companyName" placeholder="Ej. Zapatería López" required className="form-input w-full rounded-xl border-black-light dark:border-dark-light bg-zinc-50 dark:bg-zinc-900/50 focus:border-primary focus:ring-primary shadow-sm transition-all" />
        </div>
        <div className="space-y-2">
          <label htmlFor="fullName" className="text-sm font-semibold text-black dark:text-white">Nombre del Dueño <span className="text-zinc-400 font-normal">(Opcional)</span></label>
          <input type="text" id="fullName" name="fullName" placeholder="Ej. Juan Pérez" className="form-input w-full rounded-xl border-black-light dark:border-dark-light bg-zinc-50 dark:bg-zinc-900/50 focus:border-primary focus:ring-primary shadow-sm transition-all" />
        </div>
      </div>
      
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-semibold text-black dark:text-white">Correo de Acceso (Usuario)</label>
        <input id="email" name="email" type="email" placeholder="juan@zapateria.com" required className="form-input w-full rounded-xl border-black-light dark:border-dark-light bg-zinc-50 dark:bg-zinc-900/50 focus:border-primary focus:ring-primary shadow-sm transition-all" />
      </div>
      
      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-semibold text-black dark:text-white">Contraseña Inicial</label>
        <input id="password" name="password" type="password" placeholder="Mínimo 6 caracteres" required minLength={6} className="form-input w-full rounded-xl border-black-light dark:border-dark-light bg-zinc-50 dark:bg-zinc-900/50 focus:border-primary focus:ring-primary shadow-sm transition-all" />
      </div>

      <button type="submit" disabled={loading} className="btn btn-primary w-full rounded-xl py-3 shadow-md hover:shadow-lg transition-all gap-2 mt-4">
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
        {loading ? 'Creando Cliente...' : 'Crear Cuenta de Cliente'}
      </button>
    </form>
  );
}
