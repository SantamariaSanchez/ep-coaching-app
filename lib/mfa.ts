// Niveau d'authentification porté par le jeton d'accès Supabase :
//   "aal1" = mot de passe seul
//   "aal2" = mot de passe + code à usage unique (TOTP)
//
// On lit la revendication directement dans le JWT plutôt que d'appeler
// getAuthenticatorAssuranceLevel(), qui déclenche un aller retour réseau
// supplémentaire (getUser + listFactors) à chaque vérification. Le jeton a déjà
// été validé par getUser() en amont, la revendication est donc fiable.
export function readAalClaim(accessToken: string | undefined | null): string | null {
  if (!accessToken) return null;
  try {
    const payload = accessToken.split(".")[1];
    if (!payload) return null;
    const padded = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
    // Extraction par expression régulière plutôt que JSON.parse : le corps du
    // jeton contient des caractères accentués (nom, email) qu'atob renvoie en
    // latin-1, ce qui peut faire échouer un parse complet inutilement.
    const match = decoded.match(/"aal"\s*:\s*"(aal\d)"/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export function isStrongSession(accessToken: string | undefined | null): boolean {
  return readAalClaim(accessToken) === "aal2";
}
