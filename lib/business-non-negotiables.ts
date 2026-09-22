import { createAdminClient } from "@/lib/supabase-admin";
import { todayInParis } from "@/lib/dates";

// Pilotage business du coach lui-même — source : contenu Mastermind
// ThePrepDad (retour direct 2026-09-22), avec la précision explicite de
// Santamaria que les chiffres cités dans le Mastermind ne sont pas à
// copier tels quels ("c'est pas forcément ces chiffres exacts que tu dois
// mettre") : ce sont des objectifs par défaut ajustables, jamais des
// contraintes figées en dur. Voir supabase/migrations/20260922_business_non_negotiables.sql.
//
// Le pilier "Pas" du Mastermind n'a pas sa place ici : il réutilise
// step_logs/step_settings, déjà génériques par client_id (voir
// lib/habit-score.ts, qui les interroge déjà pour la page Moi du coach).

export interface NonNegotiablesDay {
  logDate: string;
  readingPages: number | null;
  mindfulnessMinutes: number | null;
  objectivesMorning: boolean;
  objectivesMidday: boolean;
  objectivesEvening: boolean;
  contentMinutes: number | null;
  contentPosts: number | null;
  outreachConversations: number | null;
}

const EMPTY_DAY = (logDate: string): NonNegotiablesDay => ({
  logDate,
  readingPages: null,
  mindfulnessMinutes: null,
  objectivesMorning: false,
  objectivesMidday: false,
  objectivesEvening: false,
  contentMinutes: null,
  contentPosts: null,
  outreachConversations: null,
});

function mapRow(row: {
  log_date: string;
  reading_pages: number | null;
  mindfulness_minutes: number | null;
  objectives_morning: boolean;
  objectives_midday: boolean;
  objectives_evening: boolean;
  content_minutes: number | null;
  content_posts: number | null;
  outreach_conversations: number | null;
}): NonNegotiablesDay {
  return {
    logDate: row.log_date,
    readingPages: row.reading_pages,
    mindfulnessMinutes: row.mindfulness_minutes,
    objectivesMorning: row.objectives_morning,
    objectivesMidday: row.objectives_midday,
    objectivesEvening: row.objectives_evening,
    contentMinutes: row.content_minutes,
    contentPosts: row.content_posts,
    outreachConversations: row.outreach_conversations,
  };
}

export async function getNonNegotiablesDay(coachId: string, logDate: string): Promise<NonNegotiablesDay> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("business_non_negotiables_log")
    .select(
      "log_date, reading_pages, mindfulness_minutes, objectives_morning, objectives_midday, objectives_evening, content_minutes, content_posts, outreach_conversations"
    )
    .eq("coach_id", coachId)
    .eq("log_date", logDate)
    .maybeSingle();
  return data ? mapRow(data) : EMPTY_DAY(logDate);
}

function isoDatesBack(endDate: string, days: number): string[] {
  const end = new Date(endDate + "T12:00:00");
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(end.getDate() - i);
    out.push(d.toISOString().split("T")[0]);
  }
  return out;
}

/** 7 derniers jours (aujourd'hui inclus, en dernière position), un jour sans ligne = journée vide plutôt qu'absente. */
export async function getWeekNonNegotiables(coachId: string, endDate = todayInParis()): Promise<NonNegotiablesDay[]> {
  const dates = isoDatesBack(endDate, 7);
  const admin = createAdminClient();
  const { data } = await admin
    .from("business_non_negotiables_log")
    .select(
      "log_date, reading_pages, mindfulness_minutes, objectives_morning, objectives_midday, objectives_evening, content_minutes, content_posts, outreach_conversations"
    )
    .eq("coach_id", coachId)
    .gte("log_date", dates[0])
    .lte("log_date", dates[dates.length - 1]);
  const byDate = new Map((data ?? []).map((row) => [row.log_date, mapRow(row)]));
  return dates.map((d) => byDate.get(d) ?? EMPTY_DAY(d));
}

// Un jour "respecté" = au moins un pilier réellement rempli. Volontairement
// souple (pas d'exigence que les 5 piliers soient tous faits) : Santamaria
// a explicitement dit ne pas vouloir copier les chiffres du Mastermind tels
// quels, donc pas de seuil arbitraire par pilier ici — juste un signal
// "j'ai fait quelque chose aujourd'hui" plutôt qu'une case vide.
export function isDayRespected(day: NonNegotiablesDay): boolean {
  return (
    (day.readingPages ?? 0) > 0 ||
    (day.mindfulnessMinutes ?? 0) > 0 ||
    day.objectivesMorning ||
    day.objectivesMidday ||
    day.objectivesEvening ||
    (day.contentMinutes ?? 0) > 0 ||
    (day.contentPosts ?? 0) > 0 ||
    (day.outreachConversations ?? 0) > 0
  );
}

