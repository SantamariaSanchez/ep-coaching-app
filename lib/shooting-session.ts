// Ordre d'une session de tournage (18/11) : les scripts du même format
// s'enchaînent (tous les face caméra, puis tous les B-roll…) pour ne régler
// le téléphone qu'une fois par type de plan. Les groupes suivent l'ordre du
// script le plus ancien de chaque format ; dans un groupe, du plus ancien au
// plus récent (on vide d'abord le vieux stock).

export interface ShootableScript {
  id: string;
  created_at: string;
  content_format?: string | null;
}

export function shootingOrder<T extends ShootableScript>(scripts: T[]): T[] {
  const byAge = scripts.slice().sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const groups = new Map<string, T[]>();
  for (const s of byAge) {
    const key = s.content_format ?? "";
    const g = groups.get(key);
    if (g) g.push(s);
    else groups.set(key, [s]);
  }
  return Array.from(groups.values()).flat();
}
