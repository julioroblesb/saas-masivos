import { useState, useMemo, useEffect } from 'react';
import { Zap, Search, Users, PhoneForwarded } from 'lucide-react';
import { supabase } from '../../../../shared/utils/supabase';
import { CustomSelect } from '@/components/ui/CustomSelect';

interface ClientMetric {
  id: string;
  phone: string;
  name: string | null;
  is_archived: boolean;
  created_at: string;
  email?: string | null;
  birthday?: string | null;
  notes?: string | null;
  total_visits?: number;
  last_visit_at?: string | null;
  last_service_name?: string | null;
}

export function SegmentConfig({
  targetContactIds,
  setTargetContactIds,
  targetRawPhones,
  setTargetRawPhones,
  targetContactsCount,
}: {
  targetContactIds: string[];
  setTargetContactIds: (ids: string[]) => void;
  targetRawPhones: string[];
  setTargetRawPhones: (phones: string[]) => void;
  targetContactsCount: number;
}) {
  const [audienceMode, setAudienceMode] = useState<'clientes' | 'base'>('clientes');
  
  // Clientes state
  const [clients, setClients] = useState<ClientMetric[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [search, setSearch] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
  
  // Raw phones state
  const [rawText, setRawText] = useState('');

  // Fetch clients only when needed
  useEffect(() => {
    async function fetchClients() {
      setLoadingClients(true);
      try {
        const { data, error } = await supabase.rpc('rpc_get_clients_metrics');
        if (!error && data) {
          setClients(data);
        }
      } catch (err) {
        console.error('Error fetching clients:', err);
      }
      setLoadingClients(false);
    }
    fetchClients();
  }, []);

  const availableServices = useMemo(() => {
    const services = new Set<string>();
    clients.forEach(c => {
      if (c.last_service_name) services.add(c.last_service_name);
    });
    return Array.from(services).sort();
  }, [clients]);

  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      if (serviceFilter && c.last_service_name !== serviceFilter) return false;
      if (search) {
        const query = search.toLowerCase();
        if (!c.name?.toLowerCase().includes(query) && !c.phone.includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [clients, search, serviceFilter]);

  const toggleClient = (id: string) => {
    if (targetContactIds.includes(id)) {
      setTargetContactIds(targetContactIds.filter(x => x !== id));
    } else {
      setTargetContactIds([...targetContactIds, id]);
    }
  };

  const selectAllFiltered = () => {
    const ids = filteredClients.map(c => c.id);
    setTargetContactIds(ids);
  };

  const clearSelection = () => {
    setTargetContactIds([]);
  };

  // Switch mode effect
  useEffect(() => {
    if (audienceMode === 'clientes') {
      setTargetRawPhones([]);
    } else {
      setTargetContactIds([]);
    }
  }, [audienceMode, setTargetContactIds, setTargetRawPhones]);

  // Handle raw text parsing
  const handleRawTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setRawText(text);
    // Parse phones: match anything that looks like a phone number
    const phones = text.split(/[\n,;]+/).map(p => p.replace(/\D/g, '')).filter(p => p.length >= 7);
    setTargetRawPhones(Array.from(new Set(phones)));
  };



  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-primary font-bold">
          1
        </div>
        <h3 className="m-0 text-xl font-bold dark:text-white-light">Destinatarios</h3>
      </div>
      <div className="pl-11 flex flex-col gap-5">
        <div className="flex flex-col gap-3">
          <label className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">¿A quién quieres enviar esta campaña?</label>
          <div className="flex gap-6 border-b border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setAudienceMode('clientes')}
              className={`pb-3 text-sm font-semibold transition-colors flex items-center gap-2 border-b-2 -mb-[1px] ${
                audienceMode === 'clientes'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Users size={16} /> A mis Clientes
            </button>
            <button
              type="button"
              onClick={() => setAudienceMode('base')}
              className={`pb-3 text-sm font-semibold transition-colors flex items-center gap-2 border-b-2 -mb-[1px] ${
                audienceMode === 'base'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <PhoneForwarded size={16} /> A una Base Nueva
            </button>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {audienceMode === 'clientes' ? 'Selecciona personas de tu base de clientes (CRM).' : 'Pega números de prospectos o listas frías.'}
          </p>
        </div>

        {/* CONTENIDO DINÁMICO SEGÚN EL MODO */}
        {audienceMode === 'clientes' ? (
          <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="Buscar nombre o teléfono..." 
                  className="w-full pl-9 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <div className="w-full sm:w-56">
                <CustomSelect 
                  isSearchable={false}
                  value={{ value: serviceFilter, label: serviceFilter || 'Todos los servicios' }}
                  options={[
                    { value: '', label: 'Todos los servicios' },
                    ...availableServices.map(s => ({ value: s, label: s }))
                  ]}
                  onChange={(option: any) => setServiceFilter(option.value)}
                />
              </div>
            </div>

            <div className="flex gap-2 text-xs">
              <button type="button" onClick={selectAllFiltered} className="text-primary hover:underline">Seleccionar filtrados ({filteredClients.length})</button>
              <span className="text-zinc-300 dark:text-zinc-700">|</span>
              <button type="button" onClick={clearSelection} className="text-danger hover:underline">Limpiar selección</button>
            </div>

            <div className="max-h-60 overflow-y-auto">
              {loadingClients ? (
                <div className="p-4 text-center text-sm text-zinc-500">Cargando clientes...</div>
              ) : filteredClients.length === 0 ? (
                <div className="p-4 text-center text-sm text-zinc-500">No hay clientes que coincidan.</div>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white dark:bg-dark">
                    <tr>
                      <th className="py-3 px-2 w-10 text-center"><input type="checkbox" checked={filteredClients.every(c => targetContactIds.includes(c.id))} onChange={(e) => e.target.checked ? selectAllFiltered() : clearSelection()} className="rounded border-slate-300 text-primary focus:ring-primary" /></th>
                      <th className="py-3 px-2 font-semibold text-zinc-600 dark:text-zinc-300">Cliente</th>
                      <th className="py-3 px-2 font-semibold text-zinc-600 dark:text-zinc-300 text-right">Último Servicio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClients.map(client => (
                      <tr key={client.id} className="border-t border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors cursor-pointer" onClick={() => toggleClient(client.id)}>
                        <td className="p-3 text-center">
                          <input type="checkbox" checked={targetContactIds.includes(client.id)} readOnly className="rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer" />
                        </td>
                        <td className="p-2">
                          <div className="font-medium text-black dark:text-white">{client.name || 'Sin nombre'}</div>
                          <div className="text-xs text-zinc-500">{client.phone}</div>
                        </td>
                        <td className="p-2 text-right text-xs text-zinc-500">
                          {client.last_service_name || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 flex justify-between">
                <span>Ingresa los números de WhatsApp</span>
                <span className="text-primary">{targetRawPhones.length} válidos</span>
              </label>
              <textarea 
                rows={6}
                placeholder="Pega aquí los números separados por comas o saltos de línea...&#10;Ej: 51987654321, 51999888777"
                className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl text-sm bg-transparent text-slate-900 dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all resize-y"
                value={rawText}
                onChange={handleRawTextChange}
              />
              <div className="flex justify-between items-start gap-4">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Asegúrate de incluir el código de país (ej. 51 para Perú) sin símbolos "+".</p>
                <p className="text-xs text-warning dark:text-warning text-right max-w-[200px] leading-tight">Los números masivos fríos tienen mayor riesgo de baneo en WhatsApp.</p>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex flex-col gap-1.5 mt-2">
          <p className="m-0 text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Zap size={16} className="text-success" /> 
            {targetContactsCount} destinatarios totales seleccionados
          </p>
        </div>
      </div>
    </div>
  );
}
