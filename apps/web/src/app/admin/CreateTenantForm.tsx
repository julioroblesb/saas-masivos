'use client';

import { useState } from 'react';
import { createTenant } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="companyName">Nombre de Empresa</Label>
          <Input id="companyName" name="companyName" placeholder="Ej. Zapatería López" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fullName">Nombre del Dueño (Opcional)</Label>
          <Input id="fullName" name="fullName" placeholder="Ej. Juan Pérez" />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="email">Correo de Acceso (Usuario)</Label>
        <Input id="email" name="email" type="email" placeholder="juan@zapateria.com" required />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="password">Contraseña Inicial</Label>
        <Input id="password" name="password" type="password" placeholder="Mínimo 6 caracteres" required minLength={6} />
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Creando Cliente...' : 'Crear Cuenta de Cliente'}
      </Button>
    </form>
  );
}
