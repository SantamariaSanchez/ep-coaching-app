// Revue de la semaine (audit 2026-09-29) : types et fonctions PURES, sans
// aucun import. Même discipline que lib/weekly-recap-format.ts et
// lib/daily-logs-helpers.ts : ce module est importable tel quel depuis un
// Client Component (WeeklyReviewReflection.tsx) comme depuis le cron ou une
// server action, sans jamais entraîner createServerSupabase/next-headers
// dans le bundle navigateur.
//
// Toutes les dates manipulées ici sont des chaînes "YYYY-MM-DD" déjà
// exprimées en heure de Paris (todayInParis côté appelant). L'arithmétique
// se fait à midi UTC : jamais de décalage de jour possible, quelle que soit
// l'heure d'été/hiver ou le fuseau du serveur.

// ── Dates ──────────────────────────────────────────────────────────────────

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateStr(s: string | null | undefined): s is string {
  if (!s || !DATE_RE.test(s)) return false;
  const d = new Date(`${s}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function addDaysToDate(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Jour ISO (1 = lundi ... 7 = dimanche), même convention que program_days.weekday. */
export function isoDowOf(dateStr: string): number {
  const js = new Date(`${dateStr}T12:00:00Z`).getUTCDay();
  return js === 0 ? 7 : js;
}

export function mondayOf(dateStr: string): string {
  return addDaysToDate(dateStr, -(isoDowOf(dateStr) - 1));
}

export function isoWeekNumber(dateStr: string): number {
  // Le jeudi de la semaine ISO porte l'année et le numéro de semaine.
  const thursday = new Date(`${addDaysToDate(mondayOf(dateStr), 3)}T12:00:00Z`);
  const jan1 = Date.UTC(thursday.getUTCFullYear(), 0, 1, 12);
  return Math.floor((thursday.getTime() - jan1) / (7 * 86_400_000)) + 1;
}

// Nombre maximum de semaines passées consultables : au delà, les données
// sont trop clairsemées pour une revue utile et ça borne un paramètre
// d'URL arbitraire.
export const MAX_WEEKS_BACK = 52;

/**
 * Semaine affichée à partir du paramètre ?semaine=YYYY-MM-DD.
 * Sans paramètre : la semaine en cours, sauf le lundi où la semaine qui
 * vient de se terminer est bien plus utile qu'une semaine encore vide
 * (c'est le moment naturel de la revue, juste après le récap du dimanche).
 */
export function resolveWeekStart(param: string | null | undefined, today: string): string {
  const currentMonday = mondayOf(today);
  const oldest = addDaysToDate(currentMonday, -7 * MAX_WEEKS_BACK);
  if (isValidDateStr(param)) {
    const m = mondayOf(param);
    if (m > currentMonday) return currentMonday;
    if (m < oldest) return oldest;
    return m;
  }
  return isoDowOf(today) === 1 ? addDaysToDate(currentMonday, -7) : currentMonday;
}

const DAY_NAMES = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
const MONTH_NAMES = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

export function dayName(dateStr: string): string {
  return DAY_NAMES[isoDowOf(dateStr) - 1];
}

/** "du lundi 21 au dimanche 27 septembre" (ou "du lundi 29 septembre au dimanche 5 octobre"). */
export function formatWeekRange(weekStart: string): string {
  const weekEnd = addDaysToDate(weekStart, 6);
  const [, sm, sd] = weekStart.split("-").map(Number);
  const [, em, ed] = weekEnd.split("-").map(Number);
  const startPart = sm === em ? `${sd}` : `${sd} ${MONTH_NAMES[sm - 1]}`;
  return `du lundi ${startPart} au dimanche ${ed} ${MONTH_NAMES[em - 1]}`;
}

// ── Séances ────────────────────────────────────────────────────────────────

/**
 * Nombre de VRAIES séances sur une période.
 *
 * Bug corrigé (audit 2026-09-29) : le récap comptait les lignes
 * workout_logs, or il y a UNE LIGNE PAR EXERCICE (insert par exercice dans
 * app/api/client/sessions/[id]/complete/route.ts). Résultat : "32 séances"
 * annoncées pour 2 à 3 séances réelles.
 *
 * Source de vérité : les séances terminées (sessions.is_completed). On y
 * ajoute les lignes workout_logs liées à une séance absente de la liste
 * (même séance comptée une seule fois grâce à son id), et les vieilles
 * lignes sans session_id (juillet/août, avant la colonne) qui comptent pour
 * une séance par jour, seulement si aucune séance terminée n'existe déjà
 * ce jour-là, pour ne jamais compter deux fois la même journée.
 */
export function countDistinctSessions(
  completed: { id: string; session_date: string | null }[],
  logs: { session_id: string | null; logged_at: string | null }[],
): number {
  const keys = new Set<string>();
  const daysWithSession = new Set<string>();
  for (const s of completed) {
    keys.add(s.id);
    if (s.session_date) daysWithSession.add(s.session_date);
  }
  for (const l of logs) {
    if (l.session_id) {
      keys.add(l.session_id);
    } else if (l.logged_at) {
      const day = l.logged_at.slice(0, 10);
      if (!daysWithSession.has(day)) keys.add(`jour:${day}`);
    }
  }
  return keys.size;
}

// ── Sommeil ────────────────────────────────────────────────────────────────

function clockToMinutes(t: string): number | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(t);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

export function minutesToClock(total: number): string {
  const norm = ((Math.round(total) % 1440) + 1440) % 1440;
  return `${String(Math.floor(norm / 60)).padStart(2, "0")}:${String(norm % 60).padStart(2, "0")}`;
}

/**
 * Heure de coucher moyenne et écart typique d'un soir à l'autre.
 * Un coucher à 00:30 et un à 23:30 doivent donner 00:00 de moyenne, pas
 * 12:00 : les heures avant midi sont donc décalées de 24 h (coucher après
 * minuit = même nuit, plus tard) avant de faire la moyenne.
 */
export function bedtimeStats(times: (string | null)[]): { avg: string; spreadMinutes: number } | null {
  const mins = times
    .map((t) => (t ? clockToMinutes(t) : null))
    .filter((m): m is number => m != null)
    .map((m) => (m < 12 * 60 ? m + 1440 : m));
  if (mins.length === 0) return null;
  const mean = mins.reduce((a, b) => a + b, 0) / mins.length;
  const variance = mins.reduce((a, b) => a + (b - mean) ** 2, 0) / mins.length;
  return { avg: minutesToClock(mean), spreadMinutes: Math.round(Math.sqrt(variance)) };
}

// ── Données de la revue ────────────────────────────────────────────────────

export interface WeeklyReflection {
  id: string;
  content: string;
  mood: number | null;
  entryDate: string;
}

export interface WeeklyHabitDay {
  date: string;
  /** Null : jour à venir, ou aucun élément suivi ce jour-là. */
  score: number | null;
}

export interface WeeklyReviewData {
  weekStart: string;
  weekEnd: string;
  weekNumber: number;
  isCurrentWeek: boolean;
  /** Jours déjà entamés de la semaine (1 à 7) : dénominateur honnête en cours de semaine. */
  daysElapsed: number;
  sessionsDone: number;
  /** Séances prévues par le programme actif sur la semaine entière. Null si aucun programme. */
  sessionsPlanned: number | null;
  doneLabels: string[];
  /** Séances prévues à un jour déjà passé et non faites. */
  missedLabels: string[];
  bilanDays: number;
  nutritionDays: number;
  avgKcal: number | null;
  kcalTarget: number | null;
  avgSteps: number | null;
  stepGoal: number | null;
  avgSleep: number | null;
  bedtime: { avg: string; spreadMinutes: number } | null;
  avgWeight: number | null;
  weightDelta: number | null;
  habitDays: WeeklyHabitDay[];
  avgHabit: number | null;
  bestDay: { date: string; score: number } | null;
  worstDay: { date: string; score: number } | null;
  records: { exercise: string; weightKg: number | null; reps: number | null }[];
  reflection: WeeklyReflection | null;
}

function fr(n: number, digits = 0): string {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function formatSleepHours(h: number): string {
  const hours = Math.floor(h);
  const minutes = Math.round((h - hours) * 60);
  if (minutes === 60) return `${hours + 1} h`;
  return minutes > 0 ? `${hours} h ${String(minutes).padStart(2, "0")}` : `${hours} h`;
}

export function formatWeightDelta(delta: number): string {
  if (Math.abs(delta) < 0.1) return "stable";
  return `${delta > 0 ? "+" : ""}${fr(delta, 1)} kg`;
}

/**
 * Résumé entraînement en une phrase, réutilisé tel quel comme point de
 * départ du check-in pour les membres coachés.
 */
export function trainingSummary(d: WeeklyReviewData): string {
  if (d.sessionsDone === 0 && !d.sessionsPlanned) return "Aucune séance terminée cette semaine.";
  const base = d.sessionsPlanned
    ? `${d.sessionsDone} séance${d.sessionsDone > 1 ? "s" : ""} sur ${d.sessionsPlanned} prévue${d.sessionsPlanned > 1 ? "s" : ""}`
    : `${d.sessionsDone} séance${d.sessionsDone > 1 ? "s" : ""} terminée${d.sessionsDone > 1 ? "s" : ""}`;
  const done = d.doneLabels.length > 0 ? ` : ${d.doneLabels.join(", ")}` : "";
  const missed = d.missedLabels.length > 0 ? `. Manquée${d.missedLabels.length > 1 ? "s" : ""} : ${d.missedLabels.join(", ")}` : "";
  return `${base}${done}${missed}.`;
}

/**
 * 4 à 6 phrases factuelles tirées des chiffres. Volontairement descriptives :
 * aucune conclusion médicale ni jugement, juste ce que disent les données.
 */
export function buildInsights(d: WeeklyReviewData): string[] {
  const out: string[] = [];
  const days = d.daysElapsed;

  out.push(trainingSummary(d));

  if (d.bilanDays > 0) {
    out.push(`Bilan quotidien rempli ${d.bilanDays} jour${d.bilanDays > 1 ? "s" : ""} sur ${days}.`);
  } else {
    out.push("Aucun bilan quotidien rempli cette semaine : c'est lui qui alimente le sommeil et le poids ici.");
  }

  if (d.avgWeight != null) {
    const trend =
      d.weightDelta == null
        ? ""
        : Math.abs(d.weightDelta) < 0.1
          ? ", stable par rapport à la semaine d'avant"
          : `, ${d.weightDelta < 0 ? "en baisse" : "en hausse"} de ${fr(Math.abs(d.weightDelta), 1)} kg par rapport à la semaine d'avant`;
    out.push(`Poids moyen ${fr(d.avgWeight, 1)} kg${trend}.`);
  }

  if (d.avgSleep != null) {
    let s = `Tu as dormi ${formatSleepHours(d.avgSleep)} en moyenne`;
    if (d.bedtime) {
      s += `, coucher moyen vers ${d.bedtime.avg}`;
      if (d.bedtime.spreadMinutes >= 60) s += `, avec des couchers très variables (${d.bedtime.spreadMinutes} min d'écart typique)`;
      else if (d.bedtime.spreadMinutes > 0) s += ` (${d.bedtime.spreadMinutes} min d'écart typique)`;
    }
    out.push(`${s}.`);
  }

  if (d.nutritionDays > 0) {
    let s = `Repas notés ${d.nutritionDays} jour${d.nutritionDays > 1 ? "s" : ""} sur ${days}`;
    if (d.avgKcal != null) {
      s += `, ${fr(d.avgKcal)} kcal en moyenne ces jours-là`;
      if (d.kcalTarget) s += ` pour un objectif de ${fr(d.kcalTarget)}`;
    }
    out.push(`${s}.`);
  }

  if (d.records.length > 0) {
    const first = d.records[0];
    const detail = first.weightKg != null ? ` dont ${first.exercise} à ${fr(first.weightKg, first.weightKg % 1 === 0 ? 0 : 1)} kg${first.reps ? ` x ${first.reps}` : ""}` : "";
    out.push(`${d.records.length} record${d.records.length > 1 ? "s" : ""} battu${d.records.length > 1 ? "s" : ""}${detail}.`);
  }

  if (d.bestDay && d.worstDay && d.bestDay.date !== d.worstDay.date) {
    out.push(`Meilleur jour : ${dayName(d.bestDay.date)} (${d.bestDay.score} %). Jour le plus faible : ${dayName(d.worstDay.date)} (${d.worstDay.score} %).`);
  }

  // Records avant meilleur/pire jour : si la liste déborde, c'est la
  // comparaison de jours qui saute, pas la bonne nouvelle.
  return out.slice(0, 6);
}

