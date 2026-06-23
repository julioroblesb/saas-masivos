import { useState, useMemo, useEffect } from 'react';
import { Zap, Search, Users, PhoneForwarded } from 'lucide-react';
import { supabase } from '../../../../shared/utils/supabase';

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
  campaignName,
  setCampaignName,
  targetContactIds,
  setTargetContactIds,
  targetRawPhones,
  setTargetRawPhones,
  targetContactsCount,
  minDelaySec,
  setMinDelaySec,
  maxDelaySec,
  setMaxDelaySec
}: {
  campaignName: string;
  setCampaignName: (name: string) => void;
  targetContactIds: string[];
  setTargetContactIds: (ids: string[]) => void;
  targetRawPhones: string[];
  setTargetRawPhones: (phones: string[]) => void;
  targetContactsCount: number;
  minDelaySec: number;
  setMinDelaySec: (sec: number) => void;
  maxDelaySec: number;
  setMaxDelaySec: (sec: number) => void;
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

  const avgDelay = (minDelaySec + maxDelaySec) / 2;
  const estimatedSeconds = targetContactsCount * avgDelay;
  
  const formatTime = (seconds: number) => {
    if (seconds === 0) return '0 min';
    if (seconds < 60) return `~${Math.round(seconds)} seg`;
    const mins = Math.floor(seconds / 60);
    const hrs = Math.floor(mins / 60);
    if (hrs > 0) return `~${hrs} hr ${mins % 60} min`;
    return `~${mins} min`;
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Zap size={16} className="text-primary" />
        <h3 className="m-0 text-lg font-semibold dark:text-white-light">Configuración General</h3>
      </div>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-gray-500 dark:text-gray-400">Nombre de la campaña</label>
          <input 
            type="text" 
            placeholder="Ej. Promoción Mayo 2026" 
            value={campaignName} 
            onChange={e => setCampaignName(e.target.value)}
            maxLength={100}
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
          />
        </div>
        
        <div className="flex flex-col gap-3 p-4 bg-zinc-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-slate-800 rounded-xl">
          <label className="text-sm font-semibold text-gray-800 dark:text-gray-200">¿A quién quieres enviar esta campaña?</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setAudienceMode('clientes')}
              className={`p-4 rounded-xl border text-left transition-all ${
                audienceMode === 'clientes' 
                  ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-sm' 
                  : 'border-slate-200 dark:border-slate-700 hover:border-primary/50 bg-white dark:bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Users size={16} className={audienceMode === 'clientes' ? 'text-primary' : 'text-zinc-400'} />
                <div className="font-semibold text-sm text-black dark:text-white">A mis Clientes</div>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Selecciona personas de tu base de clientes (CRM).</div>
            </button>
            <button
              type="button"
              onClick={() => setAudienceMode('base')}
              className={`p-4 rounded-xl border text-left transition-all ${
                audienceMode === 'base' 
                  ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-sm' 
                  : 'border-slate-200 dark:border-slate-700 hover:border-primary/50 bg-white dark:bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <PhoneForwarded size={16} className={audienceMode === 'base' ? 'text-primary' : 'text-zinc-400'} />
                <div className="font-semibold text-sm text-black dark:text-white">A una Base Nueva</div>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Pega números de prospectos o listas frías.</div>
            </button>
          </div>
        </div>

        {/* CONTENIDO DINÁMICO SEGÚN EL MODO */}
        {audienceMode === 'clientes' ? (
          <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-300 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
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
              <select 
                className="w-full sm:w-auto px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                value={serviceFilter}
                onChange={e => setServiceFilter(e.target.value)}
              >
                <option value="">Todos los servicios</option>
                {availableServices.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="flex gap-2 text-xs">
              <button type="button" onClick={selectAllFiltered} className="text-primary hover:underline">Seleccionar filtrados ({filteredClients.length})</button>
              <span className="text-zinc-300">|</span>
              <button type="button" onClick={clearSelection} className="text-danger hover:underline">Limpiar selección</button>
            </div>

            <div className="max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900">
              {loadingClients ? (
                <div className="p-4 text-center text-sm text-zinc-500">Cargando clientes...</div>
              ) : filteredClients.length === 0 ? (
                <div className="p-4 text-center text-sm text-zinc-500">No hay clientes que coincidan.</div>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="bg-zinc-50 dark:bg-zinc-800/50 sticky top-0">
                    <tr>
                      <th className="p-2 w-10 text-center"><input type="checkbox" checked={filteredClients.every(c => targetContactIds.includes(c.id))} onChange={(e) => e.target.checked ? selectAllFiltered() : clearSelection()} className="rounded text-primary focus:ring-primary" /></th>
                      <th className="p-2 font-medium text-zinc-600 dark:text-zinc-300">Cliente</th>
                      <th className="p-2 font-medium text-zinc-600 dark:text-zinc-300 text-right">Último Servicio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClients.map(client => (
                      <tr key={client.id} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer" onClick={() => toggleClient(client.id)}>
                        <td className="p-2 text-center">
                          <input type="checkbox" checked={targetContactIds.includes(client.id)} readOnly className="rounded text-primary focus:ring-primary" />
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
          <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="p-3 bg-warning/10 border border-warning/20 rounded-xl text-sm text-warning-dark">
              <strong>⚠️ Importante:</strong> Estos números se utilizarán exclusivamente para este envío masivo y <strong>no se guardarán en tu base de clientes</strong>. 
              Recuerda que enviar masivos a contactos que no te conocen aumenta el riesgo de que bloqueen tu número de WhatsApp.
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-500 dark:text-gray-400 flex justify-between">
                <span>Ingresa los números de WhatsApp</span>
                <span className="text-primary">{targetRawPhones.length} números válidos detectados</span>
              </label>
              <textarea 
                rows={6}
                placeholder="Pega aquí los números separados por comas o saltos de línea...&#10;Ej: 51987654321, 51999888777"
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors resize-y"
                value={rawText}
                onChange={handleRawTextChange}
              />
              <p className="text-xs text-zinc-500">Asegúrate de incluir el código de país (ej. 51 para Perú) sin símbolos "+".</p>
            </div>
          </div>
        )}
        
        <div className="flex flex-col gap-1.5">
          <p className="m-0 text-sm font-semibold text-success bg-success/10 border border-success/20 p-3 rounded-xl flex items-center gap-2">
            <Zap size={16} /> 
            {targetContactsCount} destinatarios totales seleccionados
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase" title="Delay mínimo entre mensajes a distintos contactos">Delay Mínimo (seg)</label>
            <input 
              type="number" 
              min={30} 
              max={600}
              value={minDelaySec} 
              onChange={e => setMinDelaySec(Number(e.target.value))} 
              onBlur={() => setMinDelaySec(Math.max(30, minDelaySec))}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-center bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
            />
          </div>
          <div className="flex-1 flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase" title="Delay máximo entre mensajes a distintos contactos">Delay Máximo (seg)</label>
            <input 
              type="number" 
              min={30} 
              max={600}
              value={maxDelaySec} 
              onChange={e => setMaxDelaySec(Number(e.target.value))} 
              onBlur={() => setMaxDelaySec(Math.max(30, Math.max(minDelaySec, maxDelaySec)))}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-center bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
            />
          </div>
        </div>
        
        <div className="bg-primary-light dark:bg-primary-dark-light p-3 rounded-lg text-sm mt-1">
          <strong className="text-primary">⏱️ Tiempo estimado:</strong> <span className="text-primary font-medium">{formatTime(estimatedSeconds)}</span> <br/>
          <span className="text-gray-500 dark:text-gray-400 text-xs">(El cron enviará 1 mensaje por minuto máximo para evitar baneos)</span>
        </div>
      </div>
    </div>
  );
}
