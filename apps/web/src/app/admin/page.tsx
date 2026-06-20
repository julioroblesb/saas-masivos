import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { redirect } from 'next/navigation';
import { CreateTenantForm } from './CreateTenantForm';
import { TenantTable } from './TenantTable';
import { Header } from '@/components/Header';

export const dynamic = 'force-dynamic';

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

  // Obtener la lista de empresas clientes
  const { data: companies, error } = await supabaseAdmin
    .from('companies')
    .select('*, profiles(full_name)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching companies:', error);
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <Header title="Panel Súper Admin" />
      <div className="p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <header className="flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Gestión de Clientes</h1>
              <p className="text-zinc-500 dark:text-zinc-400">Control central de Tenants</p>
            </div>
          </header>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div className="md:col-span-2 space-y-4">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Empresas Registradas</h2>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
              <TenantTable companies={companies || []} />
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Añadir Nuevo Cliente</h2>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-xl shadow-sm">
              <CreateTenantForm />
            </div>
          </div>

        </div>
        </div>
      </div>
    </div>
  );
}
