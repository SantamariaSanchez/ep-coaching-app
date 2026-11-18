// « Ton premier mois » (dépôt du 18/11, ThePrepDad : « assurez-vous que la
// personne ait un résultat tangible dans les 4 premières semaines »). Fichier
// pur : à partir des vraies données (séances faites, charges du carnet, bilans
// du matin), montre ce qui a déjà changé entre le jour 21 et le jour 45. Jamais
// le poids ni l'apparence : un résultat de travail, pas une promesse physique.

export const FIRST_MONTH_FROM_DAY = 21;
export const FIRST_MONTH_TO_DAY = 45;

export type FirstMonthInput = {
  /** Début du suivi (YYYY-MM-DD, heure de Paris). */
  startDate: string | null;
  today: string;
  sessions: { session_date: string | null; is_completed: boolean | null }[];
  logs: { exercise_name: string | null; weight_kg: number | string | null; logged_at: string | null }[];
  bilanDates: string[];
};

export type LiftUp = { name: string; from: number; to: number };

export type FirstMonth = {
  day: number;
  sessionsDone: number;
  activeWeeks: number;
  liftsUp: LiftUp[];
  bilanDays: number;
};

function dayIndex(start: string, date: string): number {
  return Math.floor((new Date(`${date}T12:00:00Z`).getTime() - new Date(`${start}T12:00:00Z`).getTime()) / 86_400_000);
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function buildFirstMonth(input: FirstMonthInput): FirstMonth | null {
  const { startDate, today } = input;
  if (!startDate || !DATE.test(startDate) || !DATE.test(today)) return null;
  const day = dayIndex(startDate, today) + 1;
  if (day < FIRST_MONTH_FROM_DAY || day > FIRST_MONTH_TO_DAY) return null;

  const inWindow = (d: string | null): d is string => !!d && DATE.test(d) && d >= startDate && d <= today;

  const done = input.sessions.filter((s) => s.is_completed && inWindow(s.session_date));
  if (done.length === 0) return null;
  const weeks = new Set(done.map((s) => Math.floor(dayIndex(startDate, s.session_date as string) / 7)));

  // Charge de départ = la plus lourde du premier jour où l'exercice apparaît ;
  // charge actuelle = la plus lourde ensuite. Seulement si elle a monté.
  const byExercise = new Map<string, { first: string; firstMax: number; laterMax: number; label: string }>();
  const sorted = input.logs
    .filter((l) => inWindow(l.logged_at) && (l.exercise_name ?? "").trim())
    .map((l) => ({ name: (l.exercise_name as string).trim(), w: Number(l.weight_kg), at: l.logged_at as string }))
    .filter((l) => Number.isFinite(l.w) && l.w > 0)
    .sort((a, b) => a.at.localeCompare(b.at));
  for (const l of sorted) {
    const key = l.name.toLowerCase();
    const cur = byExercise.get(key);
    if (!cur) byExercise.set(key, { first: l.at, firstMax: l.w, laterMax: 0, label: l.name });
    else if (l.at === cur.first) cur.firstMax = Math.max(cur.firstMax, l.w);
    else cur.laterMax = Math.max(cur.laterMax, l.w);
  }
  const liftsUp = [...byExercise.values()]
    .filter((e) => e.laterMax > e.firstMax)
    .map((e) => ({ name: e.label, from: e.firstMax, to: e.laterMax }))
    .sort((a, b) => (b.to - b.from) / b.from - (a.to - a.from) / a.from)
    .slice(0, 3);

  const bilanDays = new Set(input.bilanDates.filter(inWindow)).size;
  return { day, sessionsDone: done.length, activeWeeks: weeks.size, liftsUp, bilanDays };
}

export function formatKg(n: number): string {
  return `${Number.isInteger(n) ? n : n.toFixed(1).replace(".", ",")} kg`;
}
