import { getAtencionesData } from './actions';
import { AtencionesManager } from './AtencionesManager';

export const dynamic = 'force-dynamic';

export default async function AtencionesPage({ searchParams }: { searchParams: { startDate?: string; endDate?: string } }) {
  const { startDate, endDate } = searchParams;
  const { services, visits, contacts, staff, paymentMethods, error } = await getAtencionesData(startDate, endDate);

  return (
    <div className="space-y-6">
      <div className="mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-black-light dark:border-dark-light">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-white">Registro de Atenciones</h1>
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
        initialVisits={visits} 
        services={services} 
        contacts={contacts} 
        staffList={staff}
        paymentMethods={paymentMethods}
        currentStartDate={startDate || ''}
        currentEndDate={endDate || ''}
      />
    </div>
  );
}
