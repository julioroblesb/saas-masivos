import { getClientsMetrics } from './actions';
import { ClientsTable } from './ClientsTable';

export const dynamic = 'force-dynamic';

export default async function ClientesPage() {
  const { data: clients, error } = await getClientsMetrics();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white-light">Base de Datos de Clientes</h1>
          <p className="text-slate-500 dark:text-white-dark text-sm mt-1">
            Administra todos los contactos con los que has interactuado, visualiza su nivel de respuesta y filtra aquellos inactivos.
          </p>
        </div>
      </div>

      <div className="panel border-0 shadow-sm p-0 overflow-hidden">
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
