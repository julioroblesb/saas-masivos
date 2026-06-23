import { Zap } from 'lucide-react';
import { CustomSelect } from '@/components/ui/CustomSelect';

export function SegmentConfig({
  campaignName,
  setCampaignName,
  contacts,
  availableTags,
  targetTag,
  setTargetTag,
  targetContactsCount,
  minDelaySec,
  setMinDelaySec,
  maxDelaySec,
  setMaxDelaySec
}: {
  campaignName: string;
  setCampaignName: (name: string) => void;
  contacts: unknown[];
  availableTags: string[];
  targetTag: string;
  setTargetTag: (tag: string) => void;
  targetContactsCount: number;
  minDelaySec: number;
  setMinDelaySec: (sec: number) => void;
  maxDelaySec: number;
  setMaxDelaySec: (sec: number) => void;
}) {
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
              onClick={() => setTargetTag('cliente')}
              className={`p-4 rounded-xl border text-left transition-all ${
                targetTag === 'cliente' 
                  ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-sm' 
                  : 'border-slate-200 dark:border-slate-700 hover:border-primary/50 bg-white dark:bg-slate-900'
              }`}
            >
              <div className="font-semibold text-sm text-black dark:text-white mb-1">A mis Clientes</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Personas que ya se han atendido contigo.</div>
            </button>
            <button
              type="button"
              onClick={() => setTargetTag('')}
              className={`p-4 rounded-xl border text-left transition-all ${
                targetTag !== 'cliente' 
                  ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-sm' 
                  : 'border-slate-200 dark:border-slate-700 hover:border-primary/50 bg-white dark:bg-slate-900'
              }`}
            >
              <div className="font-semibold text-sm text-black dark:text-white mb-1">A una Base Nueva</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Prospectos o contactos importados.</div>
            </button>
          </div>
        </div>
        
        {targetTag !== 'cliente' && (
          <div className="flex flex-col gap-1.5 animate-in slide-in-from-top-2 duration-300">
            <label className="text-sm font-semibold text-gray-500 dark:text-gray-400">Filtrar Base Nueva (Opcional)</label>
            <CustomSelect 
              className="w-full"
              isSearchable={false}
              value={{ 
                value: targetTag, 
                label: targetTag ? targetTag : `Todos los contactos (${contacts.length})` 
              }}
              options={[
                { value: '', label: `Todos los contactos (${contacts.length})` },
                ...availableTags.filter(t => t !== 'cliente').map(t => ({ value: t, label: t }))
              ]}
              onChange={(option: any) => setTargetTag(option.value)}
            />
          </div>
        )}
        
        <div className="flex flex-col gap-1.5">
          <p className="m-0 text-sm font-semibold text-success bg-success/10 border border-success/20 p-3 rounded-xl flex items-center gap-2">
            <Zap size={16} /> 
            {targetContactsCount} destinatarios seleccionados
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
