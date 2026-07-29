'use client';

import { useState, useMemo } from 'react';
import { purgeDemoTenants, updateDemoLeadStatus } from './actions';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import {
  Trash2,
  Building,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Loader2,
  X,
} from 'lucide-react';
import { evaluateTenantAccess } from '@/domain/subscriptions/evaluate-tenant-access';
import type { ExtendedCompany } from './RealClientsView';
import {
  DemoMessageTemplatesEditor,
  type DemoMessageTemplate,
} from './DemoMessageTemplatesEditor';

interface DemoAccountsViewProps {
  companies: ExtendedCompany[];
  messageTemplates: DemoMessageTemplate[];
}

type FilterState = 'todas' | 'activas' | 'vencidas';
const PAGE_SIZE = 25;

export function DemoAccountsView({ companies, messageTemplates }: DemoAccountsViewProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterState>('todas');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [updatingLeadId, setUpdatingLeadId] = useState<string | null>(null);

  const demoCompanies = useMemo(() => companies.filter((c) => c.is_demo === true), [companies]);

  const filteredCompanies = useMemo(() => {
    return demoCompanies.filter((c) => {
      // 1. Search term match
      const q = search.trim().toLowerCase();
      const nameMatch = c.name.toLowerCase().includes(q);
      const ownerMatch = c.profiles?.[0]?.full_name?.toLowerCase().includes(q) ?? false;
      const emailMatch = c.owner_email?.toLowerCase().includes(q) ?? false;
      const phoneMatch = c.demo_lead?.phone.includes(q) ?? false;
      const industryMatch = c.demo_lead?.industry.toLowerCase().includes(q) ?? false;
      const matchesSearch =
        !q || nameMatch || ownerMatch || emailMatch || phoneMatch || industryMatch;

      if (!matchesSearch) return false;

      // 2. Status filter match
      const access = evaluateTenantAccess(c);
      if (filter === 'activas') return access.allowed;
      if (filter === 'vencidas') return access.reason === 'expired';
      return true;
    });
  }, [demoCompanies, search, filter]);

  const totalPages = Math.max(1, Math.ceil(filteredCompanies.length / PAGE_SIZE));
  const paginatedCompanies = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredCompanies.slice(start, start + PAGE_SIZE);
  }, [filteredCompanies, currentPage]);

  const visibleIds = useMemo(() => paginatedCompanies.map((c) => c.id), [paginatedCompanies]);

  const isAllVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

  const toggleSelectAllVisible = () => {
    if (isAllVisibleSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const selectedCompanies = useMemo(() => {
    return demoCompanies.filter((c) => selectedIds.includes(c.id));
  }, [demoCompanies, selectedIds]);

  const formatDate = (isoStr: string | null) => {
    if (!isoStr) return '-';
    const d = new Date(isoStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatPhone = (phone: string | null | undefined) => {
    if (!phone) return '-';
    const digits = phone.replace(/\D/g, '');
    if (digits.length !== 11 || !digits.startsWith('51')) return phone;
    return `+51 ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  };

  const handleConfirmPurge = async () => {
    if (selectedIds.length === 0) return;
    setIsDeleting(true);

    try {
      const res = await purgeDemoTenants({ companyIds: selectedIds });

      if (res?.error) {
        toast.error(res.error, { duration: 5000 });
      } else if (res?.success) {
        const purgedCount = res.databasePurged?.count ?? selectedIds.length;
        toast.success(
          `Se eliminaron ${purgedCount} cuentas demo transaccionalmente de la base de datos.`,
          { duration: 4000 },
        );

        if (res.authCleanupErrors && res.authCleanupErrors.length > 0) {
          toast.error(`Incidencias Auth (${res.authCleanupErrors.length})`, { duration: 6000 });
        }
        if (res.evolutionCleanupErrors && res.evolutionCleanupErrors.length > 0) {
          toast.error(`Incidencias Evolution (${res.evolutionCleanupErrors.length})`, {
            duration: 6000,
          });
        }
        if (res.storageCleanupErrors && res.storageCleanupErrors.length > 0) {
          toast.error(`Incidencias Storage (${res.storageCleanupErrors.length})`, {
            duration: 6000,
          });
        }

        setSelectedIds([]);
        setIsModalOpen(false);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar cuentas demo');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLeadStatusChange = async (
    companyId: string,
    status: 'demo' | 'client' | 'declined',
  ) => {
    setUpdatingLeadId(companyId);
    try {
      const result = await updateDemoLeadStatus(companyId, status);
      if (result?.error) {
        toast.error(result.error);
        return;
      }

      toast.success(
        status === 'client'
          ? 'Lead marcado como cliente. El mensaje del quinto día fue cancelado.'
          : status === 'declined'
            ? 'Lead descartado. El seguimiento automático fue cancelado.'
            : 'Lead devuelto a estado demo.',
      );
      router.refresh();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'No se pudo actualizar el estado');
    } finally {
      setUpdatingLeadId(null);
    }
  };

  return (
    <div className="space-y-4">
      <DemoMessageTemplatesEditor templates={messageTemplates} />

      {/* Search, Filter Pills & Counter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar por empresa, contacto, teléfono o rubro..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/60 p-1 rounded-xl w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                setFilter('todas');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                filter === 'todas'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              Todas ({demoCompanies.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setFilter('activas');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                filter === 'activas'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              Activas
            </button>
            <button
              type="button"
              onClick={() => {
                setFilter('vencidas');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                filter === 'vencidas'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              Vencidas
            </button>
          </div>
        </div>

        <div className="text-xs text-zinc-500">
          Mostrando {filteredCompanies.length} de {demoCompanies.length} cuentas demo
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-danger/10 border border-danger/20 text-danger animate-in fade-in duration-200">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <AlertTriangle className="size-4 shrink-0" />
            <span>{selectedIds.length} cuentas demo seleccionadas</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 text-xs font-medium rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/50 dark:hover:bg-zinc-800"
            >
              Desmarcar
            </button>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-danger hover:bg-danger/90 rounded-lg shadow-sm transition-colors"
            >
              <Trash2 className="size-3.5" />
              Eliminar demos seleccionadas
            </button>
          </div>
        </div>
      )}

      {filteredCompanies.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
          <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-full mb-3">
            <Building className="size-6 text-zinc-400" />
          </div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            No hay cuentas demo
          </h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm">
            {search
              ? 'Intenta modificar el término de búsqueda o los filtros.'
              : 'No existen cuentas demo registradas en el sistema.'}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={isAllVisibleSelected}
                      onChange={toggleSelectAllVisible}
                      className="size-4 rounded border-zinc-300 text-primary focus:ring-primary/20"
                    />
                  </th>
                  <th className="py-3 px-4 font-semibold text-xs text-zinc-500">Empresa Demo</th>
                  <th className="py-3 px-4 font-semibold text-xs text-zinc-500">Propietario</th>
                  <th className="py-3 px-4 font-semibold text-xs text-zinc-500">Teléfono</th>
                  <th className="py-3 px-4 font-semibold text-xs text-zinc-500">Rubro</th>
                  <th className="py-3 px-4 font-semibold text-xs text-zinc-500">
                    Estado comercial
                  </th>
                  <th className="py-3 px-4 font-semibold text-xs text-zinc-500">Estado Efectivo</th>
                  <th className="py-3 px-4 font-semibold text-xs text-zinc-500">Registro</th>
                  <th className="py-3 px-4 font-semibold text-xs text-zinc-500">Vencimiento</th>
                  <th className="py-3 px-4 font-semibold text-xs text-zinc-500 text-right">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {paginatedCompanies.map((company) => {
                  const access = evaluateTenantAccess(company);
                  const isSelected = selectedIds.includes(company.id);

                  return (
                    <tr
                      key={company.id}
                      className={`group hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors ${
                        isSelected ? 'bg-amber-500/5 dark:bg-amber-500/10' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(company.id)}
                          className="size-4 rounded border-zinc-300 text-primary focus:ring-primary/20"
                        />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="size-9 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-sm shrink-0">
                            {company.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                              {company.name}
                            </span>
                            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                              DEMO
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-zinc-700 dark:text-zinc-300">
                        {company.demo_lead?.contact_name ||
                          company.profiles?.[0]?.full_name ||
                          'Sin contacto'}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono text-zinc-500 whitespace-nowrap">
                        {formatPhone(company.demo_lead?.phone)}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-zinc-600 dark:text-zinc-300">
                        {company.demo_lead?.industry || '-'}
                      </td>
                      <td className="py-3.5 px-4">
                        <select
                          value={company.demo_lead?.lead_status ?? 'demo'}
                          disabled={updatingLeadId === company.id}
                          onChange={(event) =>
                            handleLeadStatusChange(
                              company.id,
                              event.target.value as 'demo' | 'client' | 'declined',
                            )
                          }
                          aria-label={`Estado comercial de ${company.name}`}
                          className="min-h-10 rounded-lg border border-zinc-200 bg-white px-2.5 text-xs font-semibold text-zinc-700 outline-none transition-colors focus:border-primary disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                        >
                          <option value="demo">Demo</option>
                          <option value="client">Cliente</option>
                          <option value="declined">Descartado</option>
                        </select>
                      </td>
                      <td className="py-3.5 px-4">
                        {access.allowed ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200">
                            Activa
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border border-rose-200">
                            Vencida / Inactiva
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-zinc-500 font-mono text-xs">
                        {formatDate(company.created_at)}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-zinc-500">
                        {formatDate(company.subscription_end_at)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedIds([company.id]);
                            setIsModalOpen(true);
                          }}
                          className="p-1.5 text-zinc-400 hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
                          title={`Eliminar demo ${company.name}`}
                        >
                          <Trash2 size={16} />
                        </button>
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

      {/* Custom Confirmation Modal for Demo Purge */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-danger/10 text-danger rounded-xl">
                  <AlertTriangle className="size-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    Confirmar eliminación permanente
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Esta acción eliminará de forma irreversible las empresas demo seleccionadas.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={isDeleting}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-lg"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-danger/5 border border-danger/15 space-y-2">
              <p className="text-xs font-semibold text-danger">
                Se eliminarán permanentemente {selectedCompanies.length} cuentas demo y todos sus
                datos:
              </p>
              <div className="max-h-36 overflow-y-auto space-y-1 text-xs text-zinc-700 dark:text-zinc-300 font-mono pr-2">
                {selectedCompanies.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between py-1 border-b border-zinc-200/50 dark:border-zinc-800/50"
                  >
                    <span className="font-semibold">{c.name}</span>
                    <span className="text-xs text-zinc-400">{c.owner_email || 'sin correo'}</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs text-zinc-500">
              Se desvincularán las instancias WhatsApp activas y se eliminarán los usuarios Auth
              asociados mediante Supabase Admin API. Los clientes reales no se verán afectados.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmPurge}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-danger hover:bg-danger/90 rounded-xl shadow-sm transition-colors disabled:opacity-50"
              >
                {isDeleting && <Loader2 className="size-3.5 animate-spin" />}
                {isDeleting ? 'Eliminando demos...' : 'Sí, eliminar permanentemente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
