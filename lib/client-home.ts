// Accueil « Aujourd'hui » du client (refonte 2026-10-21) : le tableau de
// bord du jour qui relie l'agenda, la séance du programme, la diète et ce
// qui attend la personne. Calcul pur, sans import serveur : la page et
// l'aperçu coach le nourrissent avec les données lues en base
// (utils/client-home.ts), la page de prévisualisation avec des données
// factices, et l'heure est toujours passée en paramètre (jamais lue ici).

import { isBlockOnDate } from "@/lib/agenda-day";
import { blockKind, mealSlotOf, toMin, travelModeOf, travelSteps, MEAL_SLOT_NAMES, type AgendaKind } from "@/lib/agenda-engine";
import { estimateMinutes, slotForDay, weekStartOf, addDaysIso, isoWeekday, WEEKDAY_LONG } from "@/lib/program-week";
import { planItemsFor, planTotals, macrosFor, sumMacros, slotLabel, slotRank, isSlotStarted } from "@/lib/nutrition-engine";
import { pickFocusMeal, slotTime, type MealStatus } from "@/lib/diet-day";
import type { ScheduleBlock } from "@/utils/agenda";
import type { ProgramWithDays } from "@/utils/programs";
import type { DietPlanWithMeals, FoodLogWithFood, NutritionProfile } from "@/utils/nutrition";

export const HOME_BASE = "/dashboard/client";

// ── Agenda du jour ───────────────────────────────────────────────────────

export type HomeBlockAction = "seance" | "repas" | "bilan" | "agenda";

export interface HomeBlock {
  id: string;
  start: string; // "HH:MM"
  end: string;
  label: string;
  kind: AgendaKind;
  icon: string | null;
  tasks: { text: string; done: boolean }[];
  action: HomeBlockAction;
  href: string;
  mealSlot: string | null;
  /** Trajet à pied ou en transports : pas estimés. */
  steps: number | null;
  /** Réveil : un repère dans la journée, jamais « le bloc en cours ». */
  marker: boolean;
}

const isReveil = (label: string) => /r[ée]veil/i.test(label);
const isBilan = (b: { icon: string | null; label: string }) => b.icon === "bilan" || /\bbilan\b/i.test(b.label);

function minutesOf(hhmm: string): number {
  return toMin(hhmm);
}

/** Fin d'un bloc en minutes (un bloc qui finit à minuit ou le lendemain s'arrête à 24 h). */
function endMin(b: { start: string; end: string }): number {
  const s = minutesOf(b.start);
  const e = minutesOf(b.end);
  return e <= s ? 24 * 60 : e;
}

export function homeBlocksFor(blocks: ScheduleBlock[], date: string, completedKeys: string[] = []): HomeBlock[] {
  const dow = isoWeekday(date);
  const done = new Set(completedKeys);
  return blocks
    .filter((b) => isBlockOnDate(b, date, dow))
    .sort((a, b) => a.start_time.localeCompare(b.start_time))
    .map((b) => {
      const kind = blockKind(b);
      const start = b.start_time.slice(0, 5);
      const end = (b.end_time ?? b.start_time).slice(0, 5);
      const mealSlot = kind === "repas" ? mealSlotOf(b) : null;
      let action: HomeBlockAction = "agenda";
      let href = `${HOME_BASE}/agenda`;
      if (kind === "seance") {
        action = "seance";
        href = `${HOME_BASE}/program`;
      } else if (mealSlot) {
        action = "repas";
        href = `${HOME_BASE}/nutrition?repas=${mealSlot}`;
      } else if (isBilan(b)) {
        action = "bilan";
        href = `${HOME_BASE}/bilan`;
      }
      const minutes = Math.max(0, endMin({ start, end }) - minutesOf(start));
      const mode = kind === "trajet" ? travelModeOf(b) : null;
      const steps = mode ? travelSteps(mode, minutes) : 0;
      return {
        id: b.id,
        start,
        end,
        label: b.label,
        kind,
        icon: b.icon,
        tasks: (b.tasks ?? []).filter((t) => t.trim()).map((text, i) => ({ text, done: done.has(`${b.id}:${i}`) })),
        action,
        href,
        mealSlot,
        steps: steps > 0 ? steps : null,
        marker: isReveil(b.label),
      };
    });
}

