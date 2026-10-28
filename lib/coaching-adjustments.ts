// Moteur de recommandations d'ajustement : quand toucher aux calories, quand
// décharger, quand ajouter du volume, quand changer d'exercice, plateau,
// adhésion, sommeil et stress. Module PUR (aucun import serveur), testé.
//
// Principes (Mastermind, niveau 4 et 5) :
//  - on décide sur des tendances d'au moins deux semaines, jamais sur une
//    pesée ou un jour ;
//  - on regarde le ressenti et l'adhésion AVANT de baisser quoi que ce soit,
//    et en cas de mauvaise adhésion on simplifie la semaine suivante ;
//  - avant de baisser les calories, on regarde les pas du quotidien ;
//  - en prise de muscle, on ne monte pas si les performances progressent déjà ;
//  - sécurité : aucun chiffre de déficit en cas de signal de trouble
//    alimentaire (lib/eating-safety.ts), ni pour une personne mineure ;
//    jamais de diagnostic, on oriente.
//
// Chaque suggestion tient en une phrase simple, a un niveau de confiance
// INTERNE (jamais affiché, jamais de source) et au plus une action. Le coach
// décide toujours : rien n'est appliqué sans un clic.

import type { DailyLog } from "@/lib/daily-logs-helpers";
import type { SessionWithSets } from "@/utils/sessions";
import { linearTrend } from "@/lib/phase-pilot";
import {
  ADJUSTMENT_RULES,
  HABIT_RULES,
  PROGRESSION_RULES,
  TRAINING_RULES,
  NUTRITION_RULES,
  recoveryStatusFrom,
  weeklySetsStartFor,
  weeklySetsCeilingFor,
  type ConfidenceLevel,
  type NutritionPhase,
  type TrainingLevel,
} from "@/lib/coaching-knowledge";
import { eatingSafetyLevel, type EatingRelation } from "@/lib/eating-safety";

export type AdjustmentKind =
  | "safety"
  | "data"
  | "calories"
  | "steps"
  | "adherence"
  | "recovery"
  | "deload"
  | "volume"
  | "exercise"
  | "plateau"
  | "phase";

export interface MacroTargetsLite {
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
}

export type AdjustmentAction =
  | { type: "adjust_calories"; deltaKcal: number; label: string }
  | { type: "link"; tab: "nutrition" | "programme" | "bilans" | "cycle" | "profil"; label: string };

export interface AdjustmentSuggestion {
  id: string;
  kind: AdjustmentKind;
  severity: "info" | "warning";
  /** Pour qui : le coach seul, le client seul, ou les deux. */
  audience: "coach" | "client" | "both";
  /** Une phrase, à la troisième personne, pour la fiche coach. */
  coachText: string;
  /** Une phrase, au tutoiement, pour le client. */
  clientText: string;
  /** Confiance interne dans la règle : jamais affichée à un client. */
  confidence: ConfidenceLevel;
  action: AdjustmentAction | null;
}

export interface AdjustmentInput {
  /** YYYY-MM-DD, toujours passé en paramètre. */
  today: string;
  phase: NutritionPhase | null;
  level: TrainingLevel;
  eatingRelation: EatingRelation | null;
  age: number | null;
  target: MacroTargetsLite | null;
  /** Bilans quotidiens, dans n'importe quel ordre. */
  logs: DailyLog[];
  /** Séances terminées, la plus récente en premier. */
  sessions: SessionWithSets[];
  /** Semaines de déficit continu déjà faites, si connues. */
  deficitWeeks?: number | null;
}

const DAY = 86400000;

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(`${b}T12:00:00Z`).getTime() - new Date(`${a}T12:00:00Z`).getTime()) / DAY);
}

function avg(values: number[]): number | null {
  return values.length === 0 ? null : values.reduce((a, b) => a + b, 0) / values.length;
}

function within(logs: DailyLog[], today: string, days: number): DailyLog[] {
  return logs.filter((l) => {
    const d = daysBetween(l.log_date, today);
    return d >= 0 && d < days;
  });
}

/** Un palier de calories dans la fourchette 150 à 300, arrondi à 10. */
export function calorieStep(calories: number, level: TrainingLevel, direction: "down" | "up"): number {
  const { stepKcal, deficitStepPct } = ADJUSTMENT_RULES;
  const pct = level === "avance" || direction === "up" ? deficitStepPct.min : (deficitStepPct.min + deficitStepPct.max) / 2;
  const raw = Math.min(stepKcal.max, Math.max(stepKcal.min, calories * pct));
  return Math.round(raw / 10) * 10;
}

