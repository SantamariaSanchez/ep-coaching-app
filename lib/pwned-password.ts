// Protection contre les mots de passe déjà présents dans une fuite connue,
// via l'API k-anonymity de HaveIBeenPwned.
//
// Le mot de passe ne quitte jamais l'app : on calcule son SHA1 et on n'envoie
// que les 5 premiers caractères de l'empreinte. HaveIBeenPwned renvoie tous les
// suffixes commençant par ce préfixe (des centaines), et la comparaison finale
// se fait localement. Aucune dépendance npm, aucune clé d'API.
//
// Le module est volontairement isomorphe (crypto.subtle existe côté Node 20+ et
// côté navigateur) : les server actions d'inscription l'appellent côté serveur,
// l'écran de réinitialisation l'appelle côté navigateur.
//
// Complément, pas remplacement : la même protection existe nativement dans
// Supabase Auth (Dashboard > Authentication > Policies > Leaked password
// protection) et doit être activée là bas aussi.

export const PWNED_PASSWORD_MESSAGE =
  "Ce mot de passe fait partie d'une fuite de données connue. Choisis en un autre.";

async function sha1Hex(input: string): Promise<string | null> {
  try {
    const subtle = globalThis.crypto?.subtle;
    if (!subtle) return null;
    const bytes = new TextEncoder().encode(input);
    const digest = await subtle.digest("SHA-1", bytes);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
  } catch {
    return null;
  }
}

// Renvoie true seulement si le mot de passe est confirmé compromis.
// En cas d'indisponibilité de l'API ou de timeout, renvoie false : un service
// tiers en panne ne doit jamais empêcher quelqu'un de créer son compte.
export async function isPasswordPwned(password: string): Promise<boolean> {
  if (!password) return false;

  const hash = await sha1Hex(password);
  if (!hash) return false;

  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      signal: controller.signal,
      headers: { "Add-Padding": "true" },
    });
    clearTimeout(timeout);
    if (!res.ok) return false;

    const body = await res.text();
    for (const line of body.split("\n")) {
      const [candidate, countRaw] = line.trim().split(":");
      if (candidate !== suffix) continue;
      // Le mode "Add-Padding" ajoute de faux suffixes avec un compteur à 0.
      return Number(countRaw ?? 0) > 0;
    }
    return false;
  } catch {
    return false;
  }
}