export interface HomeNow {
  /** Bloc en cours (null entre deux blocs). */
  current: HomeBlock | null;
  /** Trajet en cours juste avant le bloc mis en avant. */
  during: HomeBlock | null;
  /** Prochain bloc (celui mis en avant s'il n'y a rien en cours). */
  next: HomeBlock | null;
  /** Les quelques blocs suivants, après celui mis en avant. */
  later: HomeBlock[];
  /** Plus rien de prévu aujourd'hui. */
  dayOver: boolean;
  /** Minutes restantes du bloc en cours, ou avant le prochain. */
  minutesLeft: number | null;
  /** Avancée du bloc en cours (0..1). */
  progress: number | null;
}

export function pickNow(blocks: HomeBlock[], now: string, laterCount = 3): HomeNow {
  const n = minutesOf(now);
  const real = blocks.filter((b) => !b.marker);
  const running = real.filter((b) => minutesOf(b.start) <= n && endMin(b) > n);
  // Un trajet qui chevauche un autre bloc ne lui vole pas la vedette.
  let current: HomeBlock | null =
    [...running].sort((a, b) => Number(a.kind === "trajet") - Number(b.kind === "trajet") || minutesOf(b.start) - minutesOf(a.start))[0] ?? null;
  const upcoming = real.filter((b) => minutesOf(b.start) > n && b !== current);
  const next = upcoming[0] ?? null;
  // En route vers la salle (ou vers un repas) : c'est ce qui suit qui compte,
  // le trajet reste affiché en petit.
  let during: HomeBlock | null = null;
  if (current?.kind === "trajet" && next && next.kind !== "trajet" && minutesOf(next.start) - n <= 30) {
    during = current;
    current = null;
  }
  const later = (current ? upcoming : upcoming.slice(1)).slice(0, laterCount);
  return {
    current,
    during,
    next,
    later,
    dayOver: !current && !next,
    minutesLeft: current ? endMin(current) - n : next ? minutesOf(next.start) - n : null,
    progress: current ? Math.max(0, Math.min(1, (n - minutesOf(current.start)) / Math.max(1, endMin(current) - minutesOf(current.start)))) : null,
  };
}

