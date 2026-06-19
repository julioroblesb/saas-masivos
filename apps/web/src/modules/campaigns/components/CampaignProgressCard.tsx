import { formatDistanceToNow, differenceInSeconds } from 'date-fns';
import { es } from 'date-fns/locale';
import { Clock, CheckCircle2, XOctagon, Hourglass } from 'lucide-react';
import type { WaCampaign } from '../../../types/crm';
import { useCancelCampaign, useCampaignQueue } from '../../../hooks/queries/useCampaigns';
import Card from "@/components/legacy/Card";
import Badge from "@/components/legacy/Badge";
import Icon from "@/components/legacy/Icon";

export function CampaignProgressCard({ campaign }: { campaign: WaCampaign }) {
  const { mutateAsync: cancelCampaign, isPending: isCanceling } = useCancelCampaign();
  
  const { data: queue = [] } = useCampaignQueue(campaign.id);

  const pending = campaign.total - (campaign.sent + campaign.failed);
  const percentage = campaign.total > 0 
    ? Math.round(((campaign.sent + campaign.failed) / campaign.total) * 100) 
    : 0;

  let etaText = 'Calculando...';
  if (queue.length > 0) {
    const pendingItems = queue.filter(q => q.status === 'pending');
    if (pendingItems.length > 0) {
      const lastItem = pendingItems[pendingItems.length - 1];
      const secondsLeft = differenceInSeconds(new Date(lastItem.scheduledFor), new Date());
      
      if (secondsLeft <= 0) etaText = 'Próximo a terminar';
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

  const getStatusBadge = () => {
    switch(campaign.status) {
      case 'running': return <Badge label="En Curso" className="bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300" icon="heroicons-outline:play" />;
      case 'paused': return <Badge label="Pausada" className="bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-300" icon="heroicons-outline:pause" />;
      case 'queued': return <Badge label="En Cola" className="bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300" icon="heroicons-outline:clock" />;
      default: return <Badge label={campaign.status} />;
    }
  };

  return (
    <Card className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
            {campaign.name}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Segmento: <span className="font-medium text-slate-700 dark:text-slate-300">{campaign.targetTag || 'Todos'}</span> • 
            Inició {campaign.startedAt ? formatDistanceToNow(new Date(campaign.startedAt), { addSuffix: true, locale: es }) : 'pronto'}
          </p>
        </div>
        <div>
          {getStatusBadge()}
        </div>
      </div>

      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Progreso de envío</span>
          <span className="text-sm font-bold text-slate-900 dark:text-white">{percentage}%</span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mb-2 overflow-hidden">
          <div 
            className="bg-indigo-500 h-2 rounded-full transition-all duration-500" 
            style={{ width: `${percentage}%` }} 
          />
        </div>
        <div className="flex items-center text-xs text-slate-500 dark:text-slate-400">
          <Clock size={12} className="mr-1" /> {etaText}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 py-4 border-y border-slate-200 dark:border-slate-700">
        <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{campaign.sent}</div>
          <div className="text-xs font-medium text-emerald-700 dark:text-emerald-500 uppercase flex items-center justify-center gap-1 mt-1">
            <CheckCircle2 size={12} /> Enviados
          </div>
        </div>
        <div className="text-center p-3 bg-rose-50 dark:bg-rose-900/20 rounded-lg">
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">{campaign.failed}</div>
          <div className="text-xs font-medium text-rose-700 dark:text-rose-500 uppercase flex items-center justify-center gap-1 mt-1">
            <XOctagon size={12} /> Fallidos
          </div>
        </div>
        <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{pending}</div>
          <div className="text-xs font-medium text-amber-700 dark:text-amber-500 uppercase flex items-center justify-center gap-1 mt-1">
            <Hourglass size={12} /> Pendientes
          </div>
        </div>
        <div className="text-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">{campaign.total}</div>
          <div className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase flex items-center justify-center gap-1 mt-1">
            Total
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button 
          onClick={handleCancel}
          disabled={isCanceling}
          className="bg-rose-500 hover:bg-rose-600 text-white inline-flex justify-center items-center px-4 py-2 rounded-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
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
              Cancelar Campaña
            </>
          )}
        </button>
      </div>
    </Card>
  );
}
