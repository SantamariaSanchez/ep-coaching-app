import { getContentFormat } from "@/lib/content-formats";
import { isWrittenPlatform } from "@/lib/written-content";

// Session de tournage (18/11) : une seule source de vérité pour « prêt à
// tourner » et pour l'ordre, utilisée par le Studio (bouton « Tourner ») et
// par le connecteur Claude (plan_de_tournage).
//
// Ordre : les scripts du même format s'enchaînent (tous les face caméra,
// puis tous les B-roll…) pour ne régler le téléphone qu'une fois par type de
// plan. Les groupes suivent l'ordre du script le plus ancien de chaque format ;
// dans un groupe, du plus ancien au plus récent (on vide le vieux stock).

export interface ShootableScript {
  id: string;
  created_at: string;
  content_format?: string | null;
}

/** Script vidéo prêt : à tourner, avec un vrai texte, ni post écrit ni format sans vidéo. */
export function isFilmableScript(s: { status: string; platform: string | null; content_format?: string | null; content: string | null }): boolean {
  return s.status === "a_tourner" && !!s.content?.trim() && !isWrittenPlatform(s.platform) && getContentFormat(s.content_format).filmed;
}

export function shootingOrder<T extends ShootableScript>(scripts: T[]): T[] {
  const byAge = scripts.slice().sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const groups = new Map<string, T[]>();
  for (const s of byAge) {
    // Même clé que l'affichage : un format absent est un face caméra.
    const key = getContentFormat(s.content_format).id;
    const g = groups.get(key);
    if (g) g.push(s);
    else groups.set(key, [s]);
  }
  return Array.from(groups.values()).flat();
}
