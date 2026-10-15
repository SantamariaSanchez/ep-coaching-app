// Comparateur de photos physique (2026-10-14, retour direct du fondateur :
// « simple bouton pour switch, la semaine avec la semaine 6, un seul bouton
// pour un post Insta »). Fichier partagé serveur/client, sans import
// serveur : met à plat les trois sources de photos de l'appli en une seule
// frise de « séances photo » datées, que le comparateur parcourt.
//
//  - check_ins.photo_paths : les photos physique du bilan de la semaine
//    (source principale pour un client suivi).
//  - photo_updates.photo_paths : poses / photos de progression envoyées
//    depuis la page Photos (préparation compétition et progression).
//  - personal_photos : une photo par ligne (membres sans coach, espace Moi
//    du coach), regroupées par jour de prise.
//
// L'angle n'est stocké nulle part : c'est l'ordre des photos d'une même
// séance qui fait foi (consigne affichée à l'envoi : face, profil, dos). Le
// comparateur aligne donc la photo n°1 avec la photo n°1, etc.

import { driveImageUrl } from "@/lib/drive-utils";

export type PhotoSetSource = "checkin" | "update" | "perso";

export interface PhotoSet {
  id: string;
  /** Date de la séance, AAAA-MM-JJ. */
  date: string;
  /** Une URL par angle, dans l'ordre d'envoi (face, profil, dos...). */
  urls: string[];
  source: PhotoSetSource;
}

const DAY_MS = 86_400_000;

function toDay(value: string): string {
  return value.slice(0, 10);
}

/** Identifiant de la séance photo d'un check-in (pour ouvrir dessus). */
export function checkinSetId(checkinId: string): string {
  return `c-${checkinId}`;
}

export function setsFromCheckins(
  rows: { id: string; week_start: string; photo_urls: string[] | null | undefined }[]
): PhotoSet[] {
  return rows
    .filter((r) => (r.photo_urls?.length ?? 0) > 0)
    .map((r) => ({ id: checkinSetId(r.id), date: toDay(r.week_start), urls: r.photo_urls as string[], source: "checkin" as const }));
}

export function setsFromPhotoUpdates(
  rows: { id: string; submitted_at: string; photo_urls: string[] | null | undefined; drive_image?: string | null }[]
): PhotoSet[] {
  return rows
    .map((r) => {
      const urls = r.photo_urls?.length ? r.photo_urls : r.drive_image ? [r.drive_image] : [];
      return { id: `u-${r.id}`, date: toDay(r.submitted_at), urls, source: "update" as const };
    })
    .filter((s) => s.urls.length > 0);
}

/** Séances des envois de la page Photos (anciens liens Drive compris). */
export function photoUpdateSets(
  rows: { id: string; submitted_at: string; photo_urls: string[] | null | undefined; drive_link?: string | null }[]
): PhotoSet[] {
  return setsFromPhotoUpdates(
    rows.map((r) => ({ ...r, drive_image: r.drive_link ? driveImageUrl(r.drive_link) : null }))
  );
}

export function setsFromPersonalPhotos(
  rows: { id: string; taken_at: string; created_at: string; url: string | null }[]
): PhotoSet[] {
  const byDay = new Map<string, { id: string; created_at: string; url: string }[]>();
  for (const r of rows) {
    if (!r.url) continue;
    const day = toDay(r.taken_at);
    const list = byDay.get(day) ?? [];
    list.push({ id: r.id, created_at: r.created_at, url: r.url });
    byDay.set(day, list);
  }
  return [...byDay.entries()].map(([day, list]) => {
    list.sort((a, b) => a.created_at.localeCompare(b.created_at));
    return { id: `p-${list[0].id}`, date: day, urls: list.map((l) => l.url), source: "perso" as const };
  });
}

/** Fusionne plusieurs sources, de la plus ancienne à la plus récente. */
export function mergePhotoSets(...lists: PhotoSet[][]): PhotoSet[] {
  const seen = new Set<string>();
  const out: PhotoSet[] = [];
  for (const list of lists) {
    for (const s of list) {
      if (seen.has(s.id) || s.urls.length === 0) continue;
      seen.add(s.id);
      out.push(s);
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

export function daysBetween(from: string, to: string): number {
  const a = Date.UTC(+from.slice(0, 4), +from.slice(5, 7) - 1, +from.slice(8, 10));
  const b = Date.UTC(+to.slice(0, 4), +to.slice(5, 7) - 1, +to.slice(8, 10));
  return Math.round((b - a) / DAY_MS);
}

/** Numéro de semaine depuis la toute première séance photo (« Sem. 1 »). */
export function weekIndex(first: string, date: string): number {
  return Math.floor(Math.max(0, daysBetween(first, date)) / 7) + 1;
}

/** « 12 semaines », « 5 jours », « 14 mois » : écart lisible entre deux dates. */
export function durationLabel(days: number): string {
  const d = Math.abs(days);
  if (d < 7) return d <= 1 ? "1 jour" : `${d} jours`;
  const weeks = Math.round(d / 7);
  if (weeks < 53) return weeks === 1 ? "1 semaine" : `${weeks} semaines`;
  const months = Math.round(d / 30.44);
  return `${months} mois`;
}

/**
 * Séance la plus proche de « N semaines avant » la séance `afterIdx`, parmi
 * les plus anciennes. null si l'historique ne remonte pas assez loin (on
 * tolère 3 jours d'écart, un bilan rendu un mardi au lieu d'un lundi).
 */
export function findWeeksBefore(sets: PhotoSet[], afterIdx: number, weeks: number): number | null {
  const after = sets[afterIdx];
  if (!after) return null;
  const target = weeks * 7;
  let best: number | null = null;
  let bestGap = Infinity;
  for (let i = 0; i < afterIdx; i++) {
    const age = daysBetween(sets[i].date, after.date);
    if (age < target - 3) continue;
    const gap = Math.abs(age - target);
    if (gap < bestGap) {
      bestGap = gap;
      best = i;
    }
  }
  return best;
}

const ANGLE_NAMES = ["Face", "Profil", "Dos"];

export function angleLabel(index: number, count: number): string {
  if (count <= 1) return "Photo";
  return ANGLE_NAMES[index] ?? `Photo ${index + 1}`;
}

export function formatSetDate(date: string, withYear = false): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
  }).format(new Date(`${date}T12:00:00`));
}
