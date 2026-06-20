import { useEffect, useState } from 'react';
import { formatDistanceToNow, differenceInSeconds } from 'date-fns';
import { es } from 'date-fns/locale';
import { Clock, CheckCircle2, XOctagon, Hourglass, PauseCircle, PlayCircle } from 'lucide-react';
import type { WaCampaign } from '../../../types/crm';
import { useCancelCampaign, useCampaignQueue, usePauseCampaign, useResumeCampaign } from '../../../hooks/queries/useCampaigns';
import Badge from "@/components/legacy/Badge";
import Icon from "@/components/legacy/Icon";
import { supabase } from '../../../shared/utils/supabase';

export function CampaignProgressCard({ campaign }: { campaign: WaCampaign }) {
  const { mutateAsync: cancelCampaign, isPending: isCanceling } = useCancelCampaign();
  const { mutateAsync: pauseCampaign, isPending: isPausing } = usePauseCampaign();
  const { mutateAsync: resumeCampaign, isPending: isResuming } = useResumeCampaign();
  
  const { data: queue = [] } = useCampaignQueue(campaign.id);

  const [sessionData, setSessionData] = useState<{ dailySentCount: number, startedAt: string | null } | null>(null);

  useEffect(() => {
    async function fetchSession() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();
        if (!profile?.company_id) return;
        const { data: session } = await supabase.from('wa_sessions').select('daily_sent_count, connection_started_at').eq('company_id', profile.company_id).single();
        if (session) {
          setSessionData({ dailySentCount: session.daily_sent_count || 0, startedAt: session.connection_started_at });
        }
      } catch (err) {
        console.error(err);
      }
    }
    fetchSession();
  }, [campaign.status]); // Refetch on status change

  const pending = campaign.total - (campaign.sent + campaign.failed);
  const percentage = campaign.total > 0 
    ? Math.round(((campaign.sent + campaign.failed) / campaign.total) * 100) 
    : 0;

  // Timezone check
  const now = new Date();
  const limaTimeStr = now.toLocaleString('en-US', { timeZone: 'America/Lima' });
  const limaTime = new Date(limaTimeStr);
  const currentHour = limaTime.getHours();
  const isOutsideBusinessHours = currentHour < 8 || currentHour >= 20;

  // Daily limit check
  let isDailyLimitReached = false;
  let currentLimit = 500;
  if (sessionData) {
    const nowMs = new Date().getTime();
    const startedAtMs = sessionData.startedAt ? new Date(sessionData.startedAt).getTime() : nowMs;
    const daysActive = Math.floor((nowMs - startedAtMs) / (1000 * 60 * 60 * 24));
    
    if (daysActive <= 2) currentLimit = 50;
    else if (daysActive <= 6) currentLimit = 150;
    else if (daysActive <= 13) currentLimit = 300;
    
    if (sessionData.dailySentCount >= currentLimit) {
      isDailyLimitReached = true;
    }
  }

  let etaText = 'Calculando...';
  if (campaign.status === 'pausada') {
    etaText = 'Pausada manualmente';
  } else if (campaign.status === 'running' && isOutsideBusinessHours) {
    etaText = 'Esperando a las 08:00 a.m.';
  } else if (campaign.status === 'running' && isDailyLimitReached) {
    etaText = 'Límite diario alcanzado';
  } else if (queue.length > 0) {
    const pendingItems = queue.filter(q => q.status === 'pendiente');
    if (pendingItems.length > 0) {
      const lastItem = pendingItems[pendingItems.length - 1];
      const secondsLeft = lastItem.scheduledFor ? differenceInSeconds(new Date(lastItem.scheduledFor), new Date()) : 0;
      
      if (secondsLeft <= 0) etaText = 'Próximo a enviar';
      else if (secondsLeft < 60) etaText = `~${secondsLeft} seg restantes`;
      else {
        const mins = Math.floor(secondsLeft / 60);
        const hrs = Math.floor(mins / 60);
        if (hrs > 0) etaText = `~${hrs}h ${mins % 60}m restantes`;
        else etaText = `~${mins} min restantes`;
      }
    } else {
      etaText = 'Finalizando...';
    }
  }

  const handleCancel = async () => {
    if (window.confirm(`¿Seguro que deseas cancelar la campaña "${campaign.name}"?\nSe detendrán los envíos pendientes de inmediato.`)) {
      await cancelCampaign(campaign.id);
    }
  };

  const handlePause = async () => {
    await pauseCampaign(campaign.id);
  };

  const handleResume = async () => {
    await resumeCampaign(campaign.id);
  };

  const getStatusBadge = () => {
    if (campaign.status === 'running' && isOutsideBusinessHours) {
       return <Badge label="Pausada (Noche)" className="badge-outline-secondary" icon="heroicons-outline:moon" />;
    }
    if (campaign.status === 'running' && isDailyLimitReached) {
       return <Badge label="Límite Diario" className="badge-outline-warning" icon="heroicons-outline:shield-exclamation" />;
    }

    switch(campaign.status) {
      case 'running': return <Badge label="En Curso" className="badge-outline-info" icon="heroicons-outline:play" />;
      case 'pausada': return <Badge label="Pausada" className="badge-outline-warning" icon="heroicons-outline:pause" />;
      case 'queued': return <Badge label="En Cola" className="badge-outline-secondary" icon="heroicons-outline:clock" />;
      default: return <Badge label={campaign.status} />;
    }
  };

  return (
    <div className="panel w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-dark dark:text-white-light mb-1">
            {campaign.name}
          </h3>
          <p className="text-sm text-white-dark">
            Segmento: <span className="font-medium text-dark dark:text-white-light">{campaign.targetTag || 'Todos'}</span> • 
            Inició {campaign.startedAt ? formatDistanceToNow(new Date(campaign.startedAt), { addSuffix: true, locale: es }) : 'pronto'}
          </p>
        </div>
        <div>
          {getStatusBadge()}
        </div>
      </div>

      {/* Alertas Inteligentes Anti-Ban */}
      {campaign.status === 'running' && isOutsideBusinessHours && (
        <div className="mb-4 bg-secondary-light dark:bg-secondary-dark-light border border-secondary/20 p-3 rounded-lg flex items-start gap-2">
           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-secondary mt-0.5 flex-shrink-0"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
           <p className="m-0 text-sm text-dark dark:text-white-light leading-tight">
             <strong>Fuera de horario comercial.</strong> Por tu seguridad, los envíos se han detenido temporalmente y se reanudarán automáticamente mañana a las 08:00 a.m. (Hora de Lima).
           </p>
        </div>
      )}

      {campaign.status === 'running' && !isOutsideBusinessHours && isDailyLimitReached && (
        <div className="mb-4 bg-warning-light dark:bg-warning-dark-light border border-warning/20 p-3 rounded-lg flex items-start gap-2">
           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-warning mt-0.5 flex-shrink-0"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/></svg>
           <p className="m-0 text-sm text-dark dark:text-white-light leading-tight">
             <strong>Límite de Calentamiento.</strong> Hoy ya enviaste tus {currentLimit} mensajes permitidos. Los envíos se pausaron por seguridad y continuarán automáticamente mañana.
           </p>
        </div>
      )}

      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-white-dark">Progreso de envío</span>
          <span className="text-sm font-bold text-dark dark:text-white-light">{percentage}%</span>
        </div>
        <div className="w-full bg-[#ebebeb] dark:bg-dark-light rounded-full h-2 mb-2 overflow-hidden">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-500" 
            style={{ width: `${percentage}%` }} 
          />
        </div>
        <div className="flex items-center text-xs text-white-dark">
          <Clock size={12} className="mr-1" /> {etaText}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 py-4 border-y border-[#e0e6ed] dark:border-[#1b2e4b]">
        <div className="text-center p-3 bg-success-light dark:bg-success-dark-light rounded-lg">
          <div className="text-2xl font-bold text-success">{campaign.sent}</div>
          <div className="text-xs font-medium text-success uppercase flex items-center justify-center gap-1 mt-1">
            <CheckCircle2 size={12} /> Enviados
          </div>
        </div>
        <div className="text-center p-3 bg-danger-light dark:bg-danger-dark-light rounded-lg">
          <div className="text-2xl font-bold text-danger">{campaign.failed}</div>
          <div className="text-xs font-medium text-danger uppercase flex items-center justify-center gap-1 mt-1">
            <XOctagon size={12} /> Fallidos
          </div>
        </div>
        <div className="text-center p-3 bg-warning-light dark:bg-warning-dark-light rounded-lg">
          <div className="text-2xl font-bold text-warning">{pending}</div>
          <div className="text-xs font-medium text-warning uppercase flex items-center justify-center gap-1 mt-1">
            <Hourglass size={12} /> Pendientes
          </div>
        </div>
        <div className="text-center p-3 bg-secondary-light dark:bg-secondary-dark-light rounded-lg">
          <div className="text-2xl font-bold text-secondary">{campaign.total}</div>
          <div className="text-xs font-medium text-secondary uppercase flex items-center justify-center gap-1 mt-1">
            Total
          </div>
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-3">
        {campaign.status === 'pausada' && (
          <button 
            onClick={handleResume}
            disabled={isResuming || isOutsideBusinessHours || isDailyLimitReached}
            className="btn btn-success"
          >
            <PlayCircle size={18} className="mr-2" />
            Reanudar
          </button>
        )}

        {campaign.status === 'running' && (
          <button 
            onClick={handlePause}
            disabled={isPausing}
            className="btn btn-warning"
          >
            <PauseCircle size={18} className="mr-2" />
            Pausar
          </button>
        )}

        <button 
          onClick={handleCancel}
          disabled={isCanceling}
          className="btn btn-danger"
        >
          {isCanceling ? (
            <>
              <svg className="animate-spin ltr:-ml-1 ltr:mr-3 rtl:-mr-1 rtl:ml-3 h-5 w-5 text-white mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Cancelando...
            </>
          ) : (
            <>
              <Icon icon="heroicons-outline:x-circle" className="mr-2 text-[20px]" />
              Cancelar
            </>
          )}
        </button>
      </div>
    </div>
  );
}
