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

      <div className="md:col-span-12 xl:col-span-12 w-full mb-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 p-4 rounded-xl flex flex-col gap-2">
        <h4 className="m-0 text-[0.9rem] font-bold text-amber-900 dark:text-amber-300 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
          Información Importante sobre Envíos Masivos (Anti-Ban)
        </h4>
        <p className="m-0 text-[0.8rem] text-amber-800 dark:text-amber-200/80 leading-relaxed">
          El método utilizado para envíos masivos simula un dispositivo real y <strong>no es una API oficial</strong>, por lo que existen riesgos de baneo o suspensión de tu cuenta de WhatsApp si incumples las políticas de SPAM.
        </p>
        <p className="m-0 text-[0.8rem] text-amber-800 dark:text-amber-200/80 leading-relaxed mt-1">
          <strong>Protección de Cuenta Nueva:</strong> Para proteger tu número de bloqueos, el sistema limita automáticamente tus envíos:
          <br/>• Días 1 y 2: Máx. <strong>50 mensajes diarios</strong>
          <br/>• Días 3 a 6: Máx. <strong>150 mensajes diarios</strong>
          <br/>• Días 7 a 13: Máx. <strong>300 mensajes diarios</strong>
          <br/>• Día 14 en adelante: Máx. <strong>500 mensajes diarios</strong>
        </p>
      </div>

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
