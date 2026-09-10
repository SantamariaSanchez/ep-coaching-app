import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";
import { AUTH_COOKIE_OPTIONS, hardenAuthCookie } from "@/lib/auth-cookies";

// Concurrent requests sharing the same (soon-to-be-rotated) refresh token
// race to refresh it: the loser gets an "already used" error and its stale
// Set-Cookie can overwrite the winner's, silently logging the user out.
// This module-level lock makes concurrent requests share a single in-flight
// auth check/refresh instead of each racing to rotate the same token —
// mirrors the prefetch-skip mitigation below but covers real navigations
// too (e.g. reopening the PWA while another tab/device session is alive).
const pendingAuthChecks = new Map<
  string,
  Promise<{ user: User | null; cookies: { name: string; value: string }[] }>
>();

// Perf (repasse masterclass 2026-09-10, retour direct : "changer d'onglet
// prend 3s") : ce middleware tourne sur CHAQUE navigation dans le dashboard
// (voir `matcher` en bas de fichier) et faisait déjà un aller-retour Supabase
// pour auth.getUser() ci-dessus, PUIS un second aller-retour ici pour lire le
// rôle — les deux avant même que app/dashboard/layout.tsx (qui refait sa
// propre vérification, par défense en profondeur, jamais retirée) commence à
// s'exécuter. Le rôle et coach_id d'un compte changent extrêmement rarement
// (jamais en cours de session dans l'immense majorité des cas) : un court
// cache mémoire (même mécanisme que pendingAuthChecks ci-dessus, un Map au
// niveau du module) évite de retaper Supabase à chaque nouvelle navigation
// tant qu'on reste dans la fenêtre de fraîcheur. Cette vérification ne sert
// QUE de garde-fou de redirection UX (bon dashboard visuel) — le contrôle
// d'accès réel aux données reste imposé par les policies RLS de Supabase,
// jamais par ce middleware seul, donc une fraîcheur de quelques secondes ne
// crée aucune faille : au pire, une redirection de confort arrive un peu en
// retard après un changement de rôle qui vient tout juste d'avoir lieu.
const ROLE_CACHE_TTL_MS = 15_000;
const roleCache = new Map<
  string,
  { role: string; coachId: string | null; expiresAt: number }
>();

