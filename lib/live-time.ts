// Heure de Paris pour tout le module Live (créneaux, réservations, notifs,
// cartes, salle d'attente). Module pur, sans import serveur : utilisable
// aussi bien dans les server actions et les crons que dans les composants
// "use client".
//
// Pourquoi un module dédié : Vercel exécute le code serveur en UTC. Les
// créneaux étaient générés avec setHours() sur le serveur, donc une règle
// "04:00-23:00" devenait 06:00-01:00 heure de Paris, et toutes les notifs
// formatées sans timeZone annonçaient 16:00 pour un live à 18:00. Le suivi
// hebdo ajoutait 7 x 24 h en millisecondes : au passage à l'heure d'hiver
// (25 octobre 2026) les séances suivantes glissaient d'une heure. Ici tout
// raisonne en date + heure "murale" de Paris, et Intl gère l'heure d'été.
//
// Même algorithme que parisLocalToIso (lib/staff-kpis.ts), recopié ici car
// lib/staff-* appartient à l'espace équipe et ne doit pas devenir une
// dépendance du module Live.
import { todayInParis } from "@/lib/dates";

export const PARIS_TZ = "Europe/Paris";

interface ParisParts {
  y: number;
  mo: number;
  d: number;
  h: number;
  mi: number;
}

function parisParts(date: Date): ParisParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: PARIS_TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { y: get("year"), mo: get("month"), d: get("day"), h: get("hour"), mi: get("minute") };
}

// Décalage Paris - UTC (en ms) à un instant donné : +1 h l'hiver, +2 h l'été.
function parisOffsetAt(ms: number): number {
  const p = parisParts(new Date(ms));
  return Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi) - Math.floor(ms / 60000) * 60000;
}

/**
 * "2026-10-26" + "18:00" (heure de Paris) vers l'instant ISO UTC.
 * Deux passes : la première estimation du décalage peut tomber du mauvais
 * côté d'un changement d'heure, la seconde la corrige.
 * Renvoie null pour une entrée invalide plutôt que de lever une exception.
 */
export function parisWallClockToIso(dateStr: string, hhmm: string): string | null {
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  const tm = /^(\d{1,2}):(\d{2})/.exec(hhmm);
  if (!dm || !tm) return null;
  const asUtc = Date.UTC(+dm[1], +dm[2] - 1, +dm[3], +tm[1], +tm[2]);
  if (Number.isNaN(asUtc)) return null;
  const firstGuess = asUtc - parisOffsetAt(asUtc);
  const result = asUtc - parisOffsetAt(firstGuess);
  const date = new Date(result);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** "2026-10-26" + n jours, en arithmétique de calendrier (jamais en ms). */
export function addDaysToDateStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Jour ISO d'une date calendaire : 1 = lundi ... 7 = dimanche (convention de coach_availability.day_of_week). */
export function isoWeekdayOfDateStr(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  const js = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return js === 0 ? 7 : js;
}

/** Nombre de jours calendaires entre deux dates "YYYY-MM-DD" (to - from). */
export function daysBetweenDateStr(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}

/** Lundi (date Paris) de la semaine qui contient dateStr. */
export function mondayOfDateStr(dateStr: string): string {
  return addDaysToDateStr(dateStr, 1 - isoWeekdayOfDateStr(dateStr));
}

/** "04:00:00" ou "04:00" vers un nombre de minutes depuis minuit. */
export function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** 240 vers "04:00". */
export function minutesToHhmm(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/** Date calendaire Paris ("YYYY-MM-DD") d'un instant. */
export function parisDateKey(date: Date | string): string {
  const p = parisParts(new Date(date));
  return `${p.y}-${String(p.mo).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
}

/** Heure Paris ("HH:MM") d'un instant. */
export function parisHhmm(date: Date | string): string {
  const p = parisParts(new Date(date));
  return minutesToHhmm(p.h * 60 + p.mi);
}

/** Intl fr-FR toujours en heure de Paris : même rendu serveur (UTC) et navigateur, donc aucun écart d'hydratation. */
export function formatParis(date: Date | string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("fr-FR", { timeZone: PARIS_TZ, ...options }).format(new Date(date));
}

/** "lundi 5 octobre à 18:00" (heure de Paris). */
export function formatLiveDateTime(date: Date | string): string {
  return formatParis(date, { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
}

/** "18:00" (heure de Paris). */
export function formatLiveTime(date: Date | string): string {
  return formatParis(date, { hour: "2-digit", minute: "2-digit" });
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * "Aujourd'hui à 18:00", "Demain à 18:00" ou "lundi 5 octobre à 18:00",
 * le jour étant comparé en dates de Paris (et non en jours UTC du serveur,
 * faux entre minuit et 2 h du matin).
 */
export function formatRelativeLiveDate(date: Date | string): string {
  const time = formatLiveTime(date);
  const diffDays = daysBetweenDateStr(todayInParis(), parisDateKey(date));
  if (diffDays === 0) return `Aujourd'hui à ${time}`;
  if (diffDays === 1) return `Demain à ${time}`;
  return `${formatParis(date, { weekday: "long", day: "numeric", month: "long" })} à ${time}`;
}

/** Durée lisible pour un compte à rebours : "45 s", "12 min", "1 h 05", "2 j". */
export function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  if (totalSeconds < 60) return `${totalSeconds} s`;
  const totalMinutes = Math.floor(totalSeconds / 60);
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  if (hours < 48) return `${hours} h ${String(totalMinutes % 60).padStart(2, "0")}`;
  return `${Math.floor(hours / 24)} j`;
}
