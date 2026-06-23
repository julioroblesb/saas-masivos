import { getAtencionesData } from './actions';
import { AtencionesManager } from './AtencionesManager';

export const dynamic = 'force-dynamic';

export default async function AtencionesPage() {
  const { services, visits, contacts, error } = await getAtencionesData();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white-light">Registro de Atenciones</h1>
          <p className="text-slate-500 dark:text-white-dark text-sm mt-1">
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
      />
    </div>
  );
}
