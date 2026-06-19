import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // Configura las variables de entorno en apps/web/.env.local
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
