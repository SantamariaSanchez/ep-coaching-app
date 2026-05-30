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
