'use client';

import { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, Smartphone } from 'lucide-react';
import type { ExtendedCompany } from './RealClientsView';
import type { Tables } from '@/types/database.generated';

export type ExtendedWaSession = Tables<'wa_sessions'> & {
  company_name?: string;
  owner_name?: string;
  owner_email?: string | null;
  is_demo?: boolean;
};

interface WhatsappOversightViewProps {
  sessions: ExtendedWaSession[];
  companies: ExtendedCompany[];
}

type WaFilter = 'todos' | 'conectado' | 'esperando_qr' | 'generando_qr' | 'desconectado';
const PAGE_SIZE = 25;

function maskInstanceName(name: string | null | undefined): string {
  if (!name) return '-';
  if (name.length <= 16) return name;
  const prefix = name.slice(0, 10);
  const suffix = name.slice(-6);
  return `${prefix}…${suffix}`;
}

export function WhatsappOversightView({ sessions, companies }: WhatsappOversightViewProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<WaFilter>('todos');
  const [currentPage, setCurrentPage] = useState(1);

  // Map wa_sessions with company and owner details
  const fullSessions = useMemo(() => {
    const companyMap = new Map<string, ExtendedCompany>();
    companies.forEach((c) => companyMap.set(c.id, c));

    // Combine existing wa_sessions and companies without wa_session entry as disconnected
    const items: ExtendedWaSession[] = [];
    const mappedCompanyIds = new Set<string>();

    sessions.forEach((s) => {
      mappedCompanyIds.add(s.company_id);
      const company = companyMap.get(s.company_id);
      items.push({
        ...s,
        company_name: company?.name || 'Empresa eliminada',
        owner_name: company?.profiles?.[0]?.full_name || 'Sin dueño',
        owner_email: company?.owner_email || null,
        is_demo: company?.is_demo ?? false,
      });
    });

    // Add companies that don't have a wa_sessions row yet as disconnected items
    companies.forEach((c) => {
      if (!mappedCompanyIds.has(c.id)) {
        items.push({
          company_id: c.id,
          evolution_instance_name: `company_${c.id.replaceAll('-', '')}`,
          status: 'desconectado',
          phone_number: null,
          connection_started_at: null,
          updated_at: c.created_at,
          last_disconnect_reason: 'Sin sesión inicializada',
          bb_host: null,
          bb_project_id: null,
          consecutive_errors: 0,
          daily_reset_at: null,
          daily_sent_count: 0,
          last_connected_at: null,
          last_message_sent_at: null,
          next_allowed_send_at: null,
          company_name: c.name,
          owner_name: c.profiles?.[0]?.full_name || 'Sin dueño',
          owner_email: c.owner_email || null,
          is_demo: c.is_demo ?? false,
        });
      }
    });

    return items;
  }, [sessions, companies]);

  const filteredSessions = useMemo(() => {
    return fullSessions.filter((s) => {
      // 1. Search term
      const q = search.trim().toLowerCase();
      const compMatch = s.company_name?.toLowerCase().includes(q) ?? false;
      const ownerMatch = s.owner_name?.toLowerCase().includes(q) ?? false;
      const phoneMatch = s.phone_number?.toLowerCase().includes(q) ?? false;
      const instMatch = s.evolution_instance_name?.toLowerCase().includes(q) ?? false;
      const matchesSearch = !q || compMatch || ownerMatch || phoneMatch || instMatch;

      if (!matchesSearch) return false;

      // 2. Filter status
      if (filter === 'conectado') return s.status === 'conectado';
      if (filter === 'esperando_qr') return s.status === 'esperando_qr';
      if (filter === 'generando_qr') return s.status === 'generando_qr';
      if (filter === 'desconectado')
        return s.status === 'desconectado' || s.status === 'error_desconexion';
      return true;
    });
  }, [fullSessions, search, filter]);

  const totalPages = Math.max(1, Math.ceil(filteredSessions.length / PAGE_SIZE));
  const paginatedSessions = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredSessions.slice(start, start + PAGE_SIZE);
  }, [filteredSessions, currentPage]);

  const formatDate = (isoStr: string | null) => {
    if (!isoStr) return '-';
    const d = new Date(isoStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${mins}`;
  };

  const getStatusBadge = (status: string) => {
    if (status === 'conectado') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200">
          <span className="size-1.5 rounded-full bg-green-600 animate-pulse" />
          Conectado
        </span>
      );
    }
    if (status === 'esperando_qr') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200">
          <span className="size-1.5 rounded-full bg-amber-500" />
          Esperando QR
        </span>
      );
    }
    if (status === 'generando_qr') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200">
          <span className="size-1.5 rounded-full bg-blue-500 animate-spin" />
          Generando QR
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200">
        Desconectado
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar por empresa, número o instancia..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/60 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
            <button
              type="button"
              onClick={() => {
                setFilter('todos');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                filter === 'todos'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              Todos ({fullSessions.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setFilter('conectado');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                filter === 'conectado'
                  ? 'bg-white dark:bg-zinc-900 text-green-600 dark:text-green-400 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              Conectados
            </button>
            <button
              type="button"
              onClick={() => {
                setFilter('esperando_qr');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                filter === 'esperando_qr'
                  ? 'bg-white dark:bg-zinc-900 text-amber-600 dark:text-amber-400 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              Esperando QR
            </button>
            <button
              type="button"
              onClick={() => {
                setFilter('generando_qr');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                filter === 'generando_qr'
                  ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              Generando QR
            </button>
            <button
              type="button"
              onClick={() => {
                setFilter('desconectado');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                filter === 'desconectado'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              Desconectados
            </button>
          </div>
        </div>

        <div className="text-xs text-zinc-500">
          Mostrando {filteredSessions.length} sesiones WhatsApp
        </div>
      </div>

      {filteredSessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
          <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-full mb-3">
            <Smartphone className="size-6 text-zinc-400" />
          </div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            No se encontraron sesiones de WhatsApp
          </h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm">
            {search ? 'Intenta modificar la búsqueda o los filtros.' : 'No existen registros en esta vista.'}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
                  <th className="py-3 px-4 font-semibold text-xs text-zinc-500">Empresa</th>
                  <th className="py-3 px-4 font-semibold text-xs text-zinc-500">Tipo</th>
                  <th className="py-3 px-4 font-semibold text-xs text-zinc-500">Propietario</th>
                  <th className="py-3 px-4 font-semibold text-xs text-zinc-500">Teléfono</th>
                  <th className="py-3 px-4 font-semibold text-xs text-zinc-500">Estado</th>
                  <th className="py-3 px-4 font-semibold text-xs text-zinc-500">Instancia Evolution</th>
                  <th className="py-3 px-4 font-semibold text-xs text-zinc-500">Inicio Conexión</th>
                  <th className="py-3 px-4 font-semibold text-xs text-zinc-500">Última Actualización</th>
                  <th className="py-3 px-4 font-semibold text-xs text-zinc-500">Motivo Desconexión</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {paginatedSessions.map((session) => (
                  <tr
                    key={session.company_id}
                    className="group hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {session.company_name}
                      </div>
                      <div className="text-xs font-mono text-zinc-400">
                        {session.owner_email || 'Sin correo'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {session.is_demo ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                          DEMO
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                          CLIENTE
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-zinc-700 dark:text-zinc-300 text-xs">
                      {session.owner_name}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono text-zinc-800 dark:text-zinc-200">
                      {session.phone_number || '-'}
                    </td>
                    <td className="py-3.5 px-4">{getStatusBadge(session.status)}</td>
                    <td className="py-3.5 px-4 text-xs font-mono text-zinc-500">
                      {maskInstanceName(session.evolution_instance_name)}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono text-zinc-500">
                      {formatDate(session.connection_started_at)}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono text-zinc-500">
                      {formatDate(session.updated_at)}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-zinc-500 max-w-xs truncate">
                      {session.last_disconnect_reason || '-'}
                    </td>
                  </tr>
                ))}
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
    </div>
  );
}