// ── Réflexion écrite ───────────────────────────────────────────────────────

// La revue est enregistrée dans le journal Mindset existant
// (mindset_journal_entries, prompt_key "bilan_semaine") : un seul texte,
// lisible tel quel dans l'onglet Journal. Les intitulés servent aussi à
// relire le texte pour pré-remplir le formulaire quand on modifie sa revue.
export const REFLECTION_FIELDS = [
  { key: "victory", label: "Ma plus grosse victoire" },
  { key: "blocker", label: "Ce qui a coincé" },
  { key: "intention", label: "Mon intention pour la semaine prochaine" },
] as const;

export type ReflectionAnswers = Record<(typeof REFLECTION_FIELDS)[number]["key"], string>;

export const REFLECTION_FIELD_MAX = 2000;

export function formatReflectionContent(weekStart: string, answers: ReflectionAnswers): string {
  const parts = [`Revue de la semaine ${formatWeekRange(weekStart)}`];
  for (const f of REFLECTION_FIELDS) {
    const v = answers[f.key].trim();
    if (v) parts.push(`${f.label}\n${v}`);
  }
  return parts.join("\n\n");
}

export function parseReflectionContent(content: string): ReflectionAnswers {
  const answers: ReflectionAnswers = { victory: "", blocker: "", intention: "" };
  // Lecture ligne à ligne : une ligne égale à un intitulé ouvre un nouveau
  // champ, tout le reste (y compris des lignes vides écrites par la
  // personne) appartient au champ en cours.
  let current: keyof ReflectionAnswers | null = null;
  const buf: Record<keyof ReflectionAnswers, string[]> = { victory: [], blocker: [], intention: [] };
  for (const line of content.split("\n")) {
    const field = REFLECTION_FIELDS.find((f) => f.label === line.trim());
    if (field) {
      current = field.key;
      continue;
    }
    if (current) buf[current].push(line);
  }
  for (const f of REFLECTION_FIELDS) answers[f.key] = buf[f.key].join("\n").trim();
  return answers;
}
