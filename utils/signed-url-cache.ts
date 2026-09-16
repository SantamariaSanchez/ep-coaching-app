import { createAdminClient } from "@/lib/supabase-admin";
import type { createServerSupabase } from "@/lib/supabase-server";

// ── Cache des URLs signées Supabase Storage ─────────────────────────────────
//
// Contexte (MASTERCLASS.md Axe CH, chantier egress) : utils/photos.ts,
// utils/personal-photos.ts et utils/avatar.ts généraient une NOUVELLE
// createSignedUrl (jeton différent) à CHAQUE chargement de page pour la même
// photo. Résultat : aucun cache navigateur possible, même pour une photo déjà
// vue 10 fois par le même client ou le même coach — chaque affichage
// retéléchargeait l'original depuis Supabase Storage. Un vrai poste d'egress.
//
// Ce module sert de raccourci de génération : avant de signer une nouvelle
// URL, on regarde si une entrée en cache existe encore et n'expire pas dans
// les prochaines minutes ; si oui, on la réutilise (même URL d'un chargement
// à l'autre, donc le navigateur peut enfin mettre l'image en cache HTTP).
//
// Important sur la confidentialité : ce cache NE change rien aux permissions.
// La lecture applicative continue de passer par les mêmes vérifications
// qu'avant (RLS sur la ligne qui référence ce storage_path, guard de rôle,
// appartenance client/coach...) avant même d'appeler cette fonction — c'est
// à l'appelant de garantir ça, exactement comme avant ce chantier, quand
// chaque appel générait sa propre signed URL sans passer par aucun cache.
// Cette table n'est qu'un index technique storage_path -> URL déjà signée,
// jamais un nouveau chemin d'accès public : elle ne permet à personne
// d'obtenir une URL qu'il n'aurait pas pu obtenir en appelant createSignedUrl
// lui-même.
//
// La table signed_url_cache (migration 20260916e) n'a AUCUNE policy RLS :
// seule la service_role peut la lire/écrire, comme auth_login_attempts. On y
// accède donc toujours via createAdminClient(), jamais via le client lié à
// la requête (qui tourne en tant qu'utilisateur authentifié et serait
// bloqué par RLS). Le client passé en paramètre à getCachedOrCreateSignedUrl
// ne sert qu'à générer la signed URL en cas de cache manquant/expiré (donc
// toujours via les policies RLS habituelles du bucket storage).

const REFRESH_MARGIN_MS = 10 * 60 * 1000; // 10 minutes : marge avant l'expiration réelle

type SignableClient =
  | ReturnType<typeof createAdminClient>
  | Awaited<ReturnType<typeof createServerSupabase>>;

/**
 * Renvoie une URL signée pour ce chemin de stockage, en réutilisant le cache
 * si une entrée valide existe (n'expire pas dans les 10 prochaines minutes) ;
 * sinon génère une nouvelle signed URL via `client` et met le cache à jour.
 * Renvoie null si la génération échoue (chemin absent, permissions refusées
 * par le bucket...), comme le faisait un appel direct à createSignedUrl.
 */
export async function getCachedOrCreateSignedUrl(
  client: SignableClient,
  bucket: string,
  path: string,
  ttlSeconds: number
): Promise<string | null> {
  const admin = createAdminClient();
  const now = Date.now();

  try {
    const { data: cached } = await admin
      .from("signed_url_cache")
      .select("signed_url, expires_at")
      .eq("bucket", bucket)
      .eq("storage_path", path)
      .maybeSingle();

    if (cached && new Date(cached.expires_at as string).getTime() - now > REFRESH_MARGIN_MS) {
      return cached.signed_url as string;
    }
  } catch {
    // Le cache est un raccourci, jamais un chemin critique : une erreur de
    // lecture ne doit pas empêcher d'afficher la photo, seulement retomber
    // sur une génération classique comme avant ce chantier.
  }

  const { data, error } = await client.storage.from(bucket).createSignedUrl(path, ttlSeconds);
  if (error || !data?.signedUrl) return null;

  try {
    await admin.from("signed_url_cache").upsert(
      {
        bucket,
        storage_path: path,
        signed_url: data.signedUrl,
        expires_at: new Date(now + ttlSeconds * 1000).toISOString(),
        updated_at: new Date(now).toISOString(),
      },
      { onConflict: "bucket,storage_path" }
    );
  } catch {
    // Idem : l'URL fraîchement signée est déjà valide et retournée plus bas,
    // seule la mise à jour du cache pour la prochaine fois échoue en silence.
  }

  return data.signedUrl;
}

/**
 * Invalide le cache pour un ou plusieurs chemins d'un bucket. À appeler
 * immédiatement après suppression ou remplacement d'un fichier : on ne doit
 * jamais continuer à servir une URL signée en cache qui pointe vers un
 * fichier qui n'existe plus, même si cette URL n'a pas encore expiré côté
 * Supabase (pas un risque de sécurité en soi, mais autant nettoyer proprement
 * plutôt que de laisser une entrée périmée traîner jusqu'à son TTL).
 */
export async function invalidateSignedUrlCache(bucket: string, paths: string[]): Promise<void> {
  const cleanPaths = paths.filter(Boolean);
  if (cleanPaths.length === 0) return;
  try {
    const admin = createAdminClient();
    await admin.from("signed_url_cache").delete().eq("bucket", bucket).in("storage_path", cleanPaths);
  } catch {
    // Best-effort : si ça échoue, l'entrée périmée disparaîtra au plus tard
    // à son expiration naturelle (TTL), jamais plus tard que ça.
  }
}
