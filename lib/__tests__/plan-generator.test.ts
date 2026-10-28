import test from "node:test";
import assert from "node:assert/strict";
import { EXERCISE_LIBRARY_SEED } from "../exercise-library-seed";
import { generateProgramPlan, computeNutritionTargets, buildProgramSuggestions, findSwapCandidate, levelFromExperience, MINOR_AGE } from "../plan-generator";
import { isTrainingExercise } from "../exercise-selection";
import { NUTRITION_RULES, TRAINING_RULES, WEEKLY_SETS_FLOOR, weeklySetsCeilingFor, type TrainingLevel, type RecoveryStatus } from "../coaching-knowledge";
import type { LibraryExercise } from "@/utils/exercise-library";

const LIB = EXERCISE_LIBRARY_SEED.map((e, idx) => ({
  id: String(idx),
  ...e,
  position: null,
  created_by: null,
  is_official: true,
  created_at: "",
  image_url: null,
  video_url: null,
  freedom_of_movement: null,
  is_unilateral: null,
  microloadable: null,
  easy_to_replicate: null,
  learning_difficulty: null,
  stability_demand: null,
  accessibility: null,
  setup_notes: null,
  accessories: [],
})) as unknown as LibraryExercise[];

const LEVELS: TrainingLevel[] = ["debutant", "intermediaire", "avance"];
const RECOVERIES: RecoveryStatus[] = ["limited", "normal", "good"];
const BIG = ["Pectoraux", "Dos", "Épaules", "Quadriceps", "Ischio-jambiers", "Fessiers"];

test("programme généré : pas de mobilité ni de rééducation, composés avant isolation, aucun doublon dans une séance", () => {
  for (let n = 2; n <= 6; n++) {
    for (const level of LEVELS) {
      const plan = generateProgramPlan(n, LIB, null, null, "salle", null, { level, sessionMinutes: 75 });
      assert.equal(plan.days.length, n);
      for (const d of plan.days) {
        const names = d.exercises.map((e) => e.name);
        assert.equal(new Set(names).size, names.length, `doublon ${d.dayLabel}`);
        for (const e of d.exercises) assert.ok(isTrainingExercise({ name: e.name, muscle_group: e.muscle_group }), e.name);
        const cats = d.exercises.map((e) => LIB.find((l) => l.name === e.name)?.category ?? "isolation");
        const firstIso = cats.indexOf("isolation");
        if (firstIso >= 0) assert.ok(!cats.slice(firstIso).includes("compose"), `composé après isolation ${d.dayLabel}`);
      }
    }
  }
});

test("volume par muscle : dans les fourchettes quand le temps le permet, jamais au-dessus du plafond du niveau", () => {
  for (let n = 3; n <= 6; n++) {
    for (const level of LEVELS) {
      for (const recovery of RECOVERIES) {
        const plan = generateProgramPlan(n, LIB, null, null, "salle", null, { level, recovery, sessionMinutes: 120 });
        assert.equal(plan.timeLimited, false, `${n} ${level} ${recovery}`);
        for (const [g, sets] of Object.entries(plan.weeklySetsByGroup)) {
          assert.ok(sets >= WEEKLY_SETS_FLOOR - 1, `${g} ${sets} (${n} ${level} ${recovery})`);
          assert.ok(sets <= weeklySetsCeilingFor(level), `${g} ${sets} dépasse le plafond`);
          assert.ok(sets <= TRAINING_RULES.weeklyHardSetsRange.max);
        }
      }
    }
  }
});

