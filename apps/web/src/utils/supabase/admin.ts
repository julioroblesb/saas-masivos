import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.generated';

// Cliente de Supabase con permisos absolutos (Service Role)
// ÚTIL SOLO EN SERVIDOR (Server Actions, Route Handlers)
// NUNCA DEBE SER EXPUESTO AL NAVEGADOR
export const getSupabaseAdmin = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error('Supabase admin environment variables are not configured');
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};
