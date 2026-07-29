import { getAtencionesData } from './actions';
import { AtencionesManager } from './AtencionesManager';

export const dynamic = 'force-dynamic';

export default async function AtencionesPage({
  searchParams,
}: {
  searchParams: Promise<{
    startDate?: string;
    endDate?: string;
    historyPage?: string;
    historyPageSize?: string;
    view?: string;
  }>;
}) {
  const { startDate, endDate, historyPage, historyPageSize, view } = await searchParams;
  const parsedHistoryPage = Math.max(1, Number.parseInt(historyPage || '1', 10) || 1);
  const requestedPageSize = Number.parseInt(historyPageSize || '10', 10) || 10;
  const parsedHistoryPageSize = [10, 25, 50].includes(requestedPageSize)
    ? requestedPageSize
    : 10;
  const {
    services,
    visits,
    contacts,
    staff,
    paymentMethods,
    historyTotal,
    visitCounts,
    error,
  } = await getAtencionesData(
    startDate,
    endDate,
    parsedHistoryPage,
    parsedHistoryPageSize,
  );
  const managerDataVersion = [
    parsedHistoryPage,
    parsedHistoryPageSize,
    contacts.length,
    services.length,
    ...visits.map(
      (visit) =>
        `${visit.id}:${visit.status}:${visit.payment_status}:${visit.amount_paid ?? 0}`,
    ),
  ].join('|');

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-black-light dark:border-dark-light">
        <div>
          <h1 className="type-page-title text-black dark:text-white">Registro de atenciones</h1>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mt-2">
            Gestiona las visitas de tus pacientes, asocia servicios y programa seguimientos automáticamente.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-danger/10 text-danger border border-danger/20 font-medium">
          Ocurrió un error al cargar la información: {error}
        </div>
      )}

      <AtencionesManager
        key={managerDataVersion}
        initialVisits={visits} 
        services={services} 
        contacts={contacts} 
        staffList={staff}
        paymentMethods={paymentMethods}
        currentStartDate={startDate || ''}
        currentEndDate={endDate || ''}
        historyTotal={historyTotal}
        initialHistoryPage={parsedHistoryPage}
        initialHistoryPageSize={parsedHistoryPageSize}
        initialTab={view === 'historial' ? 'historial' : 'activas'}
        visitCounts={visitCounts}
      />
    </div>
  );
}
