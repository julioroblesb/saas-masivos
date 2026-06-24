import { createClient } from '@/utils/supabase/server';
import { getSupabaseAdmin } from '@/utils/supabase/admin';
import { redirect } from 'next/navigation';
import { CreateTenantForm } from './CreateTenantForm';
import { TenantTable } from './TenantTable';
import { Building2, Users, Activity, UserPlus } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const supabase = await createClient();
  const supabaseAdmin = getSupabaseAdmin();
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

  const activeCompanies = companies?.filter(c => c.status === 'active')?.length || 0;
  const totalCompanies = companies?.length || 0;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-black-light dark:border-dark-light">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-black dark:text-white">Gestión de Clientes</h1>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mt-2">Administra los tenants (agencias) y sus suscripciones.</p>
        </div>
      </div>
      
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="panel border border-black-light dark:border-dark-light rounded-2xl bg-white dark:bg-dark shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">Total Tenants</p>
              <h4 className="text-2xl font-bold mt-2 text-black dark:text-white">{totalCompanies}</h4>
            </div>
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <Building2 className="w-6 h-6" />
            </div>
          </div>
        </div>
        
        <div className="panel border border-black-light dark:border-dark-light rounded-2xl bg-white dark:bg-dark shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">Tenants Activos</p>
              <h4 className="text-2xl font-bold mt-2 text-success">{activeCompanies}</h4>
            </div>
            <div className="p-3 bg-success/10 text-success rounded-xl">
              <Activity className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-4">
          <div className="panel h-full border border-black-light dark:border-dark-light rounded-2xl bg-white dark:bg-dark shadow-sm">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-primary/10 text-primary rounded-lg shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <h5 className="text-lg font-bold text-black dark:text-white">Empresas Registradas</h5>
            </div>
            <TenantTable companies={companies || []} />
          </div>
        </div>

        <div className="space-y-4">
          <div className="panel h-full border border-black-light dark:border-dark-light rounded-2xl bg-white dark:bg-dark shadow-sm">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-secondary/10 text-secondary rounded-lg shrink-0">
                <UserPlus className="w-5 h-5" />
              </div>
              <h5 className="text-lg font-bold text-black dark:text-white">Añadir Nuevo Cliente</h5>
            </div>
            <CreateTenantForm />
          </div>
        </div>
      </div>
    </div>
  );
}
