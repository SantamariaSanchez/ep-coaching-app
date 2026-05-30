import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Always pass through the Supabase callback
  if (pathname === "/auth/callback") return supabaseResponse;

  const isCoachDashboard  = pathname.startsWith("/dashboard/coach");
  const isClientDashboard = pathname.startsWith("/dashboard/client");
  const isDashboard = isCoachDashboard || isClientDashboard;
  const isAuthPage  = pathname === "/auth/coach" || pathname === "/auth/client";

  // Unauthenticated on protected route → appropriate login page
  if (!user && isDashboard) {
    const dest = isCoachDashboard ? "/auth/coach" : "/auth/client";
    const res = NextResponse.redirect(new URL(dest, request.url));
    supabaseResponse.cookies.getAll().forEach((c) => res.cookies.set(c.name, c.value, c));
    return res;
  }

  // Authenticated on an auth page → redirect to dashboard
  if (user && isAuthPage) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    const dest = profile?.role === "coach" ? "/dashboard/coach" : "/dashboard/client";
    const res = NextResponse.redirect(new URL(dest, request.url));
    supabaseResponse.cookies.getAll().forEach((c) => res.cookies.set(c.name, c.value, c));
    return res;
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/dashboard/:path*", "/auth/:path*"],
};

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
