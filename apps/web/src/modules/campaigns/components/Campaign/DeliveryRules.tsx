import React from 'react';
import { Timer, Clock } from 'lucide-react';

export function DeliveryRules({
  minDelaySec,
  setMinDelaySec,
  maxDelaySec,
  setMaxDelaySec,
  targetContactsCount
}: {
  minDelaySec: number;
  setMinDelaySec: (sec: number) => void;
  maxDelaySec: number;
  setMaxDelaySec: (sec: number) => void;
  targetContactsCount: number;
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
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-primary font-bold">
          3
        </div>
        <h3 className="m-0 text-xl font-bold dark:text-white-light">Cadencia de Envío</h3>
      </div>

      <div className="pl-11 flex flex-col gap-5">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Para evitar ser detectado como SPAM, el sistema espera un tiempo aleatorio entre cada mensaje enviado. Configura los rangos de espera aquí.
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Delay Mínimo (segundos)</label>
            <div className="relative">
              <Timer className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
              <input 
                type="number" 
                min={30} 
                max={600}
                value={minDelaySec} 
                onChange={e => setMinDelaySec(Number(e.target.value))} 
                onBlur={() => setMinDelaySec(Math.max(30, minDelaySec))}
                className="w-full pl-9 px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl text-base bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Delay Máximo (segundos)</label>
            <div className="relative">
              <Timer className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
              <input 
                type="number" 
                min={30} 
                max={600}
                value={maxDelaySec} 
                onChange={e => setMaxDelaySec(Number(e.target.value))} 
                onBlur={() => setMaxDelaySec(Math.max(30, Math.max(minDelaySec, maxDelaySec)))}
                className="w-full pl-9 px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl text-base bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
              />
            </div>
          </div>
        </div>

        <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 flex items-start gap-3 mt-2">
          <Clock className="text-primary mt-0.5" size={20} />
          <div>
            <h4 className="text-sm font-bold text-primary mb-1">Tiempo Estimado de Ejecución</h4>
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              Tomará <strong className="text-black dark:text-white">{formatTime(estimatedSeconds)}</strong> en despachar los {targetContactsCount} mensajes de esta campaña.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
