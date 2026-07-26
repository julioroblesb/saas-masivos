'use client';

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="es">
      <body>
        <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-6">
          <section
            className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-8 text-center shadow-sm"
            aria-labelledby="global-error-title"
          >
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">
              Renova CRM
            </p>
            <h1 id="global-error-title" className="mt-3 text-2xl font-semibold text-zinc-950">
              No pudimos cargar la aplicación
            </h1>
            <p className="mt-3 text-sm leading-6 text-zinc-600" role="alert">
              {error.digest
                ? `Referencia del incidente: ${error.digest}`
                : 'Ocurrió un error inesperado. Tus datos no se han perdido.'}
            </p>
            <button
              type="button"
              onClick={unstable_retry}
              className="mt-6 min-h-11 rounded-xl bg-primary px-5 py-2.5 font-medium text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Reintentar
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
