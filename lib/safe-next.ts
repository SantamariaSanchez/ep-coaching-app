// Page de retour après connexion (?next=...). Seulement une page interne de
// l'espace de la personne : jamais une autre adresse (redirection ouverte),
// jamais l'espace d'un autre rôle.

export function safeNext(raw: unknown, role: string | null | undefined): string | null {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 500) return null;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\") || raw.includes("..")) return null;
  if (/[\u0000-\u001f]/.test(raw)) return null;
  const path = raw.split(/[?#]/)[0];
  const space = role === "coach" ? "/dashboard/coach" : role === "staff" ? "/equipe" : "/dashboard/client";
  if (path !== space && !path.startsWith(`${space}/`)) return null;
  return raw;
}
