"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClientSupabase } from "@/lib/supabase-client";
import { getWeekPerformanceColor, type PerformanceKey } from "@/lib/roadmap-colors";
import { addDaysIso, buildRoadmapWeeks, diffDaysIso, minIso, mondayOfIso, type RoadmapWeek } from "@/lib/roadmap-weeks";
import { todayInParis } from "@/lib/dates";

// Stats hebdo du calendrier de road map (components/roadmap/RoadmapCalendar.tsx).
//
// Refonte 2026-09-28 (audit "calendrier road map") :
// - avant, une boucle faisait 3 requêtes EN SÉRIE par semaine passée (45
//   allers-retours à l'été 2027 sur la road map du fondateur) : maintenant 4
//   à 6 requêtes en parallèle sur toute la période, ventilées ensuite en
//   mémoire par semaine ;
// - les clés de semaine viennent de lib/roadmap-weeks.ts, les mêmes que le
//   calendrier (fini le décalage UTC/local après le passage à l'heure d'été) ;
// - le suivi repose sur les bilans quotidiens (daily_logs), la vraie source,
//   et plus seulement sur check_ins (vide) ;
// - "séances prévues" vient du programme actif (programs.frequency, repli
//   nutrition_profiles.sessions_per_week) au lieu des séances démarrées.

export interface DayStat {
  weight: number | null;
  sleep: number | null;
  /** Total kcal logué dans le tracker, null si rien de logué. */
  kcal: number | null;
  sessionDone: boolean;
  hasBilan: boolean;
}

export interface WeekStat {
  weekStart: string;
  weekEnd: string;
  weekNumber: number;
  checkinExists: boolean;
  bilanDays: number;
  nutritionDays: number;
  sessionsDone: number;
  /** Séances prévues sur une semaine pleine, null si aucun plan connu. */
  sessionsPlanned: number | null;
  /** Jours écoulés de la semaine : 7 pour une semaine passée. */
  daysElapsed: number;
  isCurrent: boolean;
  avgWeight: number | null;
  avgSleep: number | null;
  /** Moyenne kcal sur les jours logués uniquement. */
  avgKcal: number | null;
  perDay: Record<string, DayStat>;
  performanceKey: PerformanceKey;
}

