// Erreur « ancienne version » : l'appli est restée ouverte en arrière-plan
// pendant un déploiement (Vercel), et au retour le navigateur réclame un
// morceau de code ou une action serveur qui n'existe plus. Ce n'est pas un
// bug de la page : un rechargement complet suffit. Retour du 19/11 : « je
// vais sur Posts à publier, je quitte l'appli, je reviens, ça met erreur ».
// Fichier pur, client et serveur.

const STALE_PATTERNS = [
  /ChunkLoadError/i,
  /Loading (?:CSS )?chunk [\w-]+ failed/i,
  /Failed to load chunk/i,
  /Failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /Importing a module script failed/i,
  /Failed to find Server Action/i,
  /Server Action .* was not found/i,
  /Failed to fetch RSC payload/i,
];

export function isStaleBuildError(err: unknown): boolean {
  if (!err) return false;
  const e = err as { name?: unknown; message?: unknown };
  const text = `${typeof e.name === "string" ? e.name : ""} ${typeof e.message === "string" ? e.message : String(err)}`;
  return STALE_PATTERNS.some((p) => p.test(text));
}

export const STALE_RELOAD_KEY = "ep-stale-reload-at";

/** Un seul rechargement automatique par minute : jamais de boucle. */
export function shouldAutoReload(now: number, lastReloadAt: number | null, windowMs = 60_000): boolean {
  return lastReloadAt === null || !Number.isFinite(lastReloadAt) || now - lastReloadAt > windowMs;
}

/** Recharge la page si l'erreur vient d'une ancienne version (navigateur seulement). */
export function reloadIfStale(err: unknown): boolean {
  if (typeof window === "undefined" || !isStaleBuildError(err)) return false;
  let last: number | null = null;
  try {
    const raw = window.sessionStorage.getItem(STALE_RELOAD_KEY);
    last = raw ? Number(raw) : null;
  } catch {
    last = null;
  }
  const now = Date.now();
  if (!shouldAutoReload(now, last)) return false;
  try {
    window.sessionStorage.setItem(STALE_RELOAD_KEY, String(now));
  } catch {
    // stockage indisponible : on recharge quand même une fois
  }
  window.location.reload();
  return true;
}