/** Jours consécutifs respectés en remontant depuis aujourd'hui (même logique que currentStreak dans lib/habit-score.ts, appliquée aux non-négociables). */
export function currentNonNegotiablesStreak(days: NonNegotiablesDay[]): number {
  let streak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (isDayRespected(days[i])) streak++;
    else break;
  }
  return streak;
}

export interface UpsertNonNegotiablesInput {
  logDate: string;
  readingPages?: number | null;
  mindfulnessMinutes?: number | null;
  objectivesMorning?: boolean;
  objectivesMidday?: boolean;
  objectivesEvening?: boolean;
  contentMinutes?: number | null;
  contentPosts?: number | null;
  outreachConversations?: number | null;
}

// ── Objectifs mensuels ───────────────────────────────────────────────────

export interface MonthlyObjectives {
  monthStart: string;
  objectives: string[];
}

function monthStartOf(date: string): string {
  return date.slice(0, 7) + "-01";
}

export async function getMonthlyObjectives(coachId: string, forDate = todayInParis()): Promise<MonthlyObjectives> {
  const monthStart = monthStartOf(forDate);
  const admin = createAdminClient();
  const { data } = await admin
    .from("business_monthly_objectives")
    .select("month_start, objectives")
    .eq("coach_id", coachId)
    .eq("month_start", monthStart)
    .maybeSingle();
  return { monthStart, objectives: (data?.objectives as string[] | null) ?? [] };
}

// ── Pilotage hebdo (les 5 catégories du Mastermind) ─────────────────────
// Contrairement aux non-négociables (saisie manuelle quotidienne), ces
// chiffres existent déjà ailleurs dans l'appli — on les agrège plutôt que
// de redemander à Santamaria de les ressaisir à la main.

export interface WeeklyBusinessStats {
  from: string;
  to: string;
  // 1. Contenu & création
  scriptsPublished: number;
  // 1bis/Audience & visibilité — agrégées sur les scripts publiés dans la fenêtre
  totalViews: number;
  totalEngagement: number; // likes + comments + shares + saves
  // 2. Leads & conversations
  newLeads: number;
  // 3. Offres & ventes
  callsBooked: number;
  callsDone: number;
  callsClosed: number;
  revenueGenerated: number;
  // 4. Pilotage & objectifs
  nonNegotiablesRespectedDays: number; // sur les 7 jours de la fenêtre
}

export async function getWeeklyBusinessStats(coachId: string, endDate = todayInParis()): Promise<WeeklyBusinessStats> {
  const dates = isoDatesBack(endDate, 7);
  const from = dates[0];
  const to = dates[dates.length - 1];
  const fromTs = `${from}T00:00:00Z`;
  const toTs = `${to}T23:59:59Z`;

  const admin = createAdminClient();
  const [scriptsRes, leadsRes, callsRes, weekLogRes] = await Promise.all([
    admin
      .from("coach_scripts")
      .select("views, likes, comments_count, shares, saves, status, created_at")
      .eq("coach_id", coachId)
      .gte("created_at", fromTs)
      .lte("created_at", toTs),
    admin
      .from("leads")
      .select("id", { count: "exact", head: true })
      .gte("created_at", fromTs)
      .lte("created_at", toTs),
    admin
      .from("sales_calls")
      .select("show_up, closed, revenue_amount, call_date")
      .eq("coach_id", coachId)
      .gte("call_date", from)
      .lte("call_date", to),
    getWeekNonNegotiables(coachId, endDate),
  ]);

  const scripts = (scriptsRes.data ?? []) as {
    views: number | null; likes: number | null; comments_count: number | null;
    shares: number | null; saves: number | null; status: string;
  }[];
  const published = scripts.filter((s) => s.status === "publie");
  const totalViews = published.reduce((sum, s) => sum + (s.views ?? 0), 0);
  const totalEngagement = published.reduce(
    (sum, s) => sum + (s.likes ?? 0) + (s.comments_count ?? 0) + (s.shares ?? 0) + (s.saves ?? 0),
    0
  );

  const calls = (callsRes.data ?? []) as { show_up: boolean | null; closed: boolean | null; revenue_amount: number | null }[];

  return {
    from,
    to,
    scriptsPublished: published.length,
    totalViews,
    totalEngagement,
    newLeads: leadsRes.count ?? 0,
    callsBooked: calls.length,
    callsDone: calls.filter((c) => c.show_up === true).length,
    callsClosed: calls.filter((c) => c.closed === true).length,
    revenueGenerated: calls.reduce((sum, c) => sum + (c.revenue_amount ?? 0), 0),
    nonNegotiablesRespectedDays: weekLogRes.filter(isDayRespected).length,
  };
}
