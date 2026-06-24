import { getClientsMetrics } from './actions';
import { ClientsTable } from './ClientsTable';

export const dynamic = 'force-dynamic';

export default async function ClientesPage() {
  const { data: clients, error } = await getClientsMetrics();

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-black-light dark:border-dark-light">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-white">Base de Datos de Clientes</h1>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mt-2">
            Administra todos los contactos con los que has interactuado, visualiza su nivel de respuesta y filtra aquellos inactivos.
          </p>
        </div>
      </div>

      <div className="rounded-3xl bg-white dark:bg-dark border border-black-light dark:border-dark-light shadow-sm p-0 overflow-hidden">
        {error ? (
          <div className="p-8 text-center text-danger font-semibold">
            {error}
          </div>
        ) : (
          <ClientsTable initialClients={clients || []} />
        )}
      </div>
    </div>
  );
}
