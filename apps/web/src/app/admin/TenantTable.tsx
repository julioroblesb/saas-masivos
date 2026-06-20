'use client';

import { useState, useEffect } from 'react';
import { EditTenantModal } from './EditTenantModal';
import { deleteTenant } from './actions';
import { toast } from 'react-hot-toast';
import { Edit2, Trash2 } from 'lucide-react';

export function TenantTable({ companies }: { companies: any[] }) {
  const [editingCompany, setEditingCompany] = useState<any | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const formatDate = (isoStr: string) => {
    if (!isoStr) return '-';
    const d = new Date(isoStr);
    // Formato estricto DD/MM/YYYY
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
      <div className="p-8 text-center text-zinc-500">
        Aún no tienes ningún cliente registrado.
      </div>
    );
  }

  if (!isMounted) return null;

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3 font-medium">Empresa</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Registro</th>
              <th className="px-4 py-3 font-medium">Vencimiento</th>
              <th className="px-4 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {companies.map((company) => (
              <tr key={company.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                <td className="px-4 py-4 font-medium text-zinc-900 dark:text-zinc-100">
                  {company.name}
                  <div className="text-xs text-zinc-500 font-normal mt-1">{company.profiles?.[0]?.full_name || 'Sin dueño'}</div>
                </td>
                <td className="px-4 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    company.status === 'activa' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 
                    company.status === 'suspendida' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {company.status.toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-4 capitalize text-zinc-600 dark:text-zinc-300">
                  {company.plan_type || 'prueba'}
                </td>
                <td className="px-4 py-4 text-zinc-500 font-mono text-xs">
                  {formatDate(company.created_at)}
                </td>
                <td className="px-4 py-4 font-mono text-xs">
                  {company.subscription_end_at ? (
                    new Date(company.subscription_end_at) < new Date() ? (
                      <span className="text-red-500 font-bold">{formatDate(company.subscription_end_at)} (Vencido)</span>
                    ) : (
                      <span className="text-zinc-500">{formatDate(company.subscription_end_at)}</span>
                    )
                  ) : (
                    '-'
                  )}
                </td>
                <td className="px-4 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => setEditingCompany(company)}
                      className="p-1.5 text-zinc-500 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-500/10 rounded transition-colors"
                      title="Editar Suscripción"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(company.id, company.name)}
                      className="p-1.5 text-zinc-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-colors"
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
