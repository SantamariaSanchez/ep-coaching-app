// Traduit l'erreur renvoyée par Supabase à la connexion. Seul un vrai mauvais
// identifiant compte comme un échec (verrouillage après plusieurs essais) :
// un quota Supabase atteint ou une panne réseau n'est pas la faute de la
// personne, lui dire « mot de passe incorrect » la pousse à réinitialiser un
// mot de passe qui était bon.

export type LoginErrorKind = "credentials" | "unconfirmed" | "busy";

export function classifyLoginError(err: { status?: number; code?: string; message?: string } | null | undefined): LoginErrorKind {
  if (!err) return "credentials";
  const code = (err.code ?? "").toLowerCase();
  const msg = (err.message ?? "").toLowerCase();
  if (code === "email_not_confirmed" || msg.includes("email not confirmed")) return "unconfirmed";
  if (err.status === 429 || code.includes("rate_limit") || msg.includes("rate limit")) return "busy";
  if ((err.status ?? 0) >= 500 || msg.includes("fetch failed") || msg.includes("network")) return "busy";
  return "credentials";
}

export const LOGIN_MESSAGES: Record<Exclude<LoginErrorKind, "credentials">, string> = {
  unconfirmed: "Ton email n'est pas encore confirmé. Ouvre le lien reçu par mail, puis reconnecte-toi.",
  busy: "Connexion impossible pour le moment. Réessaie dans une minute, ton mot de passe n'est pas en cause.",
};