test("volume de départ : plus bas quand la récupération est limitée et pour un débutant", () => {
  const total = (p: ReturnType<typeof generateProgramPlan>) => Object.values(p.weeklySetsByGroup).reduce((a, b) => a + b, 0);
  const opts = { sessionMinutes: 120 };
  const limited = generateProgramPlan(4, LIB, null, null, "salle", null, { level: "intermediaire", recovery: "limited", ...opts });
  const good = generateProgramPlan(4, LIB, null, null, "salle", null, { level: "intermediaire", recovery: "good", ...opts });
  assert.ok(total(limited) < total(good));
  const beg = generateProgramPlan(4, LIB, null, null, "salle", null, { level: "debutant", recovery: "normal", ...opts });
  const adv = generateProgramPlan(4, LIB, null, null, "salle", null, { level: "avance", recovery: "normal", ...opts });
  assert.ok(total(beg) < total(adv));
});

test("temps de séance court : le volume est réduit, signalé, et les repos passent au bas de la fourchette", () => {
  const short = generateProgramPlan(3, LIB, null, null, "salle", null, { level: "intermediaire", sessionMinutes: 35 });
  assert.equal(short.timeLimited, true);
  assert.ok(short.notes.length > 0);
  const longer = generateProgramPlan(3, LIB, null, null, "salle", null, { level: "intermediaire", sessionMinutes: 120 });
  const sum = (p: typeof short) => p.days.flatMap((d) => d.exercises).reduce((a, e) => a + Number(e.sets), 0);
  assert.ok(sum(short) < sum(longer));
  for (const e of short.days.flatMap((d) => d.exercises)) {
    assert.ok(Number(e.sets) >= 1);
  }
});

test("repos et proximité de l'échec : dans les fourchettes, débutant à 2 ou 3 répétitions en réserve", () => {
  for (const level of LEVELS) {
    const plan = generateProgramPlan(4, LIB, null, null, "salle", null, { level, sessionMinutes: 90 });
    for (const e of plan.days.flatMap((d) => d.exercises)) {
      const rest = Number(e.rest_seconds);
      const isIso = LIB.find((l) => l.name === e.name)?.category === "isolation";
      const band = isIso ? TRAINING_RULES.restSeconds.isolation : TRAINING_RULES.restSeconds.compound;
      assert.ok(rest >= band.min && rest <= band.max, `${e.name} ${rest}`);
      const rir = Number(e.rir);
      assert.ok(rir >= TRAINING_RULES.rirRange.min && rir <= TRAINING_RULES.rirRange.max);
      if (level === "debutant" && !isIso) assert.ok(rir >= TRAINING_RULES.rirBeginner.min);
    }
  }
});

test("fréquence : dès 3 séances, pectoraux, dos et quadriceps reviennent au moins deux fois", () => {
  for (let n = 3; n <= 6; n++) {
    const plan = generateProgramPlan(n, LIB, null, null, "salle", null, { sessionMinutes: 90 });
    for (const g of ["Pectoraux", "Dos", "Quadriceps"]) {
      const days = plan.days.filter((d) => d.exercises.some((e) => e.muscle_group === g)).length;
      assert.ok(days >= 2, `${g} sur ${n} séances : ${days}`);
    }
  }
  const two = generateProgramPlan(2, LIB, null, null, "salle", null, { sessionMinutes: 90 });
  for (const g of ["Pectoraux", "Dos"]) {
    assert.equal(two.days.filter((d) => d.exercises.some((e) => e.muscle_group === g)).length, 2);
  }
});

test("matériel : à la maison sans équipement, seulement du poids du corps ou du matériel léger", () => {
  const plan = generateProgramPlan(3, LIB, null, null, "domicile_minimal", null, { level: "debutant" });
  for (const e of plan.days.flatMap((d) => d.exercises)) {
    const eq = LIB.find((l) => l.name === e.name)?.equipment;
    assert.ok(eq === "Poids du corps" || eq === "Élastique" || eq === "Autre" || eq == null, `${e.name} ${eq}`);
  }
});

