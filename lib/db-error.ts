// Message lisible pour une erreur Supabase/Postgres affichée à un membre.
// Avant : le texte brut de la base (« duplicate key value violates unique
// constraint… », en anglais) arrivait tel quel à l'écran. L'erreur technique
// reste dans les logs serveur pour le diagnostic.

type DbErr = { code?: string; message?: string } | null | undefined;

export function friendlyDbError(err: DbErr, fallback = "Enregistrement impossible. Réessaie dans un instant."): string {
  const code = err?.code ?? "";
  const msg = (err?.message ?? "").toLowerCase();
  if (code === "23505" || msg.includes("duplicate key")) return "C'est déjà enregistré.";
  if (code === "23514" || code === "22P02" || code === "22003" || msg.includes("violates check constraint")) return "Une valeur n'est pas acceptée. Vérifie ce que tu as saisi.";
  if (code === "23503") return "Cet élément n'existe plus. Recharge la page.";
  if (code === "42501" || code.startsWith("PGRST3") || msg.includes("row-level security")) return "Action non autorisée sur cet élément.";
  if (msg.includes("fetch failed") || msg.includes("network") || msg.includes("timeout")) return "Connexion perdue. Réessaie dans un instant.";
  return fallback;
}

/** Journalise l'erreur technique et renvoie le message pour l'écran. */
export function dbErrorResult(err: DbErr, where: string, fallback?: string): { error: string; success?: undefined } {
  console.error(`[${where}]`, err?.code ?? "", err?.message ?? err);
  return { error: friendlyDbError(err, fallback) };
}
