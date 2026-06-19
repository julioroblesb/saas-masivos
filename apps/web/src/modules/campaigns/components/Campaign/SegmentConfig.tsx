import { Zap } from 'lucide-react';
import Card from '@/components/legacy/Card';

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
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
        <Zap size={16} className="text-blue-600 dark:text-blue-400" />
        <h3 className="m-0 text-[0.95rem] font-bold text-slate-900 dark:text-white">Configuración General</h3>
      </div>
      <div className="p-5 flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-[0.75rem] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Nombre de la campaña</label>
          <input 
            type="text" 
            placeholder="Ej. Promoción Mayo 2026" 
            value={campaignName} 
            onChange={e => setCampaignName(e.target.value)}
            maxLength={100}
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
        
        <div className="flex flex-col gap-1.5">
          <label className="text-[0.75rem] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Destinatarios</label>
          <select 
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" 
            value={targetTag} 
            onChange={e => setTargetTag(e.target.value)}
          >
            <option value="">Todos los contactos de marketing ({contacts.length})</option>
            {availableTags.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <p className="m-0 text-[0.78rem] font-semibold text-emerald-500 mt-1">✓ {targetContactsCount} destinatarios seleccionados</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5">
          <div className="flex-1 flex flex-col gap-1.5">
            <label className="text-[0.72rem] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide" title="Delay mínimo entre mensajes a distintos contactos">Delay Mínimo (seg)</label>
            <input 
              type="number" 
              min={30} 
              max={600}
              value={minDelaySec} 
              onChange={e => setMinDelaySec(Number(e.target.value))} 
              className="w-full px-2 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-semibold text-center bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div className="flex-1 flex flex-col gap-1.5">
            <label className="text-[0.72rem] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide" title="Delay máximo entre mensajes a distintos contactos">Delay Máximo (seg)</label>
            <input 
              type="number" 
              min={30} 
              max={600}
              value={maxDelaySec} 
              onChange={e => setMaxDelaySec(Number(e.target.value))} 
              className="w-full px-2 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-semibold text-center bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>
        
        <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg text-[0.85rem] mt-1 border border-slate-100 dark:border-slate-700/50">
          <strong className="text-slate-700 dark:text-slate-200">⏱️ Tiempo estimado:</strong> <span className="text-slate-900 dark:text-white font-medium">{formatTime(estimatedSeconds)}</span> <br/>
          <span className="text-slate-500 dark:text-slate-400 text-[0.8rem]">(El cron enviará 1 mensaje por minuto máximo para evitar baneos)</span>
        </div>
      </div>
    </Card>
  );
}
