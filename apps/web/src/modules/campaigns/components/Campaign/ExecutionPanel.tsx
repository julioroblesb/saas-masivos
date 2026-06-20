import { Play, Loader2, CheckCircle } from 'lucide-react';

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
  const activeStyle = isQueuing || queued ? "ring-2 ring-emerald-400 dark:ring-emerald-500 shadow-emerald-500/20 rounded-xl" : "";

  return (
    <div className={`transition-all duration-300 ${activeStyle}`}>
      <div className="flex items-center gap-2 mb-4">
        <Play size={16} className="text-primary" />
        <h3 className="m-0 text-lg font-semibold dark:text-white-light">Ejecución de Campaña</h3>
      </div>
      
      <div className="flex flex-col gap-5 items-center justify-center text-center">
        {!isQueuing && !queued && (
          <>
            <p className="text-[0.88rem] text-slate-500 dark:text-slate-400 max-w-[240px] leading-relaxed m-0">
              Configura el segmento, los mensajes y presiona Encolar.<br />
              El servidor se encargará de enviar los mensajes poco a poco.
            </p>
            <button
              className="btn btn-primary w-full gap-2 mt-4"
              onClick={startCampaign}
              disabled={isUploadingAny || targetContactsCount === 0}
            >
              {isUploadingAny
                ? <><Loader2 size={18} className="animate-spin" /> Subiendo...</>
                : <><Play size={18} /> Iniciar Campaña</>}
            </button>
            {targetContactsCount === 0 && (
              <p className="text-[0.78rem] text-warning font-bold m-0 mt-2">
                ⚠️ No hay contactos en el segmento seleccionado
              </p>
            )}
          </>
        )}

        {isQueuing && (
          <div className="text-center py-8">
            <Loader2 size={40} className="animate-spin text-primary mx-auto mb-4" />
            <p className="text-[0.88rem] font-semibold text-slate-700 dark:text-slate-300 max-w-[260px] leading-relaxed">Generando variaciones y encolando mensajes...</p>
          </div>
        )}

        {queued && (
          <div className="text-center py-4">
            <CheckCircle size={48} className="text-success mx-auto mb-4" />
            <h4 className="text-slate-900 dark:text-white text-lg font-bold mb-2">¡Campaña Encolada!</h4>
            <p className="text-[0.88rem] text-slate-500 dark:text-slate-400 mb-6">
              Los mensajes han sido programados. El servidor los enviará automáticamente en background. 
              <br/><strong className="text-slate-700 dark:text-slate-300">Ya puedes cerrar esta pestaña.</strong>
            </p>
            <button 
              className="btn btn-outline-primary"
              onClick={resetForm}
            >
              Crear Nueva Campaña
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
