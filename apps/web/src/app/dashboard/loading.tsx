export default function DashboardLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Cargando panel">
      <div className="h-10 w-64 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="h-32 animate-pulse rounded-3xl bg-zinc-100 dark:bg-zinc-900"
          />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-3xl bg-zinc-100 dark:bg-zinc-900" />
      <span className="sr-only">Cargando contenido del panel</span>
    </div>
  );
}
