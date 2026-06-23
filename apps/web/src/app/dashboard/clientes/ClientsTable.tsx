'use client';

import { useState, useMemo } from 'react';
import { Search, Filter, Archive, CheckCircle, XCircle, Inbox, Mail, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { archiveContactsAction } from './actions';
import { CustomSelect } from '@/components/ui/CustomSelect';

interface ClientMetric {
  id: string;
  phone: string;
  name: string | null;
  is_archived: boolean;
  created_at: string;
  campaigns_count: number;
  last_message_sent_at: string | null;
  last_reply_at: string | null;
  email?: string | null;
  birthday?: string | null;
  notes?: string | null;
  total_visits?: number;
  last_service_name?: string | null;
}

export function ClientsTable({ initialClients }: { initialClients: ClientMetric[] }) {
  const [clients, setClients] = useState<ClientMetric[]>(initialClients);
  const [search, setSearch] = useState('');
  const [filterArchived, setFilterArchived] = useState<'active' | 'archived' | 'all'>('active');
  const [filterResponded, setFilterResponded] = useState<'all' | 'yes' | 'no'>('all');
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  // Formatting dates
  const formatDate = (iso: string | null) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleDateString('es-ES', { 
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  // Filtered and sorted clients
  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      // 1. Search text
      if (search) {
        const query = search.toLowerCase();
        const matchesName = c.name?.toLowerCase().includes(query) ?? false;
        const matchesPhone = c.phone.toLowerCase().includes(query);
        if (!matchesName && !matchesPhone) return false;
      }
      
      // 2. Archived status
      if (filterArchived === 'active' && c.is_archived) return false;
      if (filterArchived === 'archived' && !c.is_archived) return false;

      // 3. Responded status
      if (filterResponded === 'yes' && !c.last_reply_at) return false;
      if (filterResponded === 'no' && c.last_reply_at) return false;

      return true;
    });
  }, [clients, search, filterArchived, filterResponded]);

  // Bulk Selection
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredClients.map(c => c.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // Bulk Actions
  const handleBulkArchive = async (archive: boolean) => {
    if (selectedIds.size === 0) return;
    
    const actionName = archive ? 'archivar' : 'restaurar';
    if (!confirm(`¿Estás seguro de que deseas ${actionName} ${selectedIds.size} contacto(s)?`)) return;

    setIsProcessing(true);
    const idArray = Array.from(selectedIds);
    const res = await archiveContactsAction(idArray, archive);
    
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(`Contactos ${archive ? 'archivados' : 'restaurados'} correctamente`);
      // Update local state to reflect changes
      setClients(prev => prev.map(c => 
        idArray.includes(c.id) ? { ...c, is_archived: archive } : c
      ));
      setSelectedIds(new Set());
    }
    setIsProcessing(false);
  };

  // Suggest archiving contacts with >3 campaigns and no replies
  const suggestedToArchive = useMemo(() => {
    return filteredClients.filter(c => !c.is_archived && c.campaigns_count >= 3 && !c.last_reply_at);
  }, [filteredClients]);

  const selectSuggested = () => {
    const next = new Set(selectedIds);
    suggestedToArchive.forEach(c => next.add(c.id));
    setSelectedIds(next);
  };

  return (
    <div className="flex flex-col h-full">
      
      {/* Top Bar / Filters */}
      <div className="p-5 border-b border-black-light dark:border-dark-light space-y-4">
        {/* Suggestion Banner */}
        {suggestedToArchive.length > 0 && filterArchived !== 'archived' && (
          <div className="bg-warning/10 border border-warning/20 p-3 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-warning shrink-0" size={20} />
              <div className="text-sm">
                <span className="font-semibold text-warning-dark">Sugerencia de limpieza: </span>
                <span className="text-warning-dark/80">
                  Tienes {suggestedToArchive.length} contacto(s) que han recibido 3 o más campañas y nunca han respondido. 
                  Archívalos para mejorar tu reputación y evitar bloqueos de spam.
                </span>
              </div>
            </div>
            <button 
              onClick={selectSuggested}
              className="btn btn-warning btn-sm whitespace-nowrap"
            >
              Seleccionarlos
            </button>
          </div>
        )}

        <div className="flex flex-col lg:flex-row justify-between gap-4">
          <div className="flex-1 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Buscar por teléfono o nombre..." 
                className="form-input pl-9 rounded-xl border border-black-light dark:border-dark-light bg-white dark:bg-dark focus:border-primary focus:ring-1 focus:ring-primary shadow-sm"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2">
              <CustomSelect 
                className="w-[180px]"
                isSearchable={false}
                value={{ 
                  value: filterArchived, 
                  label: filterArchived === 'active' ? 'Mostrar Activos' : filterArchived === 'archived' ? 'Mostrar Archivados' : 'Mostrar Todos' 
                }}
                options={[
                  { value: 'active', label: 'Mostrar Activos' },
                  { value: 'archived', label: 'Mostrar Archivados' },
                  { value: 'all', label: 'Mostrar Todos' }
                ]}
                onChange={(option: any) => setFilterArchived(option.value)}
              />

              <CustomSelect 
                className="w-[200px]"
                isSearchable={false}
                value={{ 
                  value: filterResponded, 
                  label: filterResponded === 'all' ? 'Cualquier respuesta' : filterResponded === 'yes' ? 'Han respondido' : 'Nunca respondieron' 
                }}
                options={[
                  { value: 'all', label: 'Cualquier respuesta' },
                  { value: 'yes', label: 'Han respondido' },
                  { value: 'no', label: 'Nunca respondieron' }
                ]}
                onChange={(option: any) => setFilterResponded(option.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <span className="text-sm font-semibold text-primary mr-2">
                {selectedIds.size} seleccionados
              </span>
            )}
            
            {filterArchived !== 'archived' ? (
              <button 
                onClick={() => handleBulkArchive(true)}
                disabled={selectedIds.size === 0 || isProcessing}
                className="btn btn-outline-danger gap-2"
              >
                <Archive className="w-4 h-4" /> Dar de Baja (Archivar)
              </button>
            ) : (
              <button 
                onClick={() => handleBulkArchive(false)}
                disabled={selectedIds.size === 0 || isProcessing}
                className="btn btn-outline-success gap-2"
              >
                <CheckCircle className="w-4 h-4" /> Restaurar Activos
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table Area */}
      <div className="table-responsive min-h-[400px]">
        <table className="table-hover w-full">
          <thead className="bg-zinc-50 dark:bg-zinc-900/50">
            <tr>
              <th className="w-12 text-center py-4 text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-widest">
                <input 
                  type="checkbox" 
                  className="form-checkbox"
                  checked={filteredClients.length > 0 && selectedIds.size === filteredClients.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </th>
              <th className="py-4 text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-widest">Contacto</th>
              <th className="text-center py-4 text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-widest">Fecha de Ingreso</th>
              <th className="text-center py-4 text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-widest">Estado</th>
              <th className="text-center py-4 text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-widest">Campañas Exitosas</th>
              <th className="text-center py-4 text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-widest">Visitas</th>
              <th className="py-4 text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-widest">Último Servicio</th>
              <th className="py-4 text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-widest">Último Mensaje Enviado</th>
              <th className="py-4 text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-widest">Última Respuesta Recibida</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black-light dark:divide-dark-light">
            {filteredClients.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8">
                  <div className="flex flex-col items-center justify-center text-zinc-400">
                    <Inbox className="w-12 h-12 mb-3 opacity-20" />
                    <p className="text-zinc-500">No se encontraron clientes con esos filtros.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredClients.map(client => (
                <tr key={client.id} className={selectedIds.has(client.id) ? 'bg-primary/5 dark:bg-primary/10' : ''}>
                  <td className="text-center">
                    <input 
                      type="checkbox" 
                      className="form-checkbox"
                      checked={selectedIds.has(client.id)}
                      onChange={() => toggleSelect(client.id)}
                    />
                  </td>
                  <td>
                    <div className="font-semibold text-black dark:text-white">
                      +{client.phone}
                    </div>
                    {client.name && (
                      <div className="text-xs text-zinc-500">{client.name}</div>
                    )}
                    {client.email && (
                      <div className="text-xs text-zinc-400">{client.email}</div>
                    )}
                  </td>
                  <td className="text-center text-sm font-medium text-black dark:text-white">
                    {formatDate(client.created_at)}
                  </td>
                  <td className="text-center">
                    {client.is_archived ? (
                      <span className="badge bg-danger/10 text-danger">Archivado</span>
                    ) : (
                      <span className="badge bg-success/10 text-success">Activo</span>
                    )}
                  </td>
                  <td className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Mail className="w-3 h-3 text-zinc-400" />
                      <span className="font-semibold text-black dark:text-white">{client.campaigns_count}</span>
                    </div>
                  </td>
                  <td className="text-center">
                    <span className="font-semibold text-black dark:text-white">{client.total_visits || 0}</span>
                  </td>
                  <td className="font-medium text-black dark:text-white text-sm">
                    {client.last_service_name || '-'}
                  </td>
                  <td className="font-medium text-black dark:text-white text-sm">
                    {formatDate(client.last_message_sent_at)}
                  </td>
                  <td>
                    {client.last_reply_at ? (
                      <span className="text-success text-sm font-medium flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5" />
                        {formatDate(client.last_reply_at)}
                      </span>
                    ) : (
                      <span className="text-zinc-400 text-sm italic flex items-center gap-1.5">
                        <XCircle className="w-3.5 h-3.5" />
                        No ha respondido
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
