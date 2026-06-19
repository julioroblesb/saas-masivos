import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Verificar si es super admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'super_admin') {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">Panel de Super Administrador</h1>
          <p className="text-slate-500">Gestión de empresas y accesos (Tenants).</p>
        </header>
        
        <main>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Empresas Registradas</h2>
            <p className="text-sm text-slate-500 mb-6">Próximamente: Lista de empresas y formulario para crear nuevas cuentas con API Admin.</p>
            {/* Aquí iría la lista de compañías obtenidas de Supabase */}
          </div>
        </main>
      </div>
    </div>
  );
}