/** « 1 h 10 », « 25 min ». */
export function minutesLabel(m: number): string {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${String(r).padStart(2, "0")}` : `${h} h`;
}

/** Segments de la bande « ta journée » : position et largeur en % de la journée affichée. */
export function dayStrip(blocks: HomeBlock[], now: string): {
  from: string;
  to: string;
  nowPct: number | null;
  segments: { id: string; left: number; width: number; kind: AgendaKind; icon: string | null; past: boolean; marker: boolean }[];
} | null {
  if (blocks.length === 0) return null;
  const s = Math.min(...blocks.map((b) => minutesOf(b.start)));
  const e = Math.max(...blocks.map((b) => endMin(b)));
  const span = Math.max(60, e - s);
  const n = minutesOf(now);
  const pct = (m: number) => ((m - s) / span) * 100;
  return {
    from: blocks.find((b) => minutesOf(b.start) === s)!.start,
    to: `${String(Math.floor(e / 60) % 24).padStart(2, "0")}:${String(e % 60).padStart(2, "0")}`,
    nowPct: n >= s && n <= e ? pct(n) : null,
    segments: blocks.map((b) => ({
      id: b.id,
      left: pct(minutesOf(b.start)),
      width: Math.max(0.8, pct(endMin(b)) - pct(minutesOf(b.start))),
      kind: b.kind,
      icon: b.icon,
      past: endMin(b) <= n,
      marker: b.marker,
    })),
  };
}

// ── Séance du jour ──────────────────────────────────────────────────────

export interface HomeSession {
  dayLabel: string;
  programId: string;
  muscleGroups: string[];
  exercises: number;
  minutes: number | null;
  time: string | null;
  end: string | null;
  state: "todo" | "resume" | "done";
}

export interface HomeTraining {
  hasProgram: boolean;
  programName: string | null;
  /** Séance prévue aujourd'hui (ou en cours), sinon null : jour de repos. */
  today: HomeSession | null;
  /** Programme sans jours fixes : la prochaine séance à faire cette semaine. */
  free: boolean;
  /** Jour de repos : la prochaine séance prévue. */
  next: { label: string; when: string; time: string | null } | null;
}

export interface TrainingSessionRow {
  day_label: string;
  session_date: string;
  is_completed: boolean;
}

function normLabel(v: string): string {
  return v.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/^s[eé]ance\s*:?\s*/i, "").trim();
}

export function buildTraining(
  program: ProgramWithDays | null,
  blocks: ScheduleBlock[],
  sessions: TrainingSessionRow[],
  today: string
): HomeTraining {
  const empty: HomeTraining = { hasProgram: false, programName: null, today: null, free: false, next: null };
  if (!program || program.days.length === 0) return { ...empty, hasProgram: !!program, programName: program?.name ?? null };
  const dow = isoWeekday(today);
  const weekStart = weekStartOf(today);
  const week = sessions.filter((s) => s.session_date >= weekStart);
  const doneLabels = new Set(week.filter((s) => s.is_completed).map((s) => normLabel(s.day_label)));
  const doneToday = new Set(week.filter((s) => s.is_completed && s.session_date === today).map((s) => normLabel(s.day_label)));
  const openToday = week.find((s) => !s.is_completed && s.session_date === today) ?? null;

  const toSession = (d: ProgramWithDays["days"][number]): HomeSession => {
    const slot = slotForDay(d, blocks, weekStart);
    const key = normLabel(d.day_label);
    const state: HomeSession["state"] =
      openToday && normLabel(openToday.day_label) === key ? "resume" : doneToday.has(key) || (!d.weekday && doneLabels.has(key)) ? "done" : "todo";
    return {
      dayLabel: d.day_label,
      programId: program.id,
      muscleGroups: [...new Set(d.exercises.map((e) => e.muscle_group).filter(Boolean) as string[])],
      exercises: d.exercises.length,
      minutes: estimateMinutes(d.exercises),
      time: d.weekday === dow ? slot?.start ?? null : null,
      end: d.weekday === dow ? slot?.end ?? null : null,
      state,
    };
  };

  // Séance ouverte aujourd'hui : elle passe avant tout le reste.
  const resumeDay = openToday ? program.days.find((d) => normLabel(d.day_label) === normLabel(openToday.day_label)) : null;
  const todayDay = resumeDay ?? program.days.find((d) => d.weekday === dow) ?? null;
  const fixed = program.days.some((d) => !!d.weekday);
  if (todayDay) return { hasProgram: true, programName: program.name, today: toSession(todayDay), free: false, next: null };

  if (!fixed) {
    // Sans jours fixes : la première pas encore faite cette semaine.
    const ordered = [...program.days].sort((a, b) => a.position - b.position);
    const pick = ordered.find((d) => !doneLabels.has(normLabel(d.day_label)));
    return { hasProgram: true, programName: program.name, today: pick ? toSession(pick) : null, free: true, next: null };
  }

  // Jour de repos : la prochaine séance, cette semaine ou la suivante.
  const placed = program.days.filter((d) => d.weekday).sort((a, b) => a.weekday! - b.weekday!);
  const after = placed.find((d) => d.weekday! > dow) ?? placed[0];
  const inDays = after.weekday! > dow ? after.weekday! - dow : 7 - dow + after.weekday!;
  const date = addDaysIso(today, inDays);
  const slot = slotForDay(after, blocks, weekStartOf(date));
  const when = inDays === 1 ? "demain" : WEEKDAY_LONG[after.weekday!].toLowerCase();
  return { hasProgram: true, programName: program.name, today: null, free: false, next: { label: after.day_label, when, time: slot?.start ?? null } };
}

// ── Nutrition du jour ───────────────────────────────────────────────────

export interface HomeNutrition {
  hasPlan: boolean;
  target: { kcal: number; prot: number } | null;
  eaten: { kcal: number; prot: number };
  next: { slot: string; label: string; time: string; kcal: number; prot: number; when: "now" | "next" | "late" } | null;
  mealsTotal: number;
  mealsDone: number;
  /** Macros prévues par créneau (pour le bloc repas en cours). */
  bySlot: Record<string, { kcal: number; prot: number }>;
}

export function buildNutrition(input: {
  plan: DietPlanWithMeals | null;
  logs: FoodLogWithFood[];
  checks: Record<string, MealStatus>;
  profile: NutritionProfile | null;
  agendaTimes: Record<string, string>;
  /** Nom du bloc repas dans l'agenda (« Repas 2 ») : le même mot partout. */
  agendaLabels?: Record<string, string>;
  today: string;
  now: string;
}): HomeNutrition {
  const { plan, logs, checks, profile, agendaTimes, agendaLabels = {}, today, now } = input;
  const items = planItemsFor(plan, today);
  const r = (n: number) => Math.round(n);
  const logSlot = (l: FoodLogWithFood) => l.meal_slot ?? "breakfast";
  const bySlot: HomeNutrition["bySlot"] = {};
  if (items.length === 0) {
    // Pas de diète : objectif de la fiche nutrition, seuls les repas déjà
    // commencés comptent (la journée n'est pas pré-remplie d'avance).
    const eatenLogs = logs.filter((l) => isSlotStarted(logSlot(l), now));
    const tgt = profile?.calories_target ? { kcal: r(profile.calories_target), prot: r(profile.proteins_target ?? 0) } : null;
    return {
      hasPlan: false,
      target: tgt,
      eaten: { kcal: r(eatenLogs.reduce((s, l) => s + (l.calories ?? 0), 0)), prot: r(eatenLogs.reduce((s, l) => s + (l.proteins ?? 0), 0)) },
      next: null,
      mealsTotal: 0,
      mealsDone: 0,
      bySlot,
    };
  }
  const planSlots = [...new Set(items.map((i) => i.slot))].sort((a, b) => slotRank(a) - slotRank(b));
  const status: Record<string, MealStatus | undefined> = { ...checks };
  if (plan?.mode === "flexible") for (const l of logs) status[logSlot(l)] ??= "mange";
  // Même règle que l'onglet Nutrition : la journée fixe est pré-remplie dès
  // le matin, seuls les repas cochés (ou notés hors plan) comptent.
  const eatenLogs = logs.filter((l) => {
    const st = status[logSlot(l)];
    return !planSlots.includes(logSlot(l)) || (!!st && st !== "saute");
  });
  for (const slot of planSlots) {
    const slotLogs = logs.filter((l) => logSlot(l) === slot);
    const m = slotLogs.length
      ? { kcal: slotLogs.reduce((s, l) => s + (l.calories ?? 0), 0), prot: slotLogs.reduce((s, l) => s + (l.proteins ?? 0), 0) }
      : (() => {
          const t = sumMacros(items.filter((i) => i.slot === slot).map((i) => macrosFor(i.food, i.grams)));
          return { kcal: t.calories, prot: t.proteins };
        })();
    bySlot[slot] = { kcal: r(m.kcal), prot: r(m.prot) };
  }
  const totals = planTotals(items);
  const focus = pickFocusMeal(planSlots, status, now);
  return {
    hasPlan: true,
    target: { kcal: r(totals.calories), prot: r(totals.proteins) },
    eaten: { kcal: r(eatenLogs.reduce((s, l) => s + (l.calories ?? 0), 0)), prot: r(eatenLogs.reduce((s, l) => s + (l.proteins ?? 0), 0)) },
    next: focus
      ? {
          slot: focus.slot,
          label: agendaLabels[focus.slot] ?? (slotLabel(focus.slot) || MEAL_SLOT_NAMES[focus.slot] || focus.slot),
          time: agendaTimes[focus.slot] ?? slotTime(focus.slot),
          kcal: bySlot[focus.slot]?.kcal ?? 0,
          prot: bySlot[focus.slot]?.prot ?? 0,
          when: focus.when,
        }
      : null,
    mealsTotal: planSlots.length,
    mealsDone: planSlots.filter((s) => status[s] && status[s] !== "saute").length,
    bySlot,
  };
}

// ── À faire ─────────────────────────────────────────────────────────────

export type HomeTodoKind = "message" | "tache" | "checkin" | "bilan" | "victoire" | "cycle";

export interface HomeTodo {
  key: string;
  kind: HomeTodoKind;
  label: string;
  sub: string | null;
  href: string;
  urgent?: boolean;
}

export function buildTodos(input: {
  coached: boolean;
  now: string;
  date: string;
  unreadMessages: number;
  coachTasks: { id: string; label: string }[];
  bilanDone: boolean;
  checkinDone: boolean;
  checkinDay: number | null;
  bilanTime: string | null;
  showVictory: boolean;
  showCycle: boolean;
}): HomeTodo[] {
  const out: HomeTodo[] = [];
  if (input.coached && input.unreadMessages > 0) {
    out.push({
      key: "message",
      kind: "message",
      label: input.unreadMessages > 1 ? `${input.unreadMessages} messages de ton coach` : "Nouveau message de ton coach",
      sub: "Ouvre la conversation",
      href: `${HOME_BASE}/messages`,
      urgent: true,
    });
  }
  if (input.coached) {
    for (const t of input.coachTasks.slice(0, 3)) {
      out.push({ key: `tache:${t.id}`, kind: "tache", label: t.label, sub: "Demandé par ton coach", href: `${HOME_BASE}/tasks` });
    }
    if (input.coachTasks.length > 3) {
      out.push({ key: "taches", kind: "tache", label: `${input.coachTasks.length - 3} autres tâches du coach`, sub: null, href: `${HOME_BASE}/tasks` });
    }
  }
  if (input.coached && !input.checkinDone) {
    const dow = isoWeekday(input.date);
    const day = input.checkinDay && input.checkinDay >= 1 && input.checkinDay <= 7 ? input.checkinDay : null;
    if (!day || dow >= day) {
      const sub = !day
        ? "Ton ressenti de la semaine, pour ton coach"
        : dow === day
          ? "À envoyer aujourd'hui"
          : `Prévu ${WEEKDAY_LONG[day].toLowerCase()}, ton coach l'attend`;
      out.push({ key: "checkin", kind: "checkin", label: "Check-in de la semaine", sub, href: `${HOME_BASE}/checkin`, urgent: !!day });
    }
  }
  if (!input.bilanDone) {
    out.push({
      key: "bilan",
      kind: "bilan",
      label: "Bilan du jour",
      sub: input.bilanTime ? `Prévu à ${input.bilanTime} · poids, sommeil, ressenti` : "Poids, sommeil, ressenti, 30 secondes",
      href: `${HOME_BASE}/bilan`,
    });
  }
  if (input.showVictory) {
    out.push({ key: "victoire", kind: "victoire", label: "Partage ta victoire de la semaine", sub: "Bilan envoyé, montre-le à la communauté", href: `${HOME_BASE}/communaute/victoires` });
  }
  if (input.showCycle) {
    out.push({ key: "cycle", kind: "cycle", label: "Active le suivi de ton cycle", sub: "Pour comprendre tes variations d'énergie et de poids", href: `${HOME_BASE}/cycle` });
  }
  return out;
}

