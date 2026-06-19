import { createClient } from '@supabase/supabase-js';

// Cliente de Supabase con permisos absolutos (Service Role)
// ÚTIL SOLO EN SERVIDOR (Server Actions, Route Handlers)
// NUNCA DEBE SER EXPUESTO AL NAVEGADOR
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
