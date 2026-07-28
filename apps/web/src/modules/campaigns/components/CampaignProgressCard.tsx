import { formatDistanceToNow, differenceInSeconds } from 'date-fns';
import { es } from 'date-fns/locale';
import { Clock, CheckCircle2, XOctagon, Hourglass, PauseCircle, PlayCircle } from 'lucide-react';
import type { WaCampaign } from '../../../types/crm';
import {
  useCancelCampaign,
  useCampaignQueue,
  usePauseCampaign,
  useResumeCampaign,
} from '../../../hooks/queries/useCampaigns';
import Badge from '@/components/legacy/Badge';
import Icon from '@/components/legacy/Icon';

export function CampaignProgressCard({ campaign }: { campaign: WaCampaign }) {
  const { mutateAsync: cancelCampaign, isPending: isCanceling } = useCancelCampaign();
  const { mutateAsync: pauseCampaign, isPending: isPausing } = usePauseCampaign();
  const { mutateAsync: resumeCampaign, isPending: isResuming } = useResumeCampaign();

  const { data: queue = [] } = useCampaignQueue(campaign.id);

  const pending = campaign.total - (campaign.sent + campaign.failed);
  const percentage =
    campaign.total > 0 ? Math.round(((campaign.sent + campaign.failed) / campaign.total) * 100) : 0;

  let etaText = 'Calculando...';
  if (campaign.status === 'pausada') {
    etaText = 'Pausada manualmente';
  } else if (queue.length > 0) {
    const pendingItems = queue.filter(
      (queueItem) => queueItem.status === 'queued' || queueItem.status === 'retry_scheduled',
    );
    if (pendingItems.length > 0) {
      const lastItem = pendingItems[pendingItems.length - 1];
      const secondsLeft = lastItem.scheduledFor
        ? differenceInSeconds(new Date(lastItem.scheduledFor), new Date())
        : 0;

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
    if (
      window.confirm(
        `¿Seguro que deseas cancelar la campaña "${campaign.name}"?\nSe detendrán los envíos pendientes de inmediato.`,
      )
    ) {
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
    switch (campaign.status) {
      case 'running':
        return (
          <Badge label="En Curso" className="badge-outline-info" icon="heroicons-outline:play" />
        );
      case 'pausada':
        return (
          <Badge label="Pausada" className="badge-outline-warning" icon="heroicons-outline:pause" />
        );
      case 'queued':
        return (
          <Badge
            label="En Cola"
            className="badge-outline-secondary"
            icon="heroicons-outline:clock"
          />
        );
      default:
        return <Badge label={campaign.status} />;
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
            Segmento:{' '}
            <span className="font-medium text-dark dark:text-white-light">
              {campaign.targetTag || 'Todos'}
            </span>{' '}
            • Inició{' '}
            {campaign.startedAt
              ? formatDistanceToNow(new Date(campaign.startedAt), { addSuffix: true, locale: es })
              : 'pronto'}
          </p>
        </div>
        <div>{getStatusBadge()}</div>
      </div>

      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-white-dark">Progreso de envío</span>
          <span className="text-sm font-bold text-dark dark:text-white-light">{percentage}%</span>
        </div>
        <div className="w-full bg-black-light/20 dark:bg-dark-light rounded-full h-2 mb-2 overflow-hidden">
          <div
            className="bg-primary h-2 rounded-full transition-[width] duration-500 ease-linear"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="flex items-center text-xs text-white-dark">
          <Clock size={12} className="mr-1" /> {etaText}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 py-4 border-y border-black-light/50 dark:border-dark-dark-light">
        <div className="text-center p-3 bg-success-light dark:bg-success-dark-light rounded-lg">
          <div className="type-metric text-success">{campaign.sent}</div>
          <div className="text-xs font-medium text-success uppercase flex items-center justify-center gap-1 mt-1">
            <CheckCircle2 size={12} /> Enviados
          </div>
        </div>
        <div className="text-center p-3 bg-danger-light dark:bg-danger-dark-light rounded-lg">
          <div className="type-metric text-danger">{campaign.failed}</div>
          <div className="text-xs font-medium text-danger uppercase flex items-center justify-center gap-1 mt-1">
            <XOctagon size={12} /> Fallidos
          </div>
        </div>
        <div className="text-center p-3 bg-warning-light dark:bg-warning-dark-light rounded-lg">
          <div className="type-metric text-warning">{pending}</div>
          <div className="text-xs font-medium text-warning uppercase flex items-center justify-center gap-1 mt-1">
            <Hourglass size={12} /> Pendientes
          </div>
        </div>
        <div className="text-center p-3 bg-secondary-light dark:bg-secondary-dark-light rounded-lg">
          <div className="type-metric text-secondary">{campaign.total}</div>
          <div className="text-xs font-medium text-secondary uppercase flex items-center justify-center gap-1 mt-1">
            Total
          </div>
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-3">
        {campaign.status === 'pausada' && (
          <button
            onClick={handleResume}
            disabled={isResuming}
            className="btn btn-success"
          >
            <PlayCircle size={18} className="mr-2" />
            Reanudar
          </button>
        )}

        {campaign.status === 'running' && (
          <button onClick={handlePause} disabled={isPausing} className="btn btn-warning">
            <PauseCircle size={18} className="mr-2" />
            Pausar
          </button>
        )}

        <button onClick={handleCancel} disabled={isCanceling} className="btn btn-danger">
          {isCanceling ? (
            <>
              <svg
                className="animate-spin ltr:-ml-1 ltr:mr-3 rtl:-mr-1 rtl:ml-3 h-5 w-5 text-white mr-2"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Cancelando...
            </>
          ) : (
            <>
              <Icon icon="heroicons-outline:x-circle" className="mr-2 text-xl" />
              Cancelar
            </>
          )}
        </button>
      </div>
    </div>
  );
}
