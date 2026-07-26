'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DashboardError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard render failed', {
      digest: error.digest,
      message: error.message,
    });
  }, [error]);

  return (
    <section
      className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center rounded-3xl border border-danger/20 bg-danger/5 p-8 text-center"
      aria-labelledby="dashboard-error-title"
    >
      <AlertTriangle className="size-10 text-danger" aria-hidden="true" />
      <h1 id="dashboard-error-title" className="mt-4 text-2xl font-semibold">
        No pudimos cargar esta sección
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300" role="alert">
        Puedes reintentar sin perder los cambios que ya fueron guardados.
      </p>
      <Button type="button" onClick={unstable_retry} className="mt-6 min-h-11 px-4">
        <RefreshCw aria-hidden="true" />
        Reintentar
      </Button>
    </section>
  );
}
