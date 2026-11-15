// Objectifs de contenu du jour, RÉGLÉS PAR CHAQUE COACH (2026-11-15, retour
// d'Emmanuel : « on doit pouvoir définir nos nombres de posts dans le studio
// créatif, pas définis comme ça par toi, pense aux utilisateurs d'EP
// Coaching qui n'ont que EP Coaching »).
//
// Aucun chiffre par défaut : un coach qui n'a rien fixé n'a pas d'objectif,
// le Studio lui propose d'en fixer un (et l'aide à calculer celui des reels
// depuis son temps disponible). Stocké dans user_app_setup.answers
// (clés content_targets et production_time), lu par le Studio et par le
// connecteur Claude (outil mes_objectifs_contenu) pour que les routines
// produisent ce que le coach a décidé, pas un quota écrit dans le code.
//
// Fichier pur, client et serveur.

import { computeCadence, type CadenceInput } from "@/lib/content-cadence";

export interface ContentTargetDef {
  key: string;
  label: string;
  /** Ce que compte l'objectif, en une ligne. */
  hint: string;
  /** Plateformes du journal content_published_log comptées pour cet objectif. */
  platforms: string[];
}

export const CONTENT_TARGET_DEFS: ContentTargetDef[] = [
  { key: "reel", label: "Reels", hint: "Vidéos courtes publiées (un reel posté sur plusieurs réseaux compte pour un)", platforms: ["reel", "instagram", "tiktok", "facebook"] },
  { key: "youtube", label: "Vidéos YouTube", hint: "Vidéos longues publiées", platforms: ["youtube"] },
  { key: "story_insta", label: "Séquences de stories", hint: "Séquences publiées (une séquence = 6 à 10 stories sur une seule idée)", platforms: ["story_insta"] },
  { key: "post_insta", label: "Posts Insta", hint: "Carrousels et images publiés", platforms: ["post_insta"] },
  { key: "linkedin", label: "Posts LinkedIn", hint: "Posts LinkedIn publiés", platforms: ["linkedin"] },
  { key: "threads", label: "Posts Threads", hint: "Posts Threads publiés", platforms: ["threads"] },
];

export const CONTENT_TARGET_KEYS = CONTENT_TARGET_DEFS.map((d) => d.key);

/** Plafond par type et par jour : au-delà, c'est une faute de frappe. */
export const MAX_TARGET = 500;

export type ContentTargets = Partial<Record<string, number>>;

export interface ProductionTime {
  filmingMinutes: number;
  editingMinutes: number;
  reelMinutes: number;
  youtubeMinutes: number;
  youtubePerDay: number;
}

function toInt(v: unknown, max: number): number | null {
  const n = typeof v === "string" ? Number(v.replace(",", ".")) : typeof v === "number" ? v : NaN;
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.min(max, Math.round(n));
}

/** Garde seulement les clés connues et des entiers de 0 à MAX_TARGET ; 0 ou vide = pas d'objectif. */
export function cleanTargets(raw: unknown): ContentTargets {
  const out: ContentTargets = {};
  if (!raw || typeof raw !== "object") return out;
  for (const key of CONTENT_TARGET_KEYS) {
    const n = toInt((raw as Record<string, unknown>)[key], MAX_TARGET);
    if (n !== null && n > 0) out[key] = n;
  }
  return out;
}

export function cleanProductionTime(raw: unknown): ProductionTime | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const filming = toInt(r.filmingMinutes, 24 * 60);
  const editing = toInt(r.editingMinutes, 24 * 60);
  const reel = toInt(r.reelMinutes, 24 * 60);
  const yt = toInt(r.youtubeMinutes, 24 * 60);
  const ytPerDay = toInt(r.youtubePerDay, 20);
  if (filming === null && editing === null) return null;
  return {
    filmingMinutes: filming ?? 0,
    editingMinutes: editing ?? 0,
    reelMinutes: reel ?? 0,
    youtubeMinutes: yt ?? 0,
    youtubePerDay: ytPerDay ?? 0,
  };
}

/** Reels faisables par jour avec ce temps (tournage + montage, YouTube déduit). */
export function reelsFromTime(t: ProductionTime): number {
  const input: CadenceInput = { ...t, youtubeClipsPerDay: 0, shortVideoPlatforms: [] };
  return computeCadence(input, {}).reelsPerDay;
}

export function targetsFromAnswers(answers: Record<string, unknown> | null | undefined): ContentTargets {
  return cleanTargets(answers?.content_targets);
}

/** Publications du jour comptées par objectif, depuis le compte par plateforme. */
export function progressByTarget(countsByPlatform: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const d of CONTENT_TARGET_DEFS) out[d.key] = d.platforms.reduce((s, p) => s + (countsByPlatform[p] ?? 0), 0);
  return out;
}

/** Résumé texte pour le connecteur Claude (routines). */
export function targetsSummary(targets: ContentTargets, done: Record<string, number>, stock: Record<string, number>): string {
  const lines = CONTENT_TARGET_DEFS.map((d) => {
    const t = targets[d.key];
    const s = stock[d.key] ?? 0;
    const p = done[d.key] ?? 0;
    if (!t) return `- ${d.label} : pas d'objectif fixé (publié aujourd'hui ${p}, en stock ${s})`;
    const missing = Math.max(0, t - p - s);
    return `- ${d.label} : objectif ${t} par jour, publié aujourd'hui ${p}, en stock ${s}${missing ? `, il en manque ${missing}` : ", stock suffisant"}`;
  });
  return lines.join("\n");
}
