import { format } from 'date-fns';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { getAgendaData } from './actions';
import { AgendaView } from './AgendaView';

export const dynamic = 'force-dynamic';

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;

  // Determine the month to display (defaults to current month)
  const monthStr = month && /^\d{4}-\d{2}$/.test(month) ? month : format(new Date(), 'yyyy-MM');
  const [year, monthNum] = monthStr.split('-').map(Number);
  const monthDate = new Date(year, monthNum - 1, 1);

  // Calculate the full calendar grid range (Mon–Sun spanning the month)
  const gridStart = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 1 });
  const gridEnd   = endOfWeek(endOfMonth(monthDate),   { weekStartsOn: 1 });

  const { services, visits, contacts, staff, error } = await getAgendaData(
    gridStart.toISOString(),
    gridEnd.toISOString(),
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="type-page-title text-zinc-900 dark:text-white">Agenda y citas</h1>
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
        initialMonth={monthStr}
      />
    </div>
  );
}
