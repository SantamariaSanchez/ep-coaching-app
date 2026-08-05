import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

// Rate limiting generique, adosse au compteur Postgres pose par la migration
// 20260805j_rate_limiting.sql. Meme principe que lib/login-throttle.ts, mais
// reutilisable : une seule fonction appelee en tete de chaque route ou action
// a proteger, avec des limites differenciees selon la sensibilite.
//
// Pas de Redis : le compteur vit en base. Vercel execute chaque requete dans
// une instance potentiellement differente, un compteur en RAM ne bloquerait
// rien du tout.
//
// Principe de reglage : les limites doivent etre assez larges pour qu'un
// usage normal ne les atteigne jamais, et seulement bloquer un abus manifeste.
// Voir PRESETS ci dessous.

export interface RateLimitResult {
  allowed: boolean;
  /** Secondes a attendre avant de reessayer (0 quand c'est autorise). */
  retryAfterSeconds: number;
}

const ALLOWED: RateLimitResult = { allowed: true, retryAfterSeconds: 0 };

/**
 * Consomme un jeton pour `key` et dit si la requete passe.
 *
 * En cas de souci en base, on laisse passer : un incident sur le compteur ne
 * doit jamais transformer un garde fou en panne de l'appli. C'est le meme
 * choix que celui deja fait dans lib/login-throttle.ts.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  if (!key) return ALLOWED;
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("consume_rate_limit", {
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error) return ALLOWED;
    const retryAfter = Number(data ?? 0);
    if (!Number.isFinite(retryAfter) || retryAfter <= 0) return ALLOWED;
    return { allowed: false, retryAfterSeconds: retryAfter };
  } catch {
    return ALLOWED;
  }
}

/**
 * Identifiant de l'appelant pour une route publique : l'IP vue par Vercel.
 * Sur Vercel, x-forwarded-for est pose par la plateforme et le premier element
 * est l'IP client reelle. On retombe sur "inconnu" plutot que de ne rien
 * limiter du tout : dans le pire des cas tous les appelants non identifies
 * partagent un seul seau, ce qui reste preferable a aucune limite.
 */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first || request.headers.get("x-real-ip")?.trim() || "inconnu";
}

/** Reponse 429 standard, avec l'entete Retry-After. */
export function rateLimitResponse(
  result: RateLimitResult,
  message = "Trop de requetes. Reessaie dans un instant."
): NextResponse {
  return NextResponse.json(
    { error: message },
    { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } }
  );
}

/**
 * Raccourci pour les routes API : renvoie une reponse 429 prete a etre
 * retournee, ou null quand la requete peut continuer.
 */
export async function enforceRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
  message?: string
): Promise<NextResponse | null> {
  const result = await checkRateLimit(key, limit, windowSeconds);
  if (result.allowed) return null;
  return rateLimitResponse(result, message);
}

// ── Limites de reference ──────────────────────────────────────────────────
// Elles servent de vocabulaire commun pour ne pas reinventer un chiffre a
// chaque route. Chacune est { limit, windowSeconds }.
export const PRESETS = {
  /** Fonctionnalites IA : cout reel par appel, on serre. */
  ai: { limit: 20, windowSeconds: 3600 },
  /** IA sur une route publique sans compte : encore plus serre. */
  aiPublic: { limit: 5, windowSeconds: 3600 },
  /** Appels sortants vers un service tiers (PubMed, HaveIBeenPwned...). */
  externalSearch: { limit: 60, windowSeconds: 300 },
  /** Creation de contenu public (post, commentaire, avis). */
  publish: { limit: 30, windowSeconds: 600 },
  /** Envoi d'email declenche par un utilisateur. */
  email: { limit: 5, windowSeconds: 3600 },
  /** Creation de compte, par adresse IP. */
  signup: { limit: 10, windowSeconds: 3600 },
  /** Upload de fichier. */
  upload: { limit: 60, windowSeconds: 600 },
  /** Ecriture applicative courante (seance, series, notifications...). */
  write: { limit: 300, windowSeconds: 600 },
  /** Lecture couteuse (agregats, export, statistiques). */
  expensiveRead: { limit: 120, windowSeconds: 300 },
} as const;
