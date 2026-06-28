import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Next.js fires speculative prefetch requests for every link that scrolls
  // into view (and via router.prefetch()). Running Supabase's session refresh
  // on each of these causes concurrent refresh-token-rotation races — two
  // prefetches can race to swap the same refresh token, the loser gets an
  // "already used" error, and its (stale) Set-Cookie can overwrite the
  // winner's, silently logging the user out. Prefetches don't need auth
  // enforcement (the real navigation request re-runs this middleware), so
  // skip straight through.
  if (request.headers.get("next-router-prefetch")) {
    return NextResponse.next({ request });
  }

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
  // Free members get self-serve, unmonitored versions of all the personal
  // tracking tools (program, nutrition, logbook, roadmap, bilan, photos) —
  // each page branches its own UI by subscription_status. Only the features
  // that are inherently a channel TO the coach stay paid-only: messages,
  // check-in (weekly report meant for coach review), tasks (coach-assigned),
  // notes du coach, formations.
  const FREE_TIER_PREFIXES = [
    "/dashboard/client/communaute",
    "/dashboard/client/ressources",
    "/dashboard/client/recettes",
    "/dashboard/client/abonnement",
    "/dashboard/client/program",
    "/dashboard/client/nutrition",
    "/dashboard/client/logbook",
    "/dashboard/client/roadmap",
    "/dashboard/client/bilan",
    "/dashboard/client/photos",
    "/dashboard/client/profile",
  ];
  const isFreeTierPath =
    pathname === "/dashboard/client" ||
    FREE_TIER_PREFIXES.some((p) => pathname.startsWith(p));

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
      // Free-tier client hitting a coaching feature → paywall. The home
      // dashboard renders its own welcome guide for free members instead
      // of redirecting away (see app/dashboard/client/page.tsx).
      if (role === "client" && isClientDashboard && prof?.subscription_status !== "active" && !isFreeTierPath) {
        const res = NextResponse.redirect(new URL("/dashboard/client/abonnement", request.url));
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
