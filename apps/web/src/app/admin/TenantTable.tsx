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
      <div className="p-8 text-center text-white-dark">
        Aún no tienes ningún cliente registrado.
      </div>
    );
  }

  if (!isMounted) return null;

  return (
    <>
      <div className="table-responsive">
        <table className="table-hover">
          <thead>
            <tr>
              <th>Empresa</th>
              <th>Estado</th>
              <th>Plan</th>
              <th>Registro</th>
              <th>Vencimiento</th>
              <th className="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((company) => (
              <tr key={company.id}>
                <td>
                  <div className="font-semibold text-dark dark:text-white-light">{company.name}</div>
                  <div className="text-white-dark text-xs mt-1">{company.profiles?.[0]?.full_name || 'Sin dueño'}</div>
                </td>
                <td>
                  <span className={`badge ${
                    company.status === 'activa' ? 'badge-outline-success' : 
                    company.status === 'suspendida' ? 'badge-outline-warning' :
                    'badge-outline-danger'
                  }`}>
                    {company.status.toUpperCase()}
                  </span>
                </td>
                <td className="capitalize text-dark dark:text-white-light">
                  {company.plan_type || 'prueba'}
                </td>
                <td className="text-white-dark font-mono text-xs">
                  {formatDate(company.created_at)}
                </td>
                <td className="font-mono text-xs">
                  {company.subscription_end_at ? (
                    new Date(company.subscription_end_at) < new Date() ? (
                      <span className="text-danger font-bold">{formatDate(company.subscription_end_at)} (Vencido)</span>
                    ) : (
                      <span className="text-white-dark">{formatDate(company.subscription_end_at)}</span>
                    )
                  ) : (
                    '-'
                  )}
                </td>
                <td className="text-right">
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => setEditingCompany(company)}
                      className="p-1.5 text-primary hover:text-primary/80 transition-colors"
                      title="Editar Suscripción"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(company.id, company.name)}
                      className="p-1.5 text-danger hover:text-danger/80 transition-colors"
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
