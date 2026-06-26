import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
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

  // Paths reachable by clients on the free tier (no active subscription).
  const FREE_TIER_PREFIXES = [
    "/dashboard/client/communaute",
    "/dashboard/client/ressources",
    "/dashboard/client/abonnement",
  ];
  const isFreeTierPath = FREE_TIER_PREFIXES.some((p) => pathname.startsWith(p));

  // Authenticated: enforce role-based access to dashboards
  if (user && isDashboard) {
    try {
      const adminForRole = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { cookies: { getAll() { return []; }, setAll() {} }, auth: { autoRefreshToken: false, persistSession: false } }
      );
      const { data: prof } = await adminForRole
        .from("profiles")
        .select("role, subscription_status")
        .eq("id", user.id)
        .single();
      const role = prof?.role ?? "client";
      // Coach trying to access client dashboard → redirect to coach dashboard
      if (role === "coach" && isClientDashboard) {
        const res = NextResponse.redirect(new URL("/dashboard/coach", request.url));
        supabaseResponse.cookies.getAll().forEach((c) => res.cookies.set(c.name, c.value, c));
        return res;
      }
      // Client trying to access coach dashboard → redirect to client dashboard
      if (role === "client" && isCoachDashboard) {
        const res = NextResponse.redirect(new URL("/dashboard/client", request.url));
        supabaseResponse.cookies.getAll().forEach((c) => res.cookies.set(c.name, c.value, c));
        return res;
      }
      // Free-tier client hitting a coaching feature → paywall.
      // The home dashboard redirects to the Community feed instead — friendlier
      // than bouncing to the paywall every time the app opens.
      if (role === "client" && isClientDashboard && prof?.subscription_status !== "active" && !isFreeTierPath) {
        const dest =
          pathname === "/dashboard/client"
            ? "/dashboard/client/communaute/victoires"
            : "/dashboard/client/abonnement";
        const res = NextResponse.redirect(new URL(dest, request.url));
        supabaseResponse.cookies.getAll().forEach((c) => res.cookies.set(c.name, c.value, c));
        return res;
      }
    } catch { /* non-blocking */ }
  }

  // Authenticated on an auth page → redirect to dashboard
  if (user && isAuthPage) {
    // Use service role key to bypass RLS when reading the profile
    let role: string | null = null;
    try {
      const adminClient = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          cookies: {
            getAll() { return []; },
            setAll() {},
          },
          auth: { autoRefreshToken: false, persistSession: false },
        }
      );
      const { data: profile } = await adminClient
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      role = profile?.role ?? null;
    } catch {
      // Fallback: read from anon client
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      role = profile?.role ?? null;
    }

    const dest = role === "coach" ? "/dashboard/coach" : "/dashboard/client";
    const res = NextResponse.redirect(new URL(dest, request.url));
    supabaseResponse.cookies.getAll().forEach((c) => res.cookies.set(c.name, c.value, c));
    return res;
  }

  return supabaseResponse;
}

export const config = {
    matcher: ["/dashboard/:path*", "/auth/:path*"],
};
