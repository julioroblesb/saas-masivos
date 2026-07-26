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
      {/* HEADER WITH ANTI BAN INFO AND TITLE */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 px-2 mt-4">
        <div className="flex-1 w-full max-w-3xl">
          <input 
            type="text" 
            placeholder="Nombra tu campaña (Ej. Promoción Mayo 2026)" 
            value={campaignName} 
            onChange={e => setCampaignName(e.target.value)}
            maxLength={100}
            className="w-full text-3xl font-black bg-transparent text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-700 focus:outline-none focus:border-b-2 border-transparent focus:border-primary transition-colors pb-2"
          />
        </div>
        <button type="button" onClick={showAntiBanInfo} className="btn btn-outline-warning flex items-center gap-2 whitespace-nowrap">
          <Info size={18} />
          Información Anti-Ban
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-12 xl:gap-8">
        {/* LEFT: Config & Sequence & Delays (2/3 width) */}
        <div className="xl:col-span-2 space-y-24">
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

        {/* RIGHT: Progress Bar & Execution Panel (1/3 width) */}
        <div className="relative">
          {/* Sticky Unified Sidebar */}
          <div className="sticky top-24 flex flex-col gap-8 p-6 bg-slate-50/50 dark:bg-slate-800/20 rounded-2xl border border-slate-100 dark:border-slate-800/50">
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

            <hr className="border-slate-200 dark:border-slate-800" />

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
          </div>
        </div>
      </div>
    </div>
  );
}
