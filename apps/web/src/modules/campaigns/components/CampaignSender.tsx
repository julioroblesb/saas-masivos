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
  const [companySettings, setCompanySettings] = useState<{ greetings?: string[], farewells?: string[] }>({});
  const [companyCreatedAt, setCompanyCreatedAt] = useState<string>('');

  const [targetContactsCount, setTargetContactsCount] = useState<number>(0);

  useEffect(() => {
    setTargetContactsCount(targetContactIds.length + targetRawPhones.length);
  }, [targetContactIds, targetRawPhones]);

  const [totalLifetimeSent, setTotalLifetimeSent] = useState<number>(0);

  useEffect(() => {
    async function loadSettingsAndTags() {
      try {
        const { supabase } = await import('../../../shared/utils/supabase');

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();
        if (profile?.company_id) {
          const { data: company } = await supabase.from('companies').select('settings, created_at').eq('id', profile.company_id).single();
          if (company) {
            if (company.settings) setCompanySettings(company.settings);
            if (company.created_at) setCompanyCreatedAt(company.created_at);
          }

          // Cargar total de mensajes enviados históricamente
          const { data: campaigns } = await supabase.from('crm_wa_campaigns').select('sent_count').eq('company_id', profile.company_id);
          const count = campaigns?.reduce((acc: number, curr: any) => acc + (curr.sent_count || 0), 0) || 0;
          setTotalLifetimeSent(count);
        }
      } catch (err) {
        console.error('Error loading settings and tags', err);
      }
    }
    loadSettingsAndTags();
  }, []);



  const daysSinceCreation = useMemo(() => {
    if (!companyCreatedAt) return 1;
    const created = new Date(companyCreatedAt);
    const now = new Date();
    return Math.max(1, Math.floor((now.getTime() - created.getTime()) / (1000 * 3600 * 24)) + 1);
  }, [companyCreatedAt]);

  const accountTier = useMemo(() => {
    if (totalLifetimeSent < 100) return { level: 1, limit: 50, label: 'Fase 1 (Inicial)', progress: 25, nextLimit: 150, nextReqMsgs: 100 };
    if (totalLifetimeSent < 500) return { level: 2, limit: 150, label: 'Fase 2 (Calentamiento)', progress: 50, nextLimit: 300, nextReqMsgs: 500 };
    if (totalLifetimeSent < 1500) return { level: 3, limit: 300, label: 'Fase 3 (Expansión)', progress: 75, nextLimit: 500, nextReqMsgs: 1500 };
    return { level: 4, limit: 500, label: 'Fase 4 (Máxima)', progress: 100, nextLimit: null, nextReqMsgs: null };
  }, [totalLifetimeSent]);

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

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* LEFT: Config & Sequence & Delays (2/3 width) */}
        <div className="xl:col-span-2 space-y-16">
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
              <div className="flex items-center justify-between mb-4">
                <h5 className="font-bold text-lg flex items-center gap-2 dark:text-white-light">
                  <ShieldCheck className="text-success" size={20} />
                  Salud de Cuenta
                </h5>
              </div>
              <div className="mb-4">
                <div className="flex justify-between items-end mb-2">
                  <div className="text-sm font-semibold text-primary">{accountTier.label}</div>
                  <div className="text-xs text-white-dark">{totalLifetimeSent} Enviados</div>
                </div>
                <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-success h-full rounded-full transition-[width] duration-500 ease-linear" 
                    style={{ width: `${accountTier.progress}%` }}
                  ></div>
                </div>
              </div>
              <div className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">
                Límite actual: <strong className="text-primary">{accountTier.limit} msgs/día</strong>.
                <br className="mb-1" />
                {accountTier.nextLimit && accountTier.nextReqMsgs ? (
                  <span>
                    Sube a <strong>{accountTier.nextLimit} msgs/día</strong> al superar <strong>{accountTier.nextReqMsgs}</strong> envíos históricos.
                  </span>
                ) : (
                  <span>Has alcanzado la capacidad máxima recomendada.</span>
                )}
              </div>
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
