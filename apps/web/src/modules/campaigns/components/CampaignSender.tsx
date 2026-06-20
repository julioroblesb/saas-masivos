import { useState, useMemo, useEffect } from 'react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { Info, ShieldCheck } from 'lucide-react';
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

const MySwal = withReactContent(Swal);

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
  const [companyCreatedAt, setCompanyCreatedAt] = useState<string>('');

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
          const { data: company } = await supabase.from('companies').select('settings, created_at').eq('id', profile.company_id).single();
          if (company) {
            if (company.settings) setCompanySettings(company.settings);
            if (company.created_at) setCompanyCreatedAt(company.created_at);
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

  const daysSinceCreation = useMemo(() => {
    if (!companyCreatedAt) return 0;
    const created = new Date(companyCreatedAt);
    const now = new Date();
    return Math.max(0, Math.floor((now.getTime() - created.getTime()) / (1000 * 3600 * 24)));
  }, [companyCreatedAt]);

  const accountTier = useMemo(() => {
    if (daysSinceCreation < 2) return { level: 1, limit: 50, label: 'Fase 1 (0-2 días)', progress: 25 };
    if (daysSinceCreation < 6) return { level: 2, limit: 150, label: 'Fase 2 (3-6 días)', progress: 50 };
    if (daysSinceCreation < 13) return { level: 3, limit: 300, label: 'Fase 3 (7-13 días)', progress: 75 };
    return { level: 4, limit: 500, label: 'Fase 4 (14+ días)', progress: 100 };
  }, [daysSinceCreation]);

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

  const showAntiBanInfo = () => {
    MySwal.fire({
      title: 'Políticas Anti-Ban',
      html: `
        <div class="text-left text-sm text-gray-600 dark:text-gray-300">
          <p class="mb-4">El método utilizado simula un dispositivo real y <strong>no es una API oficial</strong>. Existen riesgos de baneo o suspensión de tu cuenta de WhatsApp si incumples las políticas de SPAM.</p>
          <p><strong>Protección de Cuenta Nueva:</strong> Para proteger tu número de bloqueos, el sistema limita automáticamente tus envíos:</p>
          <ul class="list-disc pl-5 mt-2 space-y-1">
            <li>Días 1 y 2: Máx. <strong>50 mensajes diarios</strong></li>
            <li>Días 3 a 6: Máx. <strong>150 mensajes diarios</strong></li>
            <li>Días 7 a 13: Máx. <strong>300 mensajes diarios</strong></li>
            <li>Día 14 en adelante: Máx. <strong>500 mensajes diarios</strong></li>
          </ul>
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
    <div className="flex flex-col gap-6">
      {/* HEADER WITH ANTI BAN INFO AND TITLE */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-semibold dark:text-white-light">Creador de Campañas</h2>
        <button type="button" onClick={showAntiBanInfo} className="btn btn-outline-warning flex items-center gap-2">
          <Info size={18} />
          Información Anti-Ban
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* LEFT: Config & Sequence (2/3 width) */}
        <div className="xl:col-span-2 space-y-6">
          <div className="panel">
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
          </div>

          <div className="panel">
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
        </div>

        {/* RIGHT: Progress Bar & Execution Panel (1/3 width) */}
        <div className="space-y-6">
          {/* Progress Bar Card */}
          <div className="panel bg-gradient-to-br from-white to-gray-50 dark:from-[#0e1726] dark:to-[#191e3a]">
            <div className="flex items-center justify-between mb-4">
              <h5 className="font-semibold text-lg flex items-center gap-2 dark:text-white-light">
                <ShieldCheck className="text-success" size={20} />
                Capacidad de Envío
              </h5>
            </div>
            <div className="mb-4">
              <div className="flex justify-between items-end mb-2">
                <div className="text-sm font-semibold text-primary">{accountTier.label}</div>
                <div className="text-xs text-white-dark">Día {daysSinceCreation}</div>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2.5 overflow-hidden">
                <div 
                  className="bg-success h-full rounded-full transition-all duration-500 ease-in-out" 
                  style={{ width: `${accountTier.progress}%` }}
                ></div>
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Límite actual: <strong className="text-primary">{accountTier.limit} mensajes/día</strong>.
              El límite aumentará conforme tu cuenta acumule antigüedad.
            </p>
          </div>

          <div className="panel">
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
  );
}
