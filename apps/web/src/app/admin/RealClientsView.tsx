'use client';

import { useState, useMemo } from 'react';
import { EditTenantModal } from './EditTenantModal';
import { deleteTenant } from './actions';
import { toast } from 'react-hot-toast';
import { Edit2, Trash2, Building, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { evaluateTenantAccess } from '@/domain/subscriptions/evaluate-tenant-access';
import type { Tables } from '@/types/database.generated';

export type ExtendedCompany = Tables<'companies'> & {
  profiles: Array<{ id: string; full_name: string | null }>;
  owner_email?: string | null;
  wa_session?: {
    status: string;
    phone_number: string | null;
    evolution_instance_name: string | null;
  } | null;
  demo_lead?: {
    contact_name: string;
    phone: string;
    industry: string;
    whatsapp_consent: boolean;
    created_at: string;
  } | null;
};

interface RealClientsViewProps {
  companies: ExtendedCompany[];
}

const PAGE_SIZE = 25;

export function RealClientsView({ companies }: RealClientsViewProps) {
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingCompany, setEditingCompany] = useState<ExtendedCompany | null>(null);

  const realCompanies = useMemo(() => companies.filter((c) => c.is_demo !== true), [companies]);

  const filteredCompanies = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return realCompanies;
    return realCompanies.filter((c) => {
      const nameMatch = c.name.toLowerCase().includes(q);
      const ownerMatch = c.profiles?.[0]?.full_name?.toLowerCase().includes(q) ?? false;
      const emailMatch = c.owner_email?.toLowerCase().includes(q) ?? false;
      return nameMatch || ownerMatch || emailMatch;
    });
  }, [realCompanies, search]);

  const totalPages = Math.max(1, Math.ceil(filteredCompanies.length / PAGE_SIZE));
  const paginatedCompanies = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredCompanies.slice(start, start + PAGE_SIZE);
  }, [filteredCompanies, currentPage]);

  const formatDate = (isoStr: string | null) => {
    if (!isoStr) return '-';
    const d = new Date(isoStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const getEffectiveBadge = (company: ExtendedCompany) => {
    const access = evaluateTenantAccess(company);
    if (access.reason === 'cancelled')
      return { label: 'CANCELADA', className: 'bg-danger/10 text-danger border-danger/20' };
    if (access.reason === 'suspended')
      return { label: 'SUSPENDIDA', className: 'bg-warning/10 text-warning border-warning/20' };
    if (access.reason === 'subscription_not_configured')
      return {
        label: 'SIN CONFIGURAR',
        className: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200',
      };
    if (access.reason === 'expired')
      return { label: 'VENCIDA', className: 'bg-danger/10 text-danger border-danger/20' };
    if (access.allowed)
      return { label: 'ACTIVA', className: 'bg-success/10 text-success border-success/20' };
    return { label: 'INVÁLIDA', className: 'bg-zinc-100 text-zinc-500 border-zinc-200' };
  };

  const getWaBadge = (company: ExtendedCompany) => {
    const status = company.wa_session?.status;
    if (status === 'conectado') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200">
          <span className="size-1.5 rounded-full bg-green-600 animate-pulse" />
          Conectado
        </span>
      );
    }
    if (status === 'esperando_qr' || status === 'generando_qr') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200">
          <span className="size-1.5 rounded-full bg-amber-500" />
          Pendiente
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200">
        Desconectado
      </span>
    );
  };

  const handleCancelAccess = async (id: string, name: string) => {
    if (
      !confirm(
        `¿Confirmas cancelar el acceso del cliente real "${name}"? Sus datos e historial se conservarán intactos.`,
      )
    ) {
      return;
    }

    toast.loading('Cancelando acceso...', { id: 'cancel-access' });
    const res = await deleteTenant(id);
    if (res?.error) {
      toast.error(res.error, { id: 'cancel-access' });
    } else {
      toast.success(`Acceso de "${name}" cancelado correctamente`, { id: 'cancel-access' });
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar por empresa, dueño o correo..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="text-xs text-zinc-500">
          Mostrando {filteredCompanies.length} clientes reales
        </div>
      </div>

      {filteredCompanies.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
          <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-full mb-3">
            <Building className="size-6 text-zinc-400" />
          </div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            No se encontraron clientes reales
          </h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm">
            {search
              ? 'Intenta modificar el término de búsqueda.'
              : 'No hay clientes reales registrados.'}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
                  <th className="py-3 px-4 font-semibold text-xs text-zinc-500">Empresa</th>
                  <th className="py-3 px-4 font-semibold text-xs text-zinc-500">Propietario</th>
                  <th className="py-3 px-4 font-semibold text-xs text-zinc-500">Correo</th>
                  <th className="py-3 px-4 font-semibold text-xs text-zinc-500">Plan</th>
                  <th className="py-3 px-4 font-semibold text-xs text-zinc-500">Estado Efectivo</th>
                  <th className="py-3 px-4 font-semibold text-xs text-zinc-500">WhatsApp</th>
                  <th className="py-3 px-4 font-semibold text-xs text-zinc-500">Registro</th>
                  <th className="py-3 px-4 font-semibold text-xs text-zinc-500">Vencimiento</th>
                  <th className="py-3 px-4 font-semibold text-xs text-zinc-500 text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {paginatedCompanies.map((company) => {
                  const badge = getEffectiveBadge(company);
                  const isExpired =
                    company.subscription_end_at &&
                    new Date(company.subscription_end_at) < new Date();

                  return (
                    <tr
                      key={company.id}
                      className="group hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                            {company.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {company.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-zinc-700 dark:text-zinc-300">
                        {company.profiles?.[0]?.full_name || 'Sin dueño'}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono text-zinc-500">
                        {company.owner_email || '-'}
                      </td>
                      <td className="py-3.5 px-4 capitalize text-xs font-medium text-zinc-800 dark:text-zinc-200">
                        {company.plan_type || 'prueba'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">{getWaBadge(company)}</td>
                      <td className="py-3.5 px-4 text-zinc-500 font-mono text-xs">
                        {formatDate(company.created_at)}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs">
                        {company.subscription_end_at ? (
                          isExpired ? (
                            <span className="text-danger font-semibold bg-danger/10 px-2 py-0.5 rounded-md">
                              {formatDate(company.subscription_end_at)} (Vencido)
                            </span>
                          ) : (
                            <span className="text-zinc-500">
                              {formatDate(company.subscription_end_at)}
                            </span>
                          )
                        ) : (
                          <span className="text-zinc-400">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingCompany(company)}
                            className="p-1.5 text-zinc-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                            title={`Editar suscripción de ${company.name}`}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCancelAccess(company.id, company.name)}
                            className="p-1.5 text-zinc-500 hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
                            title={`Cancelar acceso de ${company.name}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-zinc-500">
                Página {currentPage} de {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-2 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-2 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {editingCompany && (
        <EditTenantModal
          key={editingCompany.id}
          company={editingCompany}
          isOpen={true}
          onClose={() => setEditingCompany(null)}
        />
      )}
    </div>
  );
}
