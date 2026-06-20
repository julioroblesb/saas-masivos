import { createClient } from '@/utils/supabase/server';
import { getSupabaseAdmin } from '@/utils/supabase/admin';
import { redirect } from 'next/navigation';
import { CreateTenantForm } from './CreateTenantForm';
import { TenantTable } from './TenantTable';

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

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
          <h5 className="text-2xl font-bold text-dark dark:text-white-light">Gestión de Clientes</h5>
      </div>
      
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        <div className="xl:col-span-2 space-y-4">
          <div className="panel h-full">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-primary/10 text-primary rounded-lg shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <h5 className="text-lg font-semibold text-dark dark:text-white-light">Empresas Registradas</h5>
            </div>
            <TenantTable companies={companies || []} />
          </div>
        </div>

        <div className="space-y-4">
          <div className="panel h-full">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-success/10 text-success rounded-lg shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>
              </div>
              <h5 className="text-lg font-semibold text-dark dark:text-white-light">Añadir Nuevo Cliente</h5>
            </div>
            <CreateTenantForm />
          </div>
        </div>

      </div>
    </div>
  );
}
