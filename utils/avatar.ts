import { createServerSupabase } from "@/lib/supabase-server";

const AVATAR_EXPIRY = 3600; // 1 heure

// Résout un avatar_url qui peut être soit un ancien chemin stocké en bucket
// Supabase, soit une URL HTTPS externe (gravatar, etc.). Retourne une signed
// URL si c'est un chemin bucket, l'URL brute sinon, null si vide.
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
    const supabase = await createServerSupabase();
    const { data } = await supabase.storage
      .from("avatars")
      .createSignedUrl(avatarUrl, AVATAR_EXPIRY);
    return data?.signedUrl ?? null;
  } catch {
    return null;
  }
}
