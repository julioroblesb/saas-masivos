import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // refresca session
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isAuthPage = request.nextUrl.pathname.startsWith('/login')
  const isAdminPage = request.nextUrl.pathname.startsWith('/admin')
  const isDashboardPage = request.nextUrl.pathname.startsWith('/dashboard')

  if (!user && (isAdminPage || isDashboardPage)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user) {
    // Si esta logueado pero intenta ir a /login
    if (isAuthPage) {
      // Deberíamos saber si es admin o tenant
      // Podriamos chequear su rol en la tabla profiles, pero requiere otra llamada.
      // Como alternativa rapida, los redireccionamos a /dashboard, y el dashboard verifica su rol.
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return supabaseResponse
}
