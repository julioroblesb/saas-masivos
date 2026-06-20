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
      <div className="mb-5 flex items-center justify-between">
          <h5 className="text-lg font-semibold text-dark dark:text-white-light">Gestión de Clientes (Súper Admin)</h5>
      </div>
      
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        <div className="xl:col-span-2 space-y-4">
          <div className="panel">
            <div className="mb-5 flex items-center justify-between">
              <h5 className="text-lg font-semibold text-dark dark:text-white-light">Empresas Registradas</h5>
            </div>
            <TenantTable companies={companies || []} />
          </div>
        </div>

        <div className="space-y-4">
          <div className="panel">
            <div className="mb-5 flex items-center justify-between">
              <h5 className="text-lg font-semibold text-dark dark:text-white-light">Añadir Nuevo Cliente</h5>
            </div>
            <CreateTenantForm />
          </div>
        </div>

      </div>
    </div>
  );
}
