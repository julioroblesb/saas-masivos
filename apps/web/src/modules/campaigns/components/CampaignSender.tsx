import { useState } from 'react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { Info, Send } from 'lucide-react';
import { useCreateCampaign } from '../../../hooks/queries/useCampaigns';
import { useCampaignMediaUpload } from '../../../hooks/media/useCampaignMediaUpload';
import type { SequenceItem } from './Campaign/types';
import type { CreateCampaignPayload } from '../../../types/crm';
import { crmToast } from '../../../hooks/useToast';

import { SegmentConfig } from './Campaign/SegmentConfig';
import { SequenceEditor } from './Campaign/SequenceEditor';
import { DeliveryRules } from './Campaign/DeliveryRules';
import { ExecutionPanel } from './Campaign/ExecutionPanel';

const MySwal = withReactContent(Swal);

export function CampaignSender() {
  const { uploadingIds, isUploadingAny, uploadMedia } = useCampaignMediaUpload();
  const { mutateAsync: createCampaign, isPending: isQueuing } = useCreateCampaign();

  const [campaignName, setCampaignName] = useState('');
  const [targetContactIds, setTargetContactIds] = useState<string[]>([]);
  const [targetRawPhones, setTargetRawPhones] = useState<string[]>([]);
  const [sequence, setSequence] = useState<SequenceItem[]>([
    { id: '1', type: 'text', content: '', delayAfterMs: 3000 }
  ]);
  const [minDelaySec, setMinDelaySec] = useState(45);
  const [maxDelaySec, setMaxDelaySec] = useState(90);
  const [queued, setQueued] = useState(false);
  const targetContactsCount = targetContactIds.length + targetRawPhones.length;

  const addMessage = () => setSequence(prev => [
    ...prev, { id: crypto.randomUUID(), type: 'text', content: '', delayAfterMs: 3000 }
  ]);

  const updateMessage = (id: string, patch: Partial<SequenceItem>) =>
    setSequence(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));

  const removeMessage = (id: string) => setSequence(prev => prev.filter(s => s.id !== id));

  const handleTypeChange = (id: string, type: SequenceItem['type']) =>
    updateMessage(id, { type, content: '', uploadedFilename: undefined });

  const handleMediaReady = (id: string, url: string, filename: string) =>
    updateMessage(id, { content: url, uploadedFilename: filename });

  const resetForm = () => {
    setCampaignName('');
    setTargetContactIds([]);
    setTargetRawPhones([]);
    setSequence([{ id: '1', type: 'text', content: '', delayAfterMs: 3000 }]);
    setQueued(false);
  };

  const showAntiBanInfo = () => {
    MySwal.fire({
      title: 'Políticas Anti-Ban',
      html: `
        <div class="text-left text-sm text-zinc-600 dark:text-zinc-300">
          <p class="mb-4">El método utilizado simula un dispositivo real y <strong>no es una API oficial</strong>. Existen riesgos de baneo o suspensión de tu cuenta de WhatsApp si incumples las políticas de SPAM.</p>
          <p><strong>Protección automática:</strong> el servidor aplica ventanas horarias, límites progresivos, pausas y reintentos. La interfaz no puede omitir esas reglas.</p>
        </div>
      `,
      icon: 'info',
      confirmButtonText: 'Entendido',
      customClass: { confirmButton: 'btn btn-primary' }
    });
  };

  const startCampaign = async () => {
    if (targetContactsCount === 0 || sequence.length === 0) return;
    
    const finalCampaignName = campaignName.trim() || `Campaña ${new Date().toLocaleString('es-PE')}`;
    
    const hasEmpty = sequence.some(s => !s.content.trim());
    if (hasEmpty) { crmToast.error('Hay mensajes vacíos en la secuencia.'); return; }
    
    if (minDelaySec < 30) { crmToast.error('El delay mínimo debe ser de al menos 30 segundos.'); return; }
    if (maxDelaySec < minDelaySec) { crmToast.error('El delay máximo debe ser mayor o igual al mínimo.'); return; }

    const avgDelay = (minDelaySec + maxDelaySec) / 2;
    const estimatedMins = Math.round((targetContactsCount * avgDelay) / 60);

    if (!window.confirm(`¿Encolar "${finalCampaignName}" para ${targetContactsCount} contactos?\n\nTiempo estimado de envío: ~${estimatedMins} minutos.`)) return;

    try {
      // Preparar Payload resolviendo el Spintax localmente para cada destinatario
      const payload: CreateCampaignPayload = {
        name: finalCampaignName,
        targetContactIds,
        targetRawPhones,
        sequence: sequence.map(s => ({
          id: s.id,
          type: s.type,
          content: s.type === 'text' ? s.content : '', // Si no es texto, el content va vacío en base de datos
          mediaUrl: s.type !== 'text' ? s.content : undefined,
          delayAfterMs: s.delayAfterMs
        })),
        minDelaySec,
        maxDelaySec
      };

      await createCampaign(payload);
      setQueued(true);
    } catch (err: unknown) {
      console.error('Error al enviar la campaña:', err);
      const msg = err instanceof Error ? err.message : 'Error al iniciar el envío';
      crmToast.error(msg);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full max-w-3xl">
          <label htmlFor="campaign-name" className="mb-2 block text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Nombre de la campaña
          </label>
          <input 
            id="campaign-name"
            type="text" 
            placeholder="Ej. Promoción de invierno"
            value={campaignName} 
            onChange={e => setCampaignName(e.target.value)}
            maxLength={100}
            className="min-h-11 w-full rounded-xl border border-slate-200 bg-transparent px-4 py-2.5 text-base font-medium text-slate-900 outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/15 dark:border-slate-800 dark:text-white dark:placeholder:text-slate-600"
          />
        </div>
        <button type="button" onClick={showAntiBanInfo} className="btn btn-outline-warning min-h-11 justify-center gap-2 whitespace-nowrap">
          <Info size={18} />
          Información Anti-Ban
        </button>
      </div>

      <div className="grid grid-cols-1 gap-10 xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-8">
        <div className="space-y-12">
          <div>
            <SegmentConfig
              targetContactIds={targetContactIds}
              setTargetContactIds={setTargetContactIds}
              targetRawPhones={targetRawPhones}
              setTargetRawPhones={setTargetRawPhones}
              targetContactsCount={targetContactsCount}
            />
          </div>

          <div>
            <SequenceEditor
              sequence={sequence}
              handleTypeChange={handleTypeChange}
              removeMessage={removeMessage}
              updateMessage={updateMessage}
              handleMediaReady={handleMediaReady}
              uploadingIds={uploadingIds}
              uploadMedia={uploadMedia}
              addMessage={addMessage}
            />
          </div>

          <div>
            <DeliveryRules
              minDelaySec={minDelaySec}
              setMinDelaySec={setMinDelaySec}
              maxDelaySec={maxDelaySec}
              setMaxDelaySec={setMaxDelaySec}
              targetContactsCount={targetContactsCount}
            />
          </div>
        </div>

        <div className="relative">
          <aside className="sticky top-24 flex flex-col gap-5 rounded-2xl bg-slate-50 p-5 dark:bg-slate-800/30" aria-label="Resumen de campaña">
            <div>
              <h5 className="flex items-center gap-2 text-lg font-bold dark:text-white-light">
                <Send className="text-primary" size={20} aria-hidden="true" />
                Resumen de envío
              </h5>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-300">
                {targetContactsCount} destinatarios y {sequence.length} pasos. Los límites y
                horarios se aplican en el servidor.
              </p>
            </div>

            <div>
              <ExecutionPanel
                isQueuing={isQueuing}
                queued={queued}
                targetContactsCount={targetContactsCount}
                isUploadingAny={isUploadingAny}
                startCampaign={startCampaign}
                resetForm={resetForm}
              />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