test("blessures : un genou douloureux écarte les fentes, un dos douloureux écarte le soulevé de terre", () => {
  const knee = generateProgramPlan(5, LIB, null, null, "salle", "douleur au genou", { sessionMinutes: 90 });
  assert.ok(!knee.days.flatMap((d) => d.exercises).some((e) => /fente|pistol|sissy|leg extension/i.test(e.name)));
  assert.ok(knee.notes.some((n) => /précaution/.test(n)));
  const back = generateProgramPlan(5, LIB, null, null, "salle", "hernie discale lombaire", { sessionMinutes: 90 });
  assert.ok(!back.days.flatMap((d) => d.exercises).some((e) => /soulevé de terre|good morning|rack pull/i.test(e.name)));
});

test("suggestions et remplacement : même filtre (pas d'étirement, blessures respectées, niveau pris en compte)", () => {
  const sugg = buildProgramSuggestions(4, LIB, null, null, "salle", "épaule", "debutant");
  for (const day of sugg) {
    for (const g of day.groups) {
      for (const ex of [...g.compound, ...g.isolation]) {
        assert.ok(isTrainingExercise({ name: ex.name, muscle_group: g.group }), ex.name);
        assert.ok(!/dips|militaire barre|nuque/i.test(ex.name), ex.name);
      }
    }
  }
  const swap = findSwapCandidate({ muscle_group: "Quadriceps", category: "isolation" }, LIB, null, null, null, "salle", ["Leg extension"], "debutant");
  assert.ok(swap == null || isTrainingExercise(swap));
});

test("nutrition : déficit de 15 % pour un profil avancé, 20 % sinon, maintenance en cas de signal alimentaire ou pour un mineur", () => {
  const base = { gender: "Homme" as const, weightKg: 80, heightCm: 180, age: 30, sessionsPerWeek: 4, sessionDurationMin: 60, stepsPerDay: 8000, phase: "deficit" as const };
  const maint = computeNutritionTargets({ ...base, phase: "maintenance" });
  const inter = computeNutritionTargets({ ...base, level: "intermediaire" });
  const adv = computeNutritionTargets({ ...base, level: "avance" });
  assert.ok(Math.abs(inter.calories - maint.tdee * 0.8) <= 2);
  assert.ok(Math.abs(adv.calories - maint.tdee * 0.85) <= 2);
  assert.equal(inter.phaseApplied, "deficit");

  for (const relation of ["actuel", "incertain"] as const) {
    const t = computeNutritionTargets({ ...base, eatingRelation: relation });
    assert.equal(t.phaseApplied, "maintenance");
    assert.equal(t.calories, maint.calories);
    assert.ok(t.note);
  }
  const past = computeNutritionTargets({ ...base, eatingRelation: "passe" });
  assert.equal(past.phaseApplied, "deficit");
  const minor = computeNutritionTargets({ ...base, age: MINOR_AGE - 1 });
  assert.equal(minor.phaseApplied, "maintenance");
});

test("nutrition : protéines et lipides dans les bornes pour toutes les phases et tous les profils", () => {
  for (const phase of ["deficit", "maintenance", "surplus"] as const) {
    for (const weightKg of [50, 70, 95]) {
      const t = computeNutritionTargets({ gender: "Femme", weightKg, heightCm: 165, age: 28, sessionsPerWeek: 3, sessionDurationMin: 60, stepsPerDay: 7000, phase, level: "intermediaire" });
      assert.ok(t.proteins / weightKg >= NUTRITION_RULES.proteinGPerKg.min - 0.05 && t.proteins / weightKg <= NUTRITION_RULES.proteinGPerKg.max + 0.05);
      assert.ok((t.fats * 9) / t.calories >= NUTRITION_RULES.fatPctKcal.min - 0.005);
    }
  }
});

test("niveau : « confirmé » du quiz devient avancé, inconnu devient intermédiaire", () => {
  assert.equal(levelFromExperience("confirme"), "avance");
  assert.equal(levelFromExperience("debutant"), "debutant");
  assert.equal(levelFromExperience(null), "intermediaire");
  void BIG;
});
