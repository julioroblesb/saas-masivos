import { useState, useMemo } from 'react';
import { useMarketingContacts } from '../../../hooks/queries/useMarketingContacts';
import { useCreateCampaign } from '../../../hooks/queries/useCampaigns';
import { useCampaignMediaUpload } from '../../../hooks/media/useCampaignMediaUpload';
import { resolveSpintax } from '../../../shared/utils/spintax';
import type { SequenceItem } from './Campaign/types';
import type { CreateCampaignPayload } from '../../../types/crm';
import { crmToast } from '../../../hooks/useToast';

import { SegmentConfig } from './Campaign/SegmentConfig';
import { SequenceEditor } from './Campaign/SequenceEditor';
import { ExecutionPanel } from './Campaign/ExecutionPanel';

export function CampaignSender() {
  const { data: contacts = [] } = useMarketingContacts();
  const { uploadingIds, isUploadingAny, uploadMedia } = useCampaignMediaUpload();
  const { mutateAsync: createCampaign, isPending: isQueuing } = useCreateCampaign();

  const [campaignName, setCampaignName] = useState('');
  const [targetTag, setTargetTag] = useState('');
  const [sequence, setSequence] = useState<SequenceItem[]>([
    { id: '1', type: 'text', content: '', delayAfterMs: 3000 }
  ]);
  const [minDelaySec, setMinDelaySec] = useState(45);
  const [maxDelaySec, setMaxDelaySec] = useState(90);
  const [queued, setQueued] = useState(false);

  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    contacts.forEach(c => c.tags?.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [contacts]);

  const targetContacts = useMemo(() =>
    !targetTag ? contacts : contacts.filter(c => (c.tags || []).includes(targetTag)),
    [contacts, targetTag]
  );

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
    setTargetTag('');
    setSequence([{ id: '1', type: 'text', content: '', delayAfterMs: 3000 }]);
    setQueued(false);
  };

  const startCampaign = async () => {
    if (targetContacts.length === 0 || sequence.length === 0) return;
    
    const finalCampaignName = campaignName.trim() || `Campaña ${new Date().toLocaleString('es-PE')}`;
    
    const hasEmpty = sequence.some(s => !s.content.trim());
    if (hasEmpty) { crmToast.error('Hay mensajes vacíos en la secuencia.'); return; }
    
    if (minDelaySec < 30) { crmToast.error('El delay mínimo debe ser de al menos 30 segundos.'); return; }
    if (maxDelaySec < minDelaySec) { crmToast.error('El delay máximo debe ser mayor o igual al mínimo.'); return; }

    const avgDelay = (minDelaySec + maxDelaySec) / 2;
    const estimatedMins = Math.round((targetContacts.length * avgDelay) / 60);

    if (!window.confirm(`¿Encolar "${finalCampaignName}" para ${targetContacts.length} contactos?\n\nTiempo estimado de envío: ~${estimatedMins} minutos.`)) return;

    try {
      // Preparar Payload resolviendo el Spintax localmente para cada destinatario
      const payload: CreateCampaignPayload = {
        name: finalCampaignName,
        targetTag: targetTag || null,
        sequence: sequence.map(s => ({
          id: s.id,
          type: s.type,
          content: s.type === 'text' ? s.content : '', // Si no es texto, el content va vacío en base de datos
          mediaUrl: s.type !== 'text' ? s.content : undefined,
          delayAfterMs: s.delayAfterMs
        })),
        minDelaySec,
        maxDelaySec,
        contacts: targetContacts.map(c => ({
          phone: c.phone,
          name: c.name,
          // Para cada paso de la secuencia, generamos su versión resuelta única (Spintax + Huella Invisible + Variables)
          messages: sequence.map(s => s.type === 'text' ? resolveSpintax(s.content, c.name) : '')
        }))
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
    <div className="campaign-layout">

      {/* LEFT: Config */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <SegmentConfig
          campaignName={campaignName}
          setCampaignName={setCampaignName}
          contacts={contacts}
          availableTags={availableTags}
          targetTag={targetTag}
          setTargetTag={setTargetTag}
          targetContactsCount={targetContacts.length}
          minDelaySec={minDelaySec}
          setMinDelaySec={setMinDelaySec}
          maxDelaySec={maxDelaySec}
          setMaxDelaySec={setMaxDelaySec}
        />

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

      {/* RIGHT: Execution */}
      <ExecutionPanel
        isQueuing={isQueuing}
        queued={queued}
        targetContactsCount={targetContacts.length}
        isUploadingAny={isUploadingAny}
        startCampaign={startCampaign}
        resetForm={resetForm}
      />
    </div>
  );
}
