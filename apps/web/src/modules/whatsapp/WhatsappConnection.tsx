'use client';

import Image from 'next/image';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  QrCode,
  RefreshCw,
  Smartphone,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface WhatsappConnectionProps {
  companyId?: string | null;
}

interface SessionStatus {
  code?: string;
  evo_state?: string;
  is_demo?: boolean;
  qr: string | null;
  status: string;
}

const ACTIVE_STATES = new Set([
  'conectando',
  'esperando_qr',
  'generando_qr',
  'provisionando',
]);

async function readJson(response: Response): Promise<SessionStatus> {
  const data = (await response.json()) as SessionStatus & { error?: string };
  if (!response.ok) {
    throw new Error(data.error || 'No se pudo consultar la conexión de WhatsApp');
  }
  return data;
}

async function getSessionStatus(): Promise<SessionStatus> {
  return readJson(await fetch('/api/wa/status', { cache: 'no-store' }));
}

export function WhatsappConnection({ companyId }: WhatsappConnectionProps) {
  const queryClient = useQueryClient();
  const queryKey = ['whatsapp-session', companyId] as const;
  const statusQuery = useQuery({
    queryKey,
    queryFn: getSessionStatus,
    enabled: Boolean(companyId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && ACTIVE_STATES.has(status) && query.state.dataUpdateCount < 20
        ? 3_000
        : false;
    },
    retry: 1,
    staleTime: 10_000,
  });

  const startSession = useMutation({
    mutationFn: async () =>
      readJson(await fetch('/api/wa/instance', { method: 'POST' })),
    onSuccess: (data) => {
      queryClient.setQueryData<SessionStatus>(queryKey, data);
      toast.success('Inicializando servicio de WhatsApp…');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const disconnectSession = useMutation({
    mutationFn: async () =>
      readJson(await fetch('/api/wa/disconnect', { method: 'POST' })),
    onSuccess: () => {
      queryClient.setQueryData<SessionStatus>(queryKey, {
        is_demo: statusQuery.data?.is_demo,
        qr: null,
        status: 'desconectado',
      });
      toast.success('WhatsApp desvinculado correctamente');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!companyId) {
    return (
      <p className="text-sm text-zinc-500" role="status">
        La cuenta aún no tiene una empresa asociada.
      </p>
    );
  }

  if (statusQuery.isPending) {
    return (
      <div className="flex items-center gap-2 text-zinc-500" role="status">
        <Loader2 className="size-5 animate-spin" aria-hidden="true" />
        <span className="text-sm">Revisando conexión…</span>
      </div>
    );
  }

  if (statusQuery.isError) {
    return (
      <div
        className="flex max-w-xl flex-col items-start gap-3 rounded-2xl border border-danger/20 bg-danger/5 p-4"
        role="alert"
      >
        <p className="text-sm text-danger">{statusQuery.error.message}</p>
        <Button type="button" variant="outline" onClick={() => statusQuery.refetch()}>
          <RefreshCw aria-hidden="true" />
          Reintentar
        </Button>
      </div>
    );
  }

  const session = statusQuery.data;
  const status = session?.status ?? 'desconectado';
  const isDemo = Boolean(session?.is_demo);
  const isActive = ACTIVE_STATES.has(status);
  const isBusy = startSession.isPending || disconnectSession.isPending;

  const abortConnection = () => {
    if (!disconnectSession.isPending) {
      disconnectSession.mutate();
    }
  };

  if (status === 'conectado') {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <div
          className="flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-2 text-green-700 dark:border-green-900/50 dark:bg-green-900/20 dark:text-green-400"
          role="status"
        >
          <CheckCircle2 className="size-5" aria-hidden="true" />
          <span className="text-sm font-medium">WhatsApp vinculado</span>
        </div>
        <Button
          type="button"
          variant="destructive"
          disabled={isBusy || isDemo}
          onClick={() => {
            if (window.confirm('¿Deseas desvincular WhatsApp y detener las campañas?')) {
              disconnectSession.mutate();
            }
          }}
          title={isDemo ? 'No disponible en modo demostración' : undefined}
        >
          {disconnectSession.isPending ? 'Desvinculando…' : 'Desvincular'}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {status === 'error_desconexion' && (
        <div
          className="flex max-w-xl flex-col gap-2 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-900/20"
          role="alert"
        >
          <h3 className="flex items-center gap-2 font-semibold text-red-900 dark:text-red-300">
            <AlertCircle className="size-4" aria-hidden="true" />
            Envíos pausados por errores
          </h3>
          <p className="text-sm text-red-800 dark:text-red-200/80">
            Vuelve a vincular WhatsApp para reanudar los envíos.
          </p>
        </div>
      )}

      {!isActive && (
        <Button
          type="button"
          onClick={() => startSession.mutate()}
          disabled={isBusy || isDemo}
          className="min-h-11 w-fit bg-green-600 text-white hover:bg-green-700"
          title={isDemo ? 'No disponible en modo demostración' : undefined}
        >
          {startSession.isPending ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <Smartphone aria-hidden="true" />
          )}
          {startSession.isPending ? 'Iniciando…' : 'Vincular WhatsApp'}
        </Button>
      )}

      <Dialog
        open={isActive}
        onOpenChange={(open) => {
          if (!open) abortConnection();
        }}
      >
        <DialogContent className="max-w-md p-6 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
                <Smartphone className="size-5 text-primary" aria-hidden="true" />
              </span>
              Vincular dispositivo
            </DialogTitle>
            <DialogDescription>
              La ventana se actualizará automáticamente mientras se prepara el código.
            </DialogDescription>
          </DialogHeader>

          <div className="flex min-h-72 flex-col items-center justify-center py-4">
            {session?.qr ? (
              <>
                <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-3 shadow-lg">
                  <Image
                    src={session.qr}
                    alt="Código QR para vincular WhatsApp"
                    width={220}
                    height={220}
                    unoptimized
                    className="rounded-md"
                  />
                </div>
                <div className="max-w-xs text-zinc-600 dark:text-zinc-300">
                  <p className="mb-3 text-center font-semibold text-zinc-900 dark:text-zinc-100">
                    Abre WhatsApp y escanea
                  </p>
                  <ol className="list-inside list-decimal space-y-2 text-sm">
                    <li>Abre Menú o Configuración.</li>
                    <li>Selecciona Dispositivos vinculados.</li>
                    <li>Toca Vincular un dispositivo.</li>
                  </ol>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center text-center" role="status">
                <span className="mb-4 flex size-20 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
                  <QrCode className="size-10 text-zinc-400" aria-hidden="true" />
                </span>
                <Loader2 className="mb-3 size-6 animate-spin text-green-600" aria-hidden="true" />
                <p className="font-medium">Preparando código QR…</p>
                <Button
                  type="button"
                  variant="ghost"
                  className="mt-4"
                  onClick={() => statusQuery.refetch()}
                  disabled={statusQuery.isFetching}
                >
                  <RefreshCw aria-hidden="true" />
                  Consultar ahora
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