/**
 * Effet d'un changement de calories sur les macros : protéines inchangées,
 * lipides inchangés tant qu'ils restent au-dessus du plancher, glucides = le reste.
 */
export function applyCalorieDelta(target: MacroTargetsLite, deltaKcal: number): MacroTargetsLite {
  const calories = Math.round(target.calories + deltaKcal);
  const fatFloor = Math.round((NUTRITION_RULES.fatPctKcal.min * calories) / 9);
  let fats = target.fats;
  if (fats < fatFloor) fats = fatFloor;
  const carbs = Math.max(0, Math.round((calories - target.proteins * 4 - fats * 9) / 4));
  return { calories, proteins: target.proteins, carbs, fats };
}

/** Estimation de 1RM (Epley), pour comparer des séries à charges et répétitions différentes. */
function e1rm(weight: number, reps: number): number {
  return weight * (1 + reps / 30);
}

interface ExerciseHistory {
  name: string;
  /** Meilleure estimation de force par séance, la plus récente en premier. */
  perSession: number[];
}

function exerciseHistories(sessions: SessionWithSets[]): ExerciseHistory[] {
  const map = new Map<string, number[]>();
  for (const s of sessions) {
    const best = new Map<string, number>();
    for (const set of s.sets) {
      if (set.weight_kg == null || set.reps_actual == null || set.reps_actual <= 0 || set.weight_kg <= 0) continue;
      const v = e1rm(set.weight_kg, set.reps_actual);
      best.set(set.exercise_name, Math.max(best.get(set.exercise_name) ?? 0, v));
    }
    for (const [name, v] of best) map.set(name, [...(map.get(name) ?? []), v]);
  }
  return [...map.entries()].map(([name, perSession]) => ({ name, perSession }));
}

/** Exercices sans progrès sur les dernières séances (au moins 5 séances d'historique). */
export function stagnantExercises(sessions: SessionWithSets[]): string[] {
  const n = PROGRESSION_RULES.stagnationSessions;
  const out: string[] = [];
  for (const h of exerciseHistories(sessions)) {
    if (h.perSession.length < n + 1) continue;
    const recent = h.perSession.slice(0, n);
    const before = h.perSession.slice(n);
    if (Math.max(...recent) <= Math.max(...before) * 1.005) out.push(h.name);
  }
  return out;
}

/** Part des exercices dont la force estimée baisse nettement sur les deux dernières séances comparées aux précédentes. */
export function performanceDeclineRatio(sessions: SessionWithSets[]): { ratio: number; tracked: number } {
  let tracked = 0;
  let declined = 0;
  for (const h of exerciseHistories(sessions)) {
    if (h.perSession.length < 4) continue;
    tracked += 1;
    const recent = avg(h.perSession.slice(0, 2)) ?? 0;
    const before = avg(h.perSession.slice(2, 4)) ?? 0;
    if (before > 0 && recent < before * 0.97) declined += 1;
  }
  return { ratio: tracked === 0 ? 0 : declined / tracked, tracked };
}

/** Séries difficiles par grand muscle et par semaine, sur les 14 derniers jours. */
export function weeklyHardSetsByGroup(sessions: SessionWithSets[], today: string): Record<string, number> {
  const totals: Record<string, number> = {};
  let weeks = 2;
  const recent = sessions.filter((s) => {
    const d = daysBetween(s.session_date, today);
    return d >= 0 && d < 14;
  });
  if (recent.length === 0) return totals;
  for (const s of recent) {
    for (const set of s.sets) {
      const g = set.muscle_group;
      if (!g) continue;
      const hard =
        (set.reps_actual ?? 0) >= TRAINING_RULES.hardSetMinReps && (set.rir_actual == null || set.rir_actual <= TRAINING_RULES.hardSetMaxRir);
      if (hard) totals[g] = (totals[g] ?? 0) + 1;
    }
  }
  weeks = 2;
  for (const g of Object.keys(totals)) totals[g] = Math.round((totals[g] / weeks) * 10) / 10;
  return totals;
}

