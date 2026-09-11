import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { AUTH_COOKIE_OPTIONS, hardenAuthCookie } from "@/lib/auth-cookies";

export async function createServerSupabase() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: AUTH_COOKIE_OPTIONS,
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, hardenAuthCookie(options))
            );
          } catch {
            // Called from a Server Component — cannot set cookies here.
            // The middleware (proxy.ts / middleware.ts) handles session refresh.
          }
        },
      },
      // Retour direct 2026-09-10/11 (bug de coche nutrition qui a résisté à
      // 3 correctifs de fond distincts, chacun vérifié correct sur sa propre
      // cause : dédoublonnage, ambiguïté food_id/quantité, staleTimes, filet
      // visibilitychange — la donnée et la logique de correspondance étaient
      // prouvées justes à chaque fois, l'affichage restait quand même faux) :
      // supabase-js n'ajoute PAS `cache: "no-store"` à ses propres appels
      // fetch (vérifié dans postgrest-js — aucune mention de `cache`), donc
      // rien n'empêche Next.js d'appliquer SON cache de fetch par défaut à
      // ces lectures, indépendamment de `export const dynamic =
      // "force-dynamic"` sur la page si ce comportement ne se propage pas
      // fidèlement aux fetch internes d'une librairie sur cette version de
      // Next.js (AGENTS.md : "pas celle que tu connais, changements
      // cassants"). Filet explicite plutôt que de compter sur un
      // comportement en cascade non vérifiable directement : chaque requête
      // Supabase faite depuis le serveur force `no-store`, quoi qu'il arrive.
      global: {
        fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
      },
    }
  );
}
