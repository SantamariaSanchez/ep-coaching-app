import { createAdminClient } from "@/lib/supabase-admin";

const AVATAR_EXPIRY = 3600; // 1 heure

// Résout un avatar_url qui peut être soit un ancien chemin stocké en bucket
// Supabase, soit une URL HTTPS externe (gravatar, etc.). Retourne une signed
// URL si c'est un chemin bucket, l'URL brute sinon, null si vide.
//
// Client admin plutôt que createServerSupabase() (corrigé le 2026-09-08) :
// le bucket "avatars" est privé, et cette fonction doit pouvoir résoudre la
// photo de n'importe qui à afficher à n'importe qui d'autre (liste de
// membres d'un coach, annuaire public /coachs sans compte) — pas seulement
// la sienne. Avec le client lié à la requête, une résolution pour un visiteur
// non connecté ou pour le profil d'une autre personne échouait silencieusement
// (RLS storage), ce qui laissait la photo invisible partout sauf sur la propre
// page de profil de chacun. Le service role contourne RLS ; ça reste sans
// risque, un avatar n'étant pas une donnée sensible.
export async function resolveAvatarUrl(avatarUrl: string | null | undefined): Promise<string | null> {
  if (!avatarUrl) return null;
  if (avatarUrl.startsWith("http://") || avatarUrl.startsWith("https://")) {
    // Ancienne URL publique ou URL externe — on tente d'en extraire le chemin
    // dans le bucket "avatars" pour générer une signed URL.
    const marker = "/object/public/avatars/";
    if (avatarUrl.includes(marker)) {
      const path = avatarUrl.split(marker)[1];
      if (path) return resolveAvatarUrl(path);
    }
    // URL externe (gravatar, Google, etc.) — on la retourne telle quelle.
    return avatarUrl;
  }
  // C'est un chemin bucket — on génère une signed URL.
  try {
    const admin = createAdminClient();
    const { data } = await admin.storage
      .from("avatars")
      .createSignedUrl(avatarUrl, AVATAR_EXPIRY);
    return data?.signedUrl ?? null;
  } catch {
    return null;
  }
}

/**
 * Résout plusieurs avatars en parallèle et renvoie une map id → URL utilisable
 * (ou null). Évite de dupliquer la boucle Promise.all dans chaque appelant qui
 * affiche une liste de profils (membres, annuaire de coachs...).
 */
export async function resolveAvatarUrls(
  entries: { id: string; avatar_url: string | null }[]
): Promise<Record<string, string | null>> {
  const resolved: Record<string, string | null> = {};
  await Promise.all(
    entries.map(async (e) => {
      resolved[e.id] = await resolveAvatarUrl(e.avatar_url);
    })
  );
  return resolved;
}
