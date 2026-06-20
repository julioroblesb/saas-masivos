import { useState, useMemo, useEffect } from 'react';
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
  const [companySettings, setCompanySettings] = useState<{ greetings?: string[], farewells?: string[] }>({});

  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [targetContactsCount, setTargetContactsCount] = useState<number>(0);

  useEffect(() => {
    async function loadSettingsAndTags() {
      try {
        const { supabase } = await import('../../../shared/utils/supabase');
        
        // Cargar tags únicas
        const { data: tagsData } = await supabase.rpc('rpc_get_unique_tags');
        if (tagsData) setAvailableTags(tagsData.sort());

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();
        if (profile?.company_id) {
          const { data: company } = await supabase.from('companies').select('settings').eq('id', profile.company_id).single();
          if (company?.settings) {
            setCompanySettings(company.settings);
          }
        }
      } catch (err) {
        console.error('Error loading settings and tags', err);
      }
    }
    loadSettingsAndTags();
  }, []);

  useEffect(() => {
    async function loadCount() {
      try {
        const { supabase } = await import('../../../shared/utils/supabase');
        const { data } = await supabase.rpc('rpc_count_contacts_by_tag', { p_target_tag: targetTag || '' });
        setTargetContactsCount(data || 0);
      } catch (err) {
        console.error('Error fetching count', err);
      }
    }
    loadCount();
  }, [targetTag]);

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
        targetTag: targetTag || null,
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
    <div className="campaign-layout">

      {/* LEFT: Config */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <SegmentConfig
          campaignName={campaignName}
          setCampaignName={setCampaignName}
          contacts={[]}
          availableTags={availableTags}
          targetTag={targetTag}
          setTargetTag={setTargetTag}
          targetContactsCount={targetContactsCount}
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
        targetContactsCount={targetContactsCount}
        isUploadingAny={isUploadingAny}
        startCampaign={startCampaign}
        resetForm={resetForm}
      />
    </div>
  );
}
