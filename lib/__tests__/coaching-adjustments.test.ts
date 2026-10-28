import test from "node:test";
import assert from "node:assert/strict";
import {
  applyCalorieDelta,
  calorieStep,
  clientNudge,
  computeAdjustments,
  performanceDeclineRatio,
  stagnantExercises,
  type AdjustmentInput,
} from "../coaching-adjustments";
import { ADJUSTMENT_RULES, NUTRITION_RULES } from "../coaching-knowledge";
import type { DailyLog } from "../daily-logs-helpers";
import type { SessionWithSets } from "@/utils/sessions";

const TODAY = "2026-10-28";

function iso(daysAgo: number): string {
  const d = new Date(`${TODAY}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().split("T")[0];
}

function log(daysAgo: number, over: Partial<DailyLog> = {}): DailyLog {
  return {
    id: `l${daysAgo}`,
    client_id: "c",
    log_date: iso(daysAgo),
    training_name: null,
    training_rating: null,
    cardio: null,
    steps: 9000,
    weight_morning: 80,
    weight_time: null,
    sleep_hours: 7.5,
    sleep_rating: null,
    bedtime_actual: null,
    wake_time_actual: null,
    digestion: null,
    stress: "low",
    proteins_g: 170,
    carbs_g: 250,
    fats_g: 70,
    calories_kcal: 2300,
    hunger: "medium",
    created_at: "",
    updated_at: "",
    ...over,
  };
}

/** 28 jours de bilans, poids qui varie de `kgPerWeek` par semaine. */
function logs(kgPerWeek: number, over: (daysAgo: number) => Partial<DailyLog> = () => ({})): DailyLog[] {
  return Array.from({ length: 28 }, (_, i) => {
    const wiggle = (i % 3) * 0.02;
    return log(i, { weight_morning: 80 - (kgPerWeek * (27 - i)) / 7 + wiggle, ...over(i) });
  });
}

const TARGET = { calories: 2300, proteins: 176, carbs: 250, fats: 70 };

function input(over: Partial<AdjustmentInput> = {}): AdjustmentInput {
  return { today: TODAY, phase: "deficit", level: "intermediaire", eatingRelation: "non", age: 30, target: TARGET, logs: logs(0), sessions: [], ...over };
}

const hasCalorieAction = (s: ReturnType<typeof computeAdjustments>) => s.some((x) => x.action?.type === "adjust_calories");
const calorieDeltas = (s: ReturnType<typeof computeAdjustments>) =>
  s.flatMap((x) => (x.action?.type === "adjust_calories" ? [x.action.deltaKcal] : []));

test("sécurité : signal alimentaire actuel ou incertain, aucune suggestion chiffrée, seulement l'orientation", () => {
  for (const relation of ["actuel", "incertain"] as const) {
    const s = computeAdjustments(input({ eatingRelation: relation }));
    assert.equal(s.length, 1);
    assert.equal(s[0].kind, "safety");
    assert.equal(s[0].action, null);
    assert.doesNotMatch(s[0].coachText + s[0].clientText, /\d+\s*kcal/);
  }
});

test("déficit à l'arrêt avec un suivi propre et des pas suffisants : baisse de calories dans le palier", () => {
  const s = computeAdjustments(input({ logs: logs(0) }));
  const deltas = calorieDeltas(s);
  assert.equal(deltas.length, 1);
  assert.ok(deltas[0] <= -ADJUSTMENT_RULES.stepKcal.min && deltas[0] >= -ADJUSTMENT_RULES.stepKcal.max, String(deltas[0]));
  const pct = -deltas[0] / TARGET.calories;
  assert.ok(pct >= 0.05 && pct <= 0.15);
});

test("déficit à l'arrêt mais peu de pas : on monte d'abord les pas, pas de baisse de calories", () => {
  const s = computeAdjustments(input({ logs: logs(0, () => ({ steps: 4000 })) }));
  assert.equal(hasCalorieAction(s), false);
  assert.ok(s.some((x) => x.kind === "steps"));
});

test("déficit à l'arrêt mais sommeil court ou faim élevée : on récupère d'abord", () => {
  const sleepy = computeAdjustments(input({ logs: logs(0, () => ({ sleep_hours: 5.2 })) }));
  assert.equal(hasCalorieAction(sleepy), false);
  assert.ok(sleepy.some((x) => x.kind === "recovery"));
  const hungry = computeAdjustments(input({ logs: logs(0, () => ({ hunger: "high" as const })) }));
  assert.equal(hasCalorieAction(hungry), false);
});

test("adhésion faible : on simplifie, aucune baisse de calories", () => {
  const sparse = logs(0, (i) => (i % 3 === 0 ? {} : { calories_kcal: null, proteins_g: null }));
  const s = computeAdjustments(input({ logs: sparse }));
  assert.equal(hasCalorieAction(s), false);
  assert.ok(s.some((x) => x.kind === "adherence"));
});

test("relation passée ou mineur : jamais de baisse de calories proposée", () => {
  assert.equal(hasCalorieAction(computeAdjustments(input({ eatingRelation: "passe" }))), false);
  assert.equal(hasCalorieAction(computeAdjustments(input({ age: 16 }))), false);
});

test("perte trop rapide : on remonte, même avec une relation passée", () => {
  const fast = logs(1.1); // environ 1,4 % du poids par semaine
  const s = computeAdjustments(input({ logs: fast, eatingRelation: "passe" }));
  const deltas = calorieDeltas(s);
  assert.deepEqual(deltas, [ADJUSTMENT_RULES.stepKcal.min]);
});

test("prise de muscle : monte si le poids stagne et que rien ne progresse, garde si les charges montent", () => {
  const flat = computeAdjustments(input({ phase: "surplus", logs: logs(0) }));
  const up = calorieDeltas(flat);
  assert.equal(up.length, 1);
  assert.ok(up[0] > 0 && up[0] >= ADJUSTMENT_RULES.stepKcal.min && up[0] <= ADJUSTMENT_RULES.stepKcal.max);

  const progressing = sessions((i) => 100 + (5 - i) * 2.5);
  const hold = computeAdjustments(input({ phase: "surplus", logs: logs(0), sessions: progressing }));
  assert.equal(hasCalorieAction(hold), false);
  assert.ok(hold.some((x) => x.id === "adj-cal-hold-progress"));
});

test("pesées insuffisantes : demande des données, ne touche à rien", () => {
  const few = [log(0), log(5), log(9)];
  const s = computeAdjustments(input({ logs: few }));
  assert.ok(s.some((x) => x.kind === "data"));
  assert.equal(hasCalorieAction(s), false);
});

function sessions(weightOf: (idx: number) => number, name = "Développé couché barre", count = 6): SessionWithSets[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `s${i}`,
    client_id: "c",
    program_id: null,
    day_label: "A",
    muscle_groups: null,
    session_date: iso(i * 3),
    warmup_duration_seconds: null,
    warmup_validated: true,
    duration_minutes: 60,
    general_feeling: 7,
    energy_level: 7,
    pump: null,
    notes: null,
    is_completed: true,
    created_at: "",
    sets: [1, 2, 3].map((n) => ({
      id: `${i}-${n}`,
      session_id: `s${i}`,
      exercise_id: null,
      exercise_name: name,
      muscle_group: "Pectoraux",
      set_number: n,
      reps_target: "6-10",
      reps_actual: 8,
      weight_kg: weightOf(i),
      previous_weight_kg: null,
      rir_target: 2,
      rir_actual: 2,
      standardization_score: null,
      rest_duration_seconds: null,
      is_pr: false,
      notes: null,
      video_url: null,
      created_at: "",
    })),
  }));
}

test("décharge : performances en baisse sur plusieurs exercices", () => {
  const a = sessions((i) => 60 + i * 2, "Développé couché barre"); // i=0 plus récent : plus léger
  const b = sessions((i) => 90 + i * 2, "Squat barre (back squat)");
  const c = sessions((i) => 40 + i * 2, "Tirage vertical poulie haute (lat pulldown)");
  const merged = a.map((s, i) => ({ ...s, sets: [...s.sets, ...b[i].sets, ...c[i].sets] }));
  assert.ok(performanceDeclineRatio(merged).ratio >= 0.5);
  const s = computeAdjustments(input({ phase: "maintenance", sessions: merged, logs: logs(0) }));
  assert.ok(s.some((x) => x.kind === "deload"));
});

test("exercice qui stagne depuis quatre séances : proposition de varier", () => {
  const flat = sessions(() => 80);
  assert.deepEqual(stagnantExercises(flat), ["Développé couché barre"]);
  const s = computeAdjustments(input({ phase: "maintenance", sessions: flat }));
  assert.ok(s.some((x) => x.kind === "exercise"));
  assert.deepEqual(stagnantExercises(sessions((i) => 100 - i * 2.5)), []);
});

test("déficit trop long : pause à la maintenance suggérée", () => {
  const s = computeAdjustments(input({ deficitWeeks: ADJUSTMENT_RULES.deficitMaxWeeks, logs: logs(0.3) }));
  assert.ok(s.some((x) => x.id === "adj-diet-break-long"));
});

test("macros après un changement de calories : protéines inchangées, glucides ajustés, lipides au-dessus du plancher", () => {
  for (const delta of [-300, -150, 150, 300]) {
    const m = applyCalorieDelta(TARGET, delta);
    assert.equal(m.proteins, TARGET.proteins);
    assert.equal(m.calories, TARGET.calories + delta);
    assert.ok(m.fats * 9 >= NUTRITION_RULES.fatPctKcal.min * m.calories - 9);
    assert.ok(Math.abs(m.proteins * 4 + m.fats * 9 + m.carbs * 4 - m.calories) <= 6);
  }
  for (const cal of [1500, 2300, 4000]) {
    for (const level of ["debutant", "avance"] as const) {
      const d = calorieStep(cal, level, "down");
      assert.ok(d >= ADJUSTMENT_RULES.stepKcal.min && d <= ADJUSTMENT_RULES.stepKcal.max);
    }
  }
});

test("message client : une seule phrase, au tutoiement, jamais de source ni de tiret cadratin, pas de suggestion réservée au coach", () => {
  const s = computeAdjustments(input({ logs: logs(0, () => ({ sleep_hours: 5.2 })) }));
  const nudge = clientNudge(s);
  assert.ok(nudge);
  assert.doesNotMatch(nudge!.text, /—|https?:/);
  for (const x of s) {
    assert.doesNotMatch(x.coachText + x.clientText, /—/);
    assert.doesNotMatch(x.coachText + x.clientText, /étude|selon /i);
  }
  assert.equal(clientNudge([]), null);
});
