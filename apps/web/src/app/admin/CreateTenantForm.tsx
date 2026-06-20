'use client';

import { useState } from 'react';
import { createTenant } from './actions';
import { toast } from 'react-hot-toast';

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
    <form action={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="companyName" className="text-dark dark:text-white-dark text-sm font-medium">Nombre de Empresa</label>
          <input type="text" id="companyName" name="companyName" placeholder="Ej. Zapatería López" required className="form-input rounded-xl border border-white-light dark:border-[#1b2e4b] bg-white dark:bg-[#191e3a] focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" />
        </div>
        <div className="space-y-2">
          <label htmlFor="fullName" className="text-dark dark:text-white-dark text-sm font-medium">Nombre del Dueño (Opcional)</label>
          <input type="text" id="fullName" name="fullName" placeholder="Ej. Juan Pérez" className="form-input rounded-xl border border-white-light dark:border-[#1b2e4b] bg-white dark:bg-[#191e3a] focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" />
        </div>
      </div>
      
      <div className="space-y-2">
        <label htmlFor="email" className="text-dark dark:text-white-dark text-sm font-medium">Correo de Acceso (Usuario)</label>
        <input id="email" name="email" type="email" placeholder="juan@zapateria.com" required className="form-input rounded-xl border border-white-light dark:border-[#1b2e4b] bg-white dark:bg-[#191e3a] focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" />
      </div>
      
      <div className="space-y-2">
        <label htmlFor="password" className="text-dark dark:text-white-dark text-sm font-medium">Contraseña Inicial</label>
        <input id="password" name="password" type="password" placeholder="Mínimo 6 caracteres" required minLength={6} className="form-input rounded-xl border border-white-light dark:border-[#1b2e4b] bg-white dark:bg-[#191e3a] focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" />
      </div>

      <button type="submit" disabled={loading} className="btn btn-primary w-full">
        {loading ? 'Creando Cliente...' : 'Crear Cuenta de Cliente'}
      </button>
    </form>
  );
}
