'use client';

import { useState, useEffect } from 'react';
import { EditTenantModal } from './EditTenantModal';
import { deleteTenant } from './actions';
import { toast } from 'react-hot-toast';
import { Edit2, Trash2, Building } from 'lucide-react';

export function TenantTable({ companies }: { companies: any[] }) {
  const [editingCompany, setEditingCompany] = useState<any | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const formatDate = (isoStr: string) => {
    if (!isoStr) return '-';
    const d = new Date(isoStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Estás completamente seguro de que deseas ELIMINAR el cliente "${name}" y TODOS sus datos (campañas, contactos, usuarios)? Esta acción NO se puede deshacer.`)) {
      return;
    }
    
    toast.loading('Eliminando cliente...', { id: 'delete' });
    const res = await deleteTenant(id);
    if (res?.error) {
      toast.error(res.error, { id: 'delete' });
    } else {
      toast.success('Cliente eliminado exitosamente', { id: 'delete' });
    }
  };

  if (!companies || companies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="p-4 bg-zinc-100 dark:bg-zinc-800 rounded-full mb-4">
          <Building className="w-8 h-8 text-zinc-400" />
        </div>
        <h3 className="text-lg font-semibold text-black dark:text-white mb-2">No hay empresas registradas</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm">Aún no has registrado ningún tenant. Haz clic en "Añadir Nuevo Cliente" para comenzar.</p>
      </div>
    );
  }

  if (!isMounted) return null;

  return (
    <>
      <div className="overflow-x-auto -mx-6 px-6">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-black-light dark:border-dark-light">
              <th className="py-4 px-4 font-semibold text-sm text-zinc-500 dark:text-zinc-400">Empresa</th>
              <th className="py-4 px-4 font-semibold text-sm text-zinc-500 dark:text-zinc-400">Estado</th>
              <th className="py-4 px-4 font-semibold text-sm text-zinc-500 dark:text-zinc-400">Plan</th>
              <th className="py-4 px-4 font-semibold text-sm text-zinc-500 dark:text-zinc-400">Registro</th>
              <th className="py-4 px-4 font-semibold text-sm text-zinc-500 dark:text-zinc-400">Vencimiento</th>
              <th className="py-4 px-4 font-semibold text-sm text-zinc-500 dark:text-zinc-400 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black-light dark:divide-dark-light">
            {companies.map((company) => (
              <tr key={company.id} className="group hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                      {company.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-black dark:text-white">{company.name}</div>
                      <div className="text-zinc-500 dark:text-zinc-400 text-xs mt-0.5">{company.profiles?.[0]?.full_name || 'Sin dueño'}</div>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                    company.status === 'activa' || company.status === 'active' ? 'bg-success/10 text-success border-success/20' : 
                    company.status === 'suspendida' ? 'bg-warning/10 text-warning border-warning/20' :
                    'bg-danger/10 text-danger border-danger/20'
                  }`}>
                    {company.status.toUpperCase()}
                  </span>
                </td>
                <td className="py-4 px-4 capitalize font-medium text-black dark:text-white text-sm">
                  {company.plan_type || 'prueba'}
                </td>
                <td className="py-4 px-4 text-zinc-500 dark:text-zinc-400 font-mono text-xs">
                  {formatDate(company.created_at)}
                </td>
                <td className="py-4 px-4 font-mono text-xs">
                  {company.subscription_end_at ? (
                    new Date(company.subscription_end_at) < new Date() ? (
                      <span className="text-danger font-semibold bg-danger/10 px-2 py-1 rounded-md">{formatDate(company.subscription_end_at)} (Vencido)</span>
                    ) : (
                      <span className="text-zinc-500 dark:text-zinc-400">{formatDate(company.subscription_end_at)}</span>
                    )
                  ) : (
                    <span className="text-zinc-400">-</span>
                  )}
                </td>
                <td className="py-4 px-4 text-right">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => setEditingCompany(company)}
                      className="p-2 text-zinc-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                      title="Editar Suscripción"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(company.id, company.name)}
                      className="p-2 text-zinc-500 hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
                      title="Eliminar Cliente"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingCompany && (
        <EditTenantModal
          company={editingCompany}
          isOpen={true}
          onClose={() => setEditingCompany(null)}
        />
      )}
    </>
  );
}
