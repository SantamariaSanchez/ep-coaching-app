import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Use a mutable response so setAll can update cookies on it
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Apply to request first
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          // Rebuild response so all cookie mutations are captured
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: getUser() may call setAll to refresh the session token.
  // Always return supabaseResponse (or a copy) so the refreshed cookies
  // are sent back to the browser. Never return a plain NextResponse.next().
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isDashboardRoute = pathname.startsWith('/dashboard')
  // /auth/callback must pass through — Supabase uses it to exchange the code
  const isAuthPageRoute =
    pathname.startsWith('/auth') && pathname !== '/auth/callback'

  // Unauthenticated → login
  if (!user && isDashboardRoute) {
    const redirectUrl = new URL('/auth/login', request.url)
    const redirectResponse = NextResponse.redirect(redirectUrl)
    // Copy refreshed cookies so the browser doesn't loop on stale tokens
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
    })
    return redirectResponse
  }

  // Authenticated → away from auth pages
  if (user && isAuthPageRoute) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const destination =
      profile?.role === 'coach' ? '/dashboard/coach' : '/dashboard/client'

    const redirectResponse = NextResponse.redirect(
      new URL(destination, request.url)
    )
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
    })
    return redirectResponse
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/dashboard/:path*', '/auth/:path*'],
}
