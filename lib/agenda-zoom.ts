// Zoom vertical de l'agenda et étiquettes des petits blocs (2026-10-20, retour
// du fondateur : « fait en sorte qu'on puisse étirer pour voir plus précis,
// car un bloc de 5 min c pas visible le nom »). Calcul pur, sans React.

export type ZoomView = "day" | "week";

/** Niveaux de zoom en pixels par heure, du compact (journée entière à l'écran) au très précis. */
export const ZOOM_LEVELS: Record<ZoomView, number[]> = {
  day: [24, 32, 44, 56, 80, 120, 180, 270, 400],
  week: [20, 28, 40, 56, 80, 120, 180, 270],
};

export const ZOOM_DEFAULT: Record<ZoomView, number> = { day: 56, week: 40 };

export function clampRow(view: ZoomView, row: number): number {
  const levels = ZOOM_LEVELS[view];
  if (!Number.isFinite(row)) return ZOOM_DEFAULT[view];
  return Math.min(levels[levels.length - 1], Math.max(levels[0], row));
}

/** Niveau suivant (dir = 1) ou précédent (dir = -1) depuis un zoom quelconque (pincement compris). */
export function stepRow(view: ZoomView, row: number, dir: 1 | -1): number {
  const levels = ZOOM_LEVELS[view];
  if (dir > 0) return levels.find((l) => l > row + 0.5) ?? levels[levels.length - 1];
  return [...levels].reverse().find((l) => l < row - 0.5) ?? levels[0];
}

/** Écart entre deux repères d'heure écrits (minutes) : toutes les heures, puis demi-heures, puis quarts d'heure. */
export function labelStep(row: number): number {
  if (row >= 200) return 15;
  if (row >= 100) return 30;
  return 60;
}

/** Écart entre deux lignes de la grille (minutes). */
export function lineStep(row: number): number {
  if (row >= 320) return 5;
  if (row >= 140) return 15;
  if (row >= 64) return 30;
  return 60;
}

/** Repère d'heure : « 6h », « 6h30 ». */
export function tickLabel(abs: number): string {
  const m = ((Math.round(abs) % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r === 0 ? `${h}h` : `${h}h${String(r).padStart(2, "0")}`;
}

export interface LabelRequest {
  id: string;
  /** Position verticale du bloc dans la colonne (px). */
  top: number;
  bottom: number;
  /** Hauteur de l'étiquette à poser (px). */
  need: number;
}

export interface LabelSpot {
  /** Haut de l'étiquette (px). */
  top: number;
  /** Faute de place libre autour du bloc : étiquette latérale (à droite, au-dessus des voisins). */
  lateral: boolean;
  /** Zone de tap du bloc, au moins `minHit` px quand la place libre le permet (sans empiéter sur les voisins). */
  hitTop: number;
  hitBottom: number;
}

/**
 * Pose les étiquettes des blocs trop courts pour afficher leur nom.
 * L'étiquette se centre sur le bloc, glisse dans la place libre juste au-dessus
 * ou au-dessous sans recouvrir les blocs voisins (`obstacles`) ni les autres
 * étiquettes ; s'il n'y a vraiment pas la place, elle passe en étiquette
 * latérale, à droite.
 */
export function layoutLabels(requests: LabelRequest[], obstacles: { top: number; bottom: number }[], height: number, minHit = 28): Map<string, LabelSpot> {
  const out = new Map<string, LabelSpot>();
  const sorted = [...requests].sort((a, b) => a.top - b.top || a.bottom - b.bottom);
  let lastFree = -Infinity;
  let lastLateral = -Infinity;
  for (const r of sorted) {
    const c = (r.top + r.bottom) / 2;
    let freeTop = 0;
    let freeBottom = height;
    for (const o of obstacles) {
      if (o.bottom <= r.top + 0.5) freeTop = Math.max(freeTop, o.bottom);
      else if (o.top >= r.bottom - 0.5) freeBottom = Math.min(freeBottom, o.top);
    }
    const lo = Math.max(freeTop, lastFree);
    let top = Math.min(Math.max(c - r.need / 2, lo), freeBottom - r.need);
    let lateral = false;
    if (top < lo - 0.01 || freeBottom - freeTop < r.need) {
      lateral = true;
      top = Math.min(Math.max(c - r.need / 2, 0, lastLateral), Math.max(0, height - r.need));
      lastLateral = top + r.need + 1;
    } else lastFree = top + r.need + 1;
    const hitTop = Math.min(r.top, Math.max(freeTop, c - minHit / 2));
    const hitBottom = Math.max(r.bottom, Math.min(freeBottom, c + minHit / 2));
    out.set(r.id, { top, lateral, hitTop, hitBottom });
  }
  return out;
}

/** Parent qui défile verticalement (la page, le plus souvent). */
export function scrollParentOf(el: HTMLElement): Element {
  let p: HTMLElement | null = el.parentElement;
  while (p && p !== document.body) {
    const oy = getComputedStyle(p).overflowY;
    if ((oy === "auto" || oy === "scroll" || oy === "overlay") && p.scrollHeight > p.clientHeight + 1) return p;
    p = p.parentElement;
  }
  return document.scrollingElement ?? document.documentElement;
}

const STORAGE_KEY: Record<ZoomView, string> = { day: "ep.agenda.zoom.day", week: "ep.agenda.zoom.week" };

export function readStoredRow(view: ZoomView): number | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY[view]);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? clampRow(view, n) : null;
  } catch {
    return null;
  }
}

export function storeRow(view: ZoomView, row: number): void {
  try {
    window.localStorage.setItem(STORAGE_KEY[view], String(Math.round(row)));
  } catch {
    // Navigation privée ou stockage bloqué : le zoom reste celui de la session.
  }
}