// ── Journée complète ────────────────────────────────────────────────────

export interface HomeDayData {
  date: string;
  now: string;
  blocks: HomeBlock[];
  training: HomeTraining;
  nutrition: HomeNutrition;
  todos: HomeTodo[];
}

/** Nom de chaque repas tel qu'il est posé dans l'agenda du jour (premier bloc par créneau). */
export function mealLabelsOf(blocks: HomeBlock[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const b of blocks) if (b.mealSlot && !out[b.mealSlot]) out[b.mealSlot] = b.label;
  return out;
}

/**
 * « À faire » sans doublon : le bilan n'y figure plus quand il est déjà le
 * bloc mis en avant dans « maintenant ».
 */
export function visibleTodos(day: HomeDayData): HomeTodo[] {
  const now = pickNow(day.blocks, day.now);
  const focus = now.current ?? now.next;
  return focus?.action === "bilan" ? day.todos.filter((t) => t.kind !== "bilan") : day.todos;
}

/** Semaines écoulées depuis le début du coaching (0 sans date de début). */
export function weeksSince(startDate: string | null | undefined, today: string): number {
  if (!startDate) return 0;
  return (new Date(`${today}T12:00:00`).getTime() - new Date(`${startDate}T12:00:00`).getTime()) / (7 * 86400000);
}

/** Heure du bloc bilan du jour, s'il y en a un dans l'agenda. */
export function bilanTimeOf(blocks: HomeBlock[]): string | null {
  return blocks.find((b) => b.action === "bilan")?.start ?? null;
}