export function computeAdjustments(input: AdjustmentInput): AdjustmentSuggestion[] {
  const { today, phase, level, target, sessions } = input;
  const safety = eatingSafetyLevel(input.eatingRelation);
  const out: AdjustmentSuggestion[] = [];

  // ── Sécurité : aucun chiffre, on oriente ──────────────────────────────────
  if (safety === "stop") {
    out.push({
      id: "adj-safety-stop",
      kind: "safety",
      severity: "warning",
      audience: "coach",
      coachText:
        "Relation à l'alimentation signalée : aucun ajustement de calories à proposer, oriente vers un professionnel de santé et parle du factuel et de la santé, jamais de l'apparence.",
      clientText: "On avance sur l'entraînement et les habitudes, sans toucher aux chiffres pour l'instant.",
      confidence: "decision",
      action: null,
    });
    return out;
  }

  const logs = [...input.logs].sort((a, b) => b.log_date.localeCompare(a.log_date));
  const last14 = within(logs, today, 14);
  const last7 = within(logs, today, 7);
  const minor = input.age != null && input.age < 18;
  const deficitFrozen = safety === "watch" || minor;

  // ── Données ───────────────────────────────────────────────────────────────
  const weightPoints = within(logs, today, 28)
    .filter((l) => l.weight_morning != null)
    .map((l) => ({ date: l.log_date, kg: l.weight_morning as number }));
  const trend = linearTrend(weightPoints);
  const weightsLast14 = last14.filter((l) => l.weight_morning != null).length;

  if (weightsLast14 < ADJUSTMENT_RULES.minWeighInsIn14Days) {
    out.push({
      id: "adj-data-weight",
      kind: "data",
      severity: "info",
      audience: "both",
      coachText: `Moins de ${ADJUSTMENT_RULES.minWeighInsIn14Days} pesées sur 14 jours : pas assez pour décider d'un ajustement, encourage la pesée du matin.`,
      clientText: "Pèse-toi chaque matin : après deux semaines de pesées, on pourra ajuster avec certitude.",
      confidence: "enseignement",
      action: { type: "link", tab: "bilans", label: "Voir les bilans" },
    });
  }

  // ── Adhésion (avant toute baisse de calories) ─────────────────────────────
  const loggedKcal = last14.filter((l) => l.calories_kcal != null);
  const loggedRatio = loggedKcal.length / 14;
  const avgKcal = avg(loggedKcal.map((l) => l.calories_kcal as number));
  const lowAdherence = last14.length >= 7 && loggedRatio < ADJUSTMENT_RULES.loggedDaysRatioMin;
  if (lowAdherence) {
    out.push({
      id: "adj-adherence-low",
      kind: "adherence",
      severity: "warning",
      audience: "both",
      coachText:
        "Peu de jours renseignés ces deux dernières semaines : demande ce qui bloque et simplifie le plan de la semaine suivante avant de toucher aux chiffres.",
      clientText: "Cette semaine, on simplifie : note seulement tes protéines et tes calories, le reste peut attendre.",
      confidence: "enseignement",
      action: { type: "link", tab: "nutrition", label: "Ouvrir la nutrition" },
    });
  }

  // ── Récupération : sommeil et stress ──────────────────────────────────────
  const sleepAvg = avg(last7.filter((l) => l.sleep_hours != null).map((l) => l.sleep_hours as number));
  const highStressDays = last7.filter((l) => l.stress === "high").length;
  const recovery = recoveryStatusFrom({ sleepHours: sleepAvg, stressLevel: highStressDays >= 4 ? 9 : null });
  const recoveryLimited = recovery === "limited" || (sleepAvg != null && sleepAvg < HABIT_RULES.sleepHoursMin - 0.5);
  if (recoveryLimited) {
    out.push({
      id: "adj-recovery",
      kind: "recovery",
      severity: "warning",
      audience: "both",
      coachText: "Sommeil court ou stress élevé cette semaine : ne monte pas le volume et ne baisse pas les calories maintenant, la récupération passe d'abord.",
      clientText: "Cette semaine, vise plus de sommeil : c'est ce qui te fera le plus avancer, avant de changer quoi que ce soit au plan.",
      confidence: "enseignement",
      action: { type: "link", tab: "bilans", label: "Voir le sommeil" },
    });
  }

  // ── Calories selon la tendance de poids ───────────────────────────────────
  if (phase && target && trend && !lowAdherence) {
    const meanKg = trend.mean;
    const weeklyPct = ((trend.slopePerDay * 7) / meanKg) * 100;
    const marginPct = ((2 * trend.seSlopePerDay * 7) / meanKg) * 100;
    const reliable = marginPct <= ADJUSTMENT_RULES.trendMaxMarginPct && trend.spanDays >= ADJUSTMENT_RULES.minDaysBeforeAdjust;
    const corridor = ADJUSTMENT_RULES.weeklyRatePct[phase === "surplus" ? "surplus" : phase];
    const hungerHigh = last7.filter((l) => l.hunger === "high").length >= 3;
    const stepsAvg = avg(last14.filter((l) => l.steps != null && l.steps > 0).map((l) => l.steps as number));
    const energyAvg = avg(last7.filter((l) => l.energy != null).map((l) => l.energy as number));
    const performanceUp = sessions.length >= 4 && performanceDeclineRatio(sessions).ratio === 0 && exerciseHistories(sessions).some((h) => h.perSession.length >= 2 && h.perSession[0] > h.perSession[h.perSession.length - 1]);

    if (!reliable) {
      out.push({
        id: "adj-trend-fragile",
        kind: "data",
        severity: "info",
        audience: "coach",
        coachText: "Tendance de poids encore fragile (pesées espacées ou irrégulières) : ne change rien aux calories, demande des pesées plus régulières.",
        clientText: "Pèse-toi à la même heure chaque matin, la tendance sera plus claire.",
        confidence: "enseignement",
        action: null,
      });
    } else if (phase === "deficit") {
      if (weeklyPct > corridor.max) {
        // Perte trop lente, à l'arrêt ou prise de poids.
        if (recoveryLimited || hungerHigh) {
          out.push({
            id: "adj-cal-hold-recovery",
            kind: "plateau",
            severity: "info",
            audience: "both",
            coachText: "Perte au ralenti, mais faim élevée ou récupération courte : on ne baisse pas les calories, on améliore d'abord le sommeil et la faim.",
            clientText: "Ta perte ralentit mais ton corps a surtout besoin de récupérer : on ne baisse rien cette semaine.",
            confidence: "enseignement",
            action: null,
          });
        } else if (stepsAvg != null && stepsAvg < HABIT_RULES.stepsTarget) {
          out.push({
            id: "adj-steps-first",
            kind: "steps",
            severity: "info",
            audience: "both",
            coachText: `Perte au ralenti avec ${Math.round(stepsAvg)} pas par jour en moyenne : ajoute ${HABIT_RULES.stepsRampPer2Weeks} pas par jour avant de baisser les calories.`,
            clientText: `Pour relancer ta perte, ajoute ${HABIT_RULES.stepsRampPer2Weeks} pas par jour, c'est plus doux qu'une baisse de calories.`,
            confidence: "enseignement",
            action: { type: "link", tab: "bilans", label: "Voir les pas" },
          });
        } else if (avgKcal != null && target.calories && avgKcal > target.calories * (1 + ADJUSTMENT_RULES.adherenceTolerancePct)) {
          out.push({
            id: "adj-cal-above-target",
            kind: "adherence",
            severity: "info",
            audience: "both",
            coachText: "L'apport réel dépasse nettement la cible : vérifie pesées d'aliments et sauces avant de baisser la cible.",
            clientText: "Ton apport réel dépasse ta cible : pèse tes aliments crus et compte l'huile, avant de changer ton plan.",
            confidence: "enseignement",
            action: null,
          });
        } else if (!deficitFrozen) {
          const delta = -calorieStep(target.calories, level, "down");
          out.push({
            id: "adj-cal-down",
            kind: "calories",
            severity: "info",
            audience: "coach",
            coachText: `Perte au ralenti depuis plus de deux semaines avec un suivi propre : baisse de ${-delta} kcal, protéines inchangées.`,
            clientText: "Ta coach peut ajuster légèrement tes calories pour relancer ta perte.",
            confidence: "enseignement",
            action: { type: "adjust_calories", deltaKcal: delta, label: `Baisser de ${-delta} kcal` },
          });
        }
      } else if (weeklyPct < corridor.min) {
        const delta = ADJUSTMENT_RULES.stepKcal.min;
        out.push({
          id: "adj-cal-up-fast",
          kind: "calories",
          severity: "warning",
          audience: "coach",
          coachText: `Perte plus rapide que ${-corridor.min} % du poids par semaine : remonte de ${delta} kcal pour protéger le muscle et l'énergie.`,
          clientText: "Tu perds un peu vite : on remonte légèrement tes calories pour garder ton énergie et ton muscle.",
          confidence: "enseignement",
          action: { type: "adjust_calories", deltaKcal: delta, label: `Remonter de ${delta} kcal` },
        });
      }
      if (input.deficitWeeks != null && input.deficitWeeks >= ADJUSTMENT_RULES.deficitMaxWeeks) {
        out.push({
          id: "adj-diet-break-long",
          kind: "phase",
          severity: "warning",
          audience: "both",
          coachText: `Déficit depuis ${input.deficitWeeks} semaines : prévois ${ADJUSTMENT_RULES.maintenanceBreakWeeks.min} à ${ADJUSTMENT_RULES.maintenanceBreakWeeks.max} semaines à la maintenance, puis un retour progressif.`,
          clientText: "Tu es en déficit depuis longtemps : une pause à la maintenance va t'aider.",
          confidence: "enseignement",
          action: { type: "link", tab: "profil", label: "Voir la phase" },
        });
      } else if (hungerHigh && energyAvg != null && energyAvg <= 4 && (input.deficitWeeks ?? 0) >= 8) {
        out.push({
          id: "adj-diet-break-energy",
          kind: "phase",
          severity: "warning",
          audience: "both",
          coachText: `Faim élevée et énergie basse après plusieurs semaines de déficit : envisage ${ADJUSTMENT_RULES.maintenanceBreakWeeks.min} à ${ADJUSTMENT_RULES.maintenanceBreakWeeks.max} semaines à la maintenance.`,
          clientText: "Tu sembles fatigué et affamé : une pause à la maintenance peut te faire du bien.",
          confidence: "enseignement",
          action: { type: "link", tab: "profil", label: "Voir la phase" },
        });
      }
    } else if (phase === "surplus") {
      if (weeklyPct < corridor.min) {
        if (performanceUp) {
          out.push({
            id: "adj-cal-hold-progress",
            kind: "calories",
            severity: "info",
            audience: "both",
            coachText: "Le poids bouge peu mais les charges montent : ne monte pas les calories, il progresse déjà.",
            clientText: "Tes charges montent : on ne change rien, continue comme ça.",
            confidence: "enseignement",
            action: null,
          });
        } else {
          const delta = calorieStep(target.calories, level, "up");
          out.push({
            id: "adj-cal-up",
            kind: "calories",
            severity: "info",
            audience: "coach",
            coachText: `Poids stable en prise de muscle depuis plus de deux semaines et peu de progrès : monte de ${delta} kcal, par les glucides.`,
            clientText: "Ta coach peut ajouter quelques calories pour relancer ta prise de muscle.",
            confidence: "enseignement",
            action: { type: "adjust_calories", deltaKcal: delta, label: `Monter de ${delta} kcal` },
          });
        }
      } else if (weeklyPct > corridor.max * 1.5) {
        const delta = -ADJUSTMENT_RULES.stepKcal.min;
        out.push({
          id: "adj-cal-down-fast-gain",
          kind: "calories",
          severity: "info",
          audience: "coach",
          coachText: "Prise plus rapide que prévu : une partie sera du gras, redescends un peu les calories.",
          clientText: "Tu prends un peu vite : on ajuste légèrement pour que ce soit surtout du muscle.",
          confidence: "enseignement",
          action: { type: "adjust_calories", deltaKcal: delta, label: `Baisser de ${-delta} kcal` },
        });
      }
      // Signes de fin de prise de muscle.
      const rhr = last14.filter((l) => l.resting_hr != null).map((l) => l.resting_hr as number);
      const olderRhr = within(logs, today, 56).filter((l) => daysBetween(l.log_date, today) >= 28 && l.resting_hr != null).map((l) => l.resting_hr as number);
      const hungerLow = last7.filter((l) => l.hunger === "low").length >= 4;
      const rhrUp = rhr.length >= 3 && olderRhr.length >= 3 && (avg(rhr) ?? 0) - (avg(olderRhr) ?? 0) >= 5;
      if (hungerLow && rhrUp) {
        out.push({
          id: "adj-surplus-peak",
          kind: "phase",
          severity: "info",
          audience: "coach",
          coachText: "Appétit en baisse et fréquence cardiaque au repos en hausse : signes possibles de fin de prise de muscle, parle de la suite avec le client.",
          clientText: "Si tu as moins d'appétit et plus de fatigue, dis-le à ta coach : on peut passer à la suite.",
          confidence: "hypothese",
          action: { type: "link", tab: "profil", label: "Voir la phase" },
        });
      }
    } else if (Math.abs(weeklyPct) > ADJUSTMENT_RULES.weeklyRatePct.maintenance.max) {
      out.push({
        id: "adj-maintenance-drift",
        kind: "plateau",
        severity: "info",
        audience: "coach",
        coachText: `Le poids dérive de ${Math.abs(Math.round(weeklyPct * 100) / 100)} % par semaine en maintenance : la maintenance réelle est probablement ${weeklyPct > 0 ? "plus basse" : "plus haute"} que prévu.`,
        clientText: "Ton poids bouge un peu : on affinera ton apport si ça continue.",
        confidence: "enseignement",
        action: null,
      });
    }
  }

  // ── Décharge et progression de l'entraînement ─────────────────────────────
  const decline = performanceDeclineRatio(sessions);
  if (decline.tracked >= 3 && decline.ratio >= 0.5) {
    out.push({
      id: "adj-deload",
      kind: "deload",
      severity: "warning",
      audience: "both",
      coachText: `Les performances baissent sur plusieurs exercices : une semaine de décharge (volume ou charges réduits d'environ ${Math.round((1 - TRAINING_RULES.deloadVolumeFactor) * 100)} %) avant de reprendre.`,
      clientText: "Tes performances ont un peu baissé : une semaine plus légère va te faire repartir plus fort.",
      confidence: "enseignement",
      action: { type: "link", tab: "programme", label: "Voir le programme" },
    });
  } else if (sessions.length >= 6 && !recoveryLimited && decline.ratio === 0) {
    // Récupération correcte et performances stables : on peut envisager du volume.
    const sets = weeklyHardSetsByGroup(sessions, today);
    const ceiling = weeklySetsCeilingFor(level);
    const start = weeklySetsStartFor(level, "normal");
    const room = Object.entries(sets)
      .filter(([, n]) => n >= start - 1 && n < ceiling - 2)
      .map(([g]) => g)
      .slice(0, 3);
    const stagnant = stagnantExercises(sessions);
    if (room.length > 0 && stagnant.length === 0) {
      out.push({
        id: "adj-volume-up",
        kind: "volume",
        severity: "info",
        audience: "coach",
        coachText: `Récupération correcte et charges qui tiennent : tu peux ajouter ${ADJUSTMENT_RULES.volumeAddSets.min} à ${ADJUSTMENT_RULES.volumeAddSets.max} séries sur ${room.join(", ")}.`,
        clientText: "Tu récupères bien : ta coach peut ajouter quelques séries à ton programme.",
        confidence: "enseignement",
        action: { type: "link", tab: "programme", label: "Voir le programme" },
      });
    }
  }

  const stagnant = stagnantExercises(sessions);
  if (stagnant.length > 0) {
    const names = stagnant.slice(0, 2).join(" et ");
    out.push({
      id: "adj-exercise-stagnant",
      kind: "exercise",
      severity: "info",
      audience: "both",
      coachText: `Pas de progrès sur ${names} depuis ${PROGRESSION_RULES.stagnationSessions} séances : change la plage de répétitions, la variante ou le repos avant d'ajouter des séries.`,
      clientText: `${stagnant[0]} stagne : ta coach peut te proposer une variante ou une autre plage de répétitions.`,
      confidence: "decision",
      action: { type: "link", tab: "programme", label: "Voir le programme" },
    });
  }

  // ── Protéines ─────────────────────────────────────────────────────────────
  const protAvg = avg(last14.filter((l) => l.proteins_g != null).map((l) => l.proteins_g as number));
  if (target && protAvg != null && last14.filter((l) => l.proteins_g != null).length >= 5 && protAvg < target.proteins * 0.85) {
    out.push({
      id: "adj-protein-low",
      kind: "adherence",
      severity: "info",
      audience: "both",
      coachText: "Les protéines restent sous la cible : propose une source de protéines simple à ajouter à chaque repas.",
      clientText: "Ajoute une source de protéines à chaque repas : c'est le levier le plus simple pour atteindre ta cible.",
      confidence: "enseignement",
      action: { type: "link", tab: "nutrition", label: "Voir la nutrition" },
    });
  }

  const rank = { warning: 0, info: 1 } as const;
  return out.sort((a, b) => rank[a.severity] - rank[b.severity]);
}

/** Suggestions à montrer à un client : au plus une, jamais intrusive, sans action de modification. */
export function clientNudge(all: AdjustmentSuggestion[]): { id: string; text: string } | null {
  const visible = all.filter((s) => s.audience !== "coach");
  const pick = visible.find((s) => s.severity === "warning") ?? visible[0];
  return pick ? { id: pick.id, text: pick.clientText } : null;
}
