import { Play, Loader2, CheckCircle } from 'lucide-react';
import Card from '@/components/legacy/Card';

export function ExecutionPanel({
  isQueuing,
  queued,
  targetContactsCount,
  isUploadingAny,
  startCampaign,
  resetForm
}: {
  isQueuing: boolean;
  queued: boolean;
  targetContactsCount: number;
  isUploadingAny: boolean;
  startCampaign: () => void;
  resetForm: () => void;
}) {
  const activeStyle = isQueuing || queued ? "ring-2 ring-emerald-400 dark:ring-emerald-500 shadow-emerald-500/20" : "";

  return (
    <Card className={`overflow-hidden sticky top-20 transition-all duration-300 ${activeStyle}`}>
      <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
        <Play size={16} className="text-blue-600 dark:text-blue-400" />
        <h3 className="m-0 text-[0.95rem] font-bold text-slate-900 dark:text-white">Ejecución de Campaña</h3>
      </div>
      
      <div className="p-8 flex flex-col gap-5 items-center justify-center text-center min-h-[320px]">
        {!isQueuing && !queued && (
          <>
            <p className="text-[0.88rem] text-slate-500 dark:text-slate-400 max-w-[240px] leading-relaxed m-0">
              Configura el segmento, los mensajes y presiona Encolar.<br />
              El servidor se encargará de enviar los mensajes poco a poco.
            </p>
            <button
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-xl font-bold text-[1.05rem] transition-all shadow-lg shadow-blue-500/30 disabled:shadow-none"
              onClick={startCampaign}
              disabled={isUploadingAny || targetContactsCount === 0}
            >
              {isUploadingAny
                ? <><Loader2 size={18} className="animate-spin" /> Subiendo...</>
                : <><Play size={18} /> Encolar Campaña</>}
            </button>
            {targetContactsCount === 0 && (
              <p className="text-[0.78rem] text-amber-500 font-bold m-0 mt-2">
                ⚠️ No hay contactos en el segmento seleccionado
              </p>
            )}
          </>
        )}

        {isQueuing && (
          <div className="text-center py-8">
            <Loader2 size={40} className="animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-[0.88rem] font-semibold text-slate-700 dark:text-slate-300 max-w-[260px] leading-relaxed">Generando variaciones y encolando mensajes...</p>
          </div>
        )}

        {queued && (
          <div className="text-center py-4">
            <CheckCircle size={48} className="text-emerald-500 mx-auto mb-4" />
            <h4 className="text-slate-900 dark:text-white text-lg font-bold mb-2">¡Campaña Encolada!</h4>
            <p className="text-[0.88rem] text-slate-500 dark:text-slate-400 mb-6">
              Los mensajes han sido programados. El servidor los enviará automáticamente en background. 
              <br/><strong className="text-slate-700 dark:text-slate-300">Ya puedes cerrar esta pestaña.</strong>
            </p>
            <button 
              className="px-5 py-2.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 text-slate-700 dark:text-slate-200 rounded-lg font-bold transition-colors"
              onClick={resetForm}
            >
              Crear Nueva Campaña
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}