async function resolveRole(userId: string): Promise<{ role: string; coachId: string | null }> {
  const cached = roleCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return { role: cached.role, coachId: cached.coachId };
  }
  const adminForRole = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return []; }, setAll() {} }, auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { data: prof } = await adminForRole
    .from("profiles")
    .select("role, coach_id")
    .eq("id", userId)
    .single();
  const role = prof?.role ?? "client";
  const coachId = (prof?.coach_id as string | null) ?? null;
  roleCache.set(userId, { role, coachId, expiresAt: Date.now() + ROLE_CACHE_TTL_MS });
  return { role, coachId };
}

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
      cookieOptions: AUTH_COOKIE_OPTIONS,
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, hardenAuthCookie(options))
          );
        },
      },
    }
  );

  const authCookies = request.cookies
    .getAll()
    .filter((c) => c.name.startsWith("sb-"));
  const lockKey = authCookies.map((c) => `${c.name}=${c.value}`).sort().join("&");

  let user: User | null;
  if (lockKey && pendingAuthChecks.has(lockKey)) {
    // Another concurrent request already kicked off the auth check/refresh
    // for this exact token — reuse its result instead of racing it.
    const result = await pendingAuthChecks.get(lockKey)!;
    user = result.user;
    result.cookies.forEach((c) => supabaseResponse.cookies.set(c.name, c.value, c));
  } else {
    const promise = supabase.auth.getUser().then(({ data }) => ({
      user: data.user,
      cookies: supabaseResponse.cookies.getAll(),
    }));
    if (lockKey) {
      pendingAuthChecks.set(lockKey, promise);
      promise.finally(() => { pendingAuthChecks.delete(lockKey); });
    }
    const result = await promise;
    user = result.user;
  }

  // Always pass through the Supabase callback
  if (pathname === "/auth/callback") return supabaseResponse;

  const isCoachDashboard  = pathname.startsWith("/dashboard/coach");
  const isClientDashboard = pathname.startsWith("/dashboard/client");
  const isDashboard = isCoachDashboard || isClientDashboard;
  // The marketing homepage is treated like an auth page for already-logged-in
  // visitors: nobody who's already signed in should land back on "rejoindre
  // la communauté" — they should go straight into their dashboard.
  const isAuthPage  = pathname === "/auth/coach" || pathname === "/auth/client" || pathname === "/";
  // Point d'entrée de la PWA installée (voir public/manifest.json,
  // start_url) — perf (repasse masterclass 2026-09-10, retour direct :
  // "l'écran de chargement avec mon logo, au tout début, c'est long") :
  // app/launch/page.tsx faisait sa PROPRE vérification (getUser + getProfile,
  // 2 allers-retours Supabase) avant de rediriger vers le dashboard, qui
  // refait ENCORE sa propre vérification en arrivant — alors que ce
  // middleware fait déjà exactement la même chose pour "/" juste en dessous
  // (isAuthPage). "/launch" rejoint donc cette même logique, désormais à
  // l'unique endroit qui tourne AVANT tout rendu React, avec le cache de
  // rôle en prime. app/launch/page.tsx reste en place comme filet de
  // sécurité (si jamais ce middleware ne matchait pas la route pour une
  // raison quelconque), mais ne devrait plus jamais s'exécuter en pratique.
  const isLaunch = pathname === "/launch";

  // Unauthenticated on protected route → appropriate login page
  if (!user && isDashboard) {
    const dest = isCoachDashboard ? "/auth/coach" : "/auth/client";
    const res = NextResponse.redirect(new URL(dest, request.url));
    supabaseResponse.cookies.getAll().forEach((c) => res.cookies.set(c.name, c.value, c));
    return res;
  }
  // Unauthenticated on the PWA launch route → marketing homepage (mirrors
  // app/launch/page.tsx's own `if (!user) redirect("/")`).
  if (!user && isLaunch) {
    const res = NextResponse.redirect(new URL("/", request.url));
    supabaseResponse.cookies.getAll().forEach((c) => res.cookies.set(c.name, c.value, c));
    return res;
  }

  // Authenticated: enforce role-based access to dashboards
  if (user && isDashboard) {
    try {
      const { role, coachId } = await resolveRole(user.id);
      // Le contrôle de double authentification vit dans app/dashboard/layout.tsx
      // et non ici : le verrou de rafraîchissement ci-dessus fait qu'une requête
      // concurrente peut réutiliser le résultat d'une autre sans avoir chargé sa
      // propre session, et lire la session à cet endroit rouvrirait la course à
      // la rotation du jeton de rafraîchissement. Le layout, lui, s'exécute une
      // fois par requête avec des cookies déjà à jour.
      // Coach trying to access client dashboard → redirect to coach dashboard,
      // SAUF s'il est aussi suivi par un autre coach (double rôle) : dans ce
      // cas /dashboard/client/* est son propre espace de coaching personnel.
      if (role === "coach" && isClientDashboard && !coachId) {
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
      // Toutes les pages du dashboard client restent atteignables pour un
      // membre gratuit (nav jamais grisée/cachée) — chaque page décide
      // elle-même de son rendu selon subscription_status : contenu complet
      // en libre-service (program, nutrition, logbook, bilan, agenda...),
      // ou message "réservé au coaching" avec CTA vers la préqualif pour
      // les quelques fonctionnalités qui n'ont de sens qu'avec un coach
      // humain (checkin, tasks, live — voir CoachOnlyGate). Ça remplace
      // l'ancien blocage silencieux ici, qui redirigeait sans explication.
    } catch { /* non-blocking */ }
  }

  // Authenticated on an auth page (or the PWA launch route) → redirect to
  // the right dashboard. Utilise resolveRole (cache 15s partagé avec le
  // garde isDashboard ci-dessus) au lieu de refaire sa propre requête —
  // avant cette repasse, ce bloc et isDashboard dupliquaient chacun leur
  // propre lecture de profiles, jamais partagée entre les deux.
  if (user && (isAuthPage || isLaunch)) {
    let role: string | null = null;
    try {
      role = (await resolveRole(user.id)).role;
    } catch {
      // Filet de sécurité : la RLS empêche normalement un utilisateur de
      // lire un profil qui n'est pas le sien, donc ce fallback ne trouvera
      // en pratique jamais rien de plus que le client admin ci-dessus —
      // gardé tel quel (comportement inchangé) pour ne pas retirer un filet
      // qui coûte rien de plus quand il ne se déclenche jamais.
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
    matcher: ["/", "/launch", "/dashboard/:path*", "/auth/:path*"],
};