export interface WeekStatsRows {
  dailyLogs: { log_date: string; weight_morning: number | null; sleep_hours: number | null }[];
  foodLogs: { logged_at: string; calories: number | null }[];
  sessionDates: string[];
  checkinWeekStarts: string[];
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function avg(values: number[]): number | null {
  return values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : null;
}

function emptyDay(): DayStat {
  return { weight: null, sleep: null, kcal: null, sessionDone: false, hasBilan: false };
}

/**
 * Ventilation pure des lignes brutes par semaine (testable sans base). Les
 * semaines après `today` sont "future" et ne portent aucune donnée.
 */
export function aggregateWeekStats(
  weeks: RoadmapWeek[],
  rows: WeekStatsRows,
  today: string,
  plannedPerWeek: number | null
): WeekStat[] {
  const perDay = new Map<string, DayStat>();
  const day = (iso: string): DayStat => {
    let d = perDay.get(iso);
    if (!d) {
      d = emptyDay();
      perDay.set(iso, d);
    }
    return d;
  };

  for (const l of rows.dailyLogs) {
    const d = day(l.log_date);
    d.hasBilan = true;
    if (l.weight_morning != null) d.weight = Number(l.weight_morning);
    if (l.sleep_hours != null) d.sleep = Number(l.sleep_hours);
  }
  for (const f of rows.foodLogs) {
    // logged_at est une colonne date ; slice au cas où un horodatage passerait.
    const d = day(f.logged_at.slice(0, 10));
    d.kcal = (d.kcal ?? 0) + (Number(f.calories) || 0);
  }
  for (const s of rows.sessionDates) day(s.slice(0, 10)).sessionDone = true;
  const checkinWeeks = new Set(rows.checkinWeekStarts.map((w) => mondayOfIso(w.slice(0, 10))));

  return weeks.map((w) => {
    const isFuture = w.weekStart > today;
    const isCurrent = !isFuture && w.weekEnd >= today;
    const daysElapsed = isFuture ? 0 : isCurrent ? diffDaysIso(w.weekStart, today) + 1 : 7;

    const days: Record<string, DayStat> = {};
    const weights: number[] = [];
    const sleeps: number[] = [];
    const kcals: number[] = [];
    let bilanDays = 0;
    let nutritionDays = 0;
    let sessionsDone = 0;

    if (!isFuture) {
      for (let i = 0; i < 7; i++) {
        const iso = addDaysIso(w.weekStart, i);
        const d = perDay.get(iso);
        if (!d) continue;
        days[iso] = d;
        if (d.hasBilan) bilanDays++;
        if (d.kcal != null) {
          nutritionDays++;
          kcals.push(d.kcal);
        }
        if (d.sessionDone) sessionsDone++;
        if (d.weight != null) weights.push(d.weight);
        if (d.sleep != null) sleeps.push(d.sleep);
      }
    }

    const checkinExists = checkinWeeks.has(w.weekStart);
    const a = avg(weights);
    const s = avg(sleeps);
    const k = avg(kcals);

    return {
      weekStart: w.weekStart,
      weekEnd: w.weekEnd,
      weekNumber: w.index,
      checkinExists,
      bilanDays,
      nutritionDays,
      sessionsDone,
      sessionsPlanned: plannedPerWeek,
      daysElapsed,
      isCurrent,
      avgWeight: a == null ? null : round1(a),
      avgSleep: s == null ? null : round1(s),
      avgKcal: k == null ? null : Math.round(k),
      perDay: days,
      performanceKey: getWeekPerformanceColor({
        checkinExists,
        bilanDays,
        nutritionDays,
        sessionsDone,
        sessionsPlanned: plannedPerWeek,
        daysElapsed,
        isFuture,
      }),
    };
  });
}

// PostgREST plafonne une réponse à 1000 lignes : sur une longue road map,
// food_logs (une ligne par aliment) dépasse vite ce seuil et les semaines
// les plus récentes auraient disparu sans bruit. On pagine explicitement.
const PAGE = 1000;
const MAX_PAGES = 30;

async function selectAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < MAX_PAGES; i++) {
    const { data, error } = await page(i * PAGE, i * PAGE + PAGE - 1);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

async function loadPlannedPerWeek(supabase: SupabaseClient, clientId: string): Promise<number | null> {
  const [programRes, profileRes] = await Promise.all([
    supabase
      .from("programs")
      .select("frequency")
      .eq("client_id", clientId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("nutrition_profiles")
      .select("sessions_per_week")
      .eq("client_id", clientId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (programRes.error) throw new Error(programRes.error.message);
  if (profileRes.error) throw new Error(profileRes.error.message);
  const freq = (programRes.data as { frequency: number | null } | null)?.frequency;
  if (freq && freq > 0) return freq;
  const spw = (profileRes.data as { sessions_per_week: number | null } | null)?.sessions_per_week;
  return spw && spw > 0 ? spw : null;
}

/**
 * Stats de toutes les semaines de la road map. Lève une erreur si une
 * lecture échoue : le calendrier l'affiche au lieu de peindre des semaines
 * "Aucune donnée" trompeuses.
 */
export async function getWeekStats(
  clientId: string,
  startDate: string,
  endDate: string,
  plannedPerWeek?: number | null
): Promise<WeekStat[]> {
  const weeks = buildRoadmapWeeks(startDate, endDate);
  if (weeks.length === 0) return [];

  const today = todayInParis();
  const rangeStart = weeks[0].weekStart;
  const rangeEnd = minIso(weeks[weeks.length - 1].weekEnd, today);

  // Road map entièrement dans le futur : rien à lire.
  if (rangeStart > today) return aggregateWeekStats(weeks, emptyRows(), today, plannedPerWeek ?? null);

  const supabase = createClientSupabase();

  const [dailyLogs, foodLogs, sessions, checkins, planned] = await Promise.all([
    selectAll<WeekStatsRows["dailyLogs"][number]>((from, to) =>
      supabase
        .from("daily_logs")
        .select("log_date, weight_morning, sleep_hours")
        .eq("client_id", clientId)
        .gte("log_date", rangeStart)
        .lte("log_date", rangeEnd)
        .order("log_date")
        .range(from, to)
    ),
    selectAll<WeekStatsRows["foodLogs"][number]>((from, to) =>
      supabase
        .from("food_logs")
        .select("logged_at, calories")
        .eq("client_id", clientId)
        .gte("logged_at", rangeStart)
        .lte("logged_at", rangeEnd)
        .order("logged_at")
        .order("id")
        .range(from, to)
    ),
    selectAll<{ session_date: string }>((from, to) =>
      supabase
        .from("sessions")
        .select("session_date")
        .eq("client_id", clientId)
        .eq("is_completed", true)
        .gte("session_date", rangeStart)
        .lte("session_date", rangeEnd)
        // Tri stable (plusieurs séances le même jour) : sans id, la
        // pagination pourrait sauter ou doubler une ligne entre deux pages.
        .order("session_date")
        .order("id")
        .range(from, to)
    ),
    // Bonus pour un éventuel client accompagné qui remplit son check-in hebdo.
    selectAll<{ week_start: string }>((from, to) =>
      supabase
        .from("check_ins")
        .select("week_start")
        .eq("client_id", clientId)
        .gte("week_start", rangeStart)
        .lte("week_start", rangeEnd)
        .order("week_start")
        .range(from, to)
    ),
    plannedPerWeek !== undefined ? Promise.resolve(plannedPerWeek) : loadPlannedPerWeek(supabase, clientId),
  ]);

  return aggregateWeekStats(
    weeks,
    {
      dailyLogs,
      foodLogs,
      sessionDates: sessions.map((s) => s.session_date),
      checkinWeekStarts: checkins.map((c) => c.week_start),
    },
    today,
    planned
  );
}

function emptyRows(): WeekStatsRows {
  return { dailyLogs: [], foodLogs: [], sessionDates: [], checkinWeekStarts: [] };
}
