import { getAtencionesData } from '../atenciones/actions';
import { AgendaView } from './AgendaView';

export const dynamic = 'force-dynamic';

export default async function AgendaPage() {
  const { services, visits, contacts, staff, error } = await getAtencionesData();

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-white">Agenda & Citas</h1>
          <p className="text-sm font-medium text-zinc-500 mt-2">
            Gestiona la disponibilidad, organiza reservas y visualiza la carga de trabajo de tu equipo.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-danger/10 text-danger border border-danger/20 font-medium">
          Ocurrió un error al cargar la información: {error}
        </div>
      )}

      <AgendaView 
        initialVisits={visits} 
        services={services} 
        contacts={contacts} 
        staffList={staff}
      />
    </div>
  );
}
