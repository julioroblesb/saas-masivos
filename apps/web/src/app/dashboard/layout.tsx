import 'server-only';
import DefaultLayout from '@/components/layouts/default-layout';
import { TenantAccessService } from '@/server/access/tenant-access-service';
import { AlertCircle } from 'lucide-react';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const access = await TenantAccessService.forCurrentUser();

  if (!access.allowed && access.state !== 'demo') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-6 text-zinc-100">
        <div className="flex max-w-md flex-col items-center text-center space-y-4 rounded-2xl border border-red-900/50 bg-red-950/20 p-8 shadow-2xl">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-red-900/30 text-red-400">
            <AlertCircle className="size-8" aria-hidden="true" />
          </div>
          <h2 className="text-xl font-bold text-white">Acceso Bloqueado por Suscripción</h2>
          <p className="text-sm text-zinc-400">
            Tu empresa tiene la suscripción vencida o suspendida. Por favor, ponte en contacto con
            administración para restablecer el acceso.
          </p>
        </div>
      </div>
    );
  }

  return <DefaultLayout isDemo={access.state === 'demo'}>{children}</DefaultLayout>;
}
