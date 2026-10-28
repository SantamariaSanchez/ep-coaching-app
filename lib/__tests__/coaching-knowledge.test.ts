import test from "node:test";
import assert from "node:assert/strict";
import {
  COACHING_KNOWLEDGE_PROMPT,
  ENERGY_GUIDANCE_FR,
  MAINTENANCE_TREND_RULES,
  NUTRITION_RULES,
  SUPPLEMENT_RULES,
  TRAINING_RULES,
  computeMacroTargets,
  phaseAdjustmentKcal,
  proteinGPerKgFor,
  proteinPerMealRange,
  setsPerSessionFor,
  ADJUSTMENT_RULES,
  HABIT_RULES,
  PLANT_BASED_RULES,
  PROGRAMMING_PRINCIPLES,
  SMALL_MUSCLE_GROUPS,
  WEEKLY_SETS_FLOOR,
  distributeProtein,
  recoveryStatusFrom,
  restSecondsFor,
  sessionSetBudget,
  weeklySetsCeilingFor,
  weeklySetsForMuscle,
  weeklySetsStartFor,
  type RecoveryStatus,
  type TrainingLevel,
} from "../coaching-knowledge";

test("déficit : 20 % par défaut, 15 % pour un profil avancé, jamais sous 10 % ni au-delà de 30 %", () => {
  assert.equal(phaseAdjustmentKcal(3000, "deficit", "debutant"), -600);
  assert.equal(phaseAdjustmentKcal(3000, "deficit", "intermediaire"), -600);
  assert.equal(phaseAdjustmentKcal(3000, "deficit", "avance"), -450);
  for (const level of ["debutant", "intermediaire", "avance"] as const) {
    const pct = -phaseAdjustmentKcal(3000, "deficit", level) / 3000;
    assert.ok(pct >= NUTRITION_RULES.deficitPct.min && pct <= NUTRITION_RULES.deficitPct.max);
  }
});

test("surplus : départ à 8 % dans la fourchette 5 à 10 %", () => {
  assert.equal(phaseAdjustmentKcal(3000, "surplus"), 240);
  assert.ok(NUTRITION_RULES.surplusPct.start >= NUTRITION_RULES.surplusPct.min);
  assert.ok(NUTRITION_RULES.surplusPct.start <= NUTRITION_RULES.surplusPct.max);
  assert.equal(phaseAdjustmentKcal(3000, "maintenance"), 0);
});

test("macros : calories cohérentes, lipides jamais sous 20 % des calories, glucides positifs", () => {
  for (const phase of ["deficit", "maintenance", "surplus"] as const) {
    for (const weightKg of [48, 65, 80, 110]) {
      const m = computeMacroTargets({ weightKg, tdee: 2200 + weightKg * 5, phase });
      assert.ok(m.fats * 9 >= NUTRITION_RULES.fatPctKcal.min * m.calories - 9, `lipides trop bas ${phase} ${weightKg}`);
      assert.ok(m.carbs >= 0);
      const rebuilt = m.proteins * 4 + m.fats * 9 + m.carbs * 4;
      assert.ok(Math.abs(rebuilt - m.calories) <= 12, `bilan incohérent ${phase} ${weightKg}`);
    }
  }
});

test("protéines : plus haut en déficit qu'en surplus, dans la fourchette 1,6 à 2,2", () => {
  assert.ok(proteinGPerKgFor("deficit") > proteinGPerKgFor("surplus"));
  for (const phase of ["deficit", "maintenance", "surplus"] as const) {
    const g = proteinGPerKgFor(phase);
    assert.ok(g >= NUTRITION_RULES.proteinGPerKg.min && g <= NUTRITION_RULES.proteinGPerKg.max);
  }
  const r = proteinPerMealRange(80);
  assert.deepEqual(r, { min: 20, max: 32 });
});

test("macros : un déficit donne moins de calories qu'un surplus à maintenance égale", () => {
  const d = computeMacroTargets({ weightKg: 75, tdee: 2800, phase: "deficit" });
  const s = computeMacroTargets({ weightKg: 75, tdee: 2800, phase: "surplus" });
  assert.ok(d.calories < 2800 && s.calories > 2800);
});

test("séries par séance : bornées et plus nombreuses sur les polyarticulaires", () => {
  for (const appearances of [1, 2, 3, 4]) {
    const compose = setsPerSessionFor(appearances, "compose");
    const iso = setsPerSessionFor(appearances, "isolation");
    assert.ok(compose >= 2 && compose <= 5 && iso >= 2 && iso <= 5);
    assert.ok(compose >= iso);
  }
  assert.ok(TRAINING_RULES.weeklyHardSetsStart.min <= TRAINING_RULES.weeklyHardSetsStart.max);
});

test("maintenance : jamais déduite d'une seule semaine", () => {
  assert.ok(MAINTENANCE_TREND_RULES.minLoggedDays >= 10, "plusieurs jours de bilans minimum");
  assert.ok(MAINTENANCE_TREND_RULES.minSpanDays > 7, "plus d'une semaine d'écart");
  assert.doesNotMatch(COACHING_KNOWLEDGE_PROMPT, /stable une semaine/i);
  assert.match(COACHING_KNOWLEDGE_PROMPT, /plusieurs semaines/);
});

test("prompt IA : aucune source citée, pas de tiret cadratin, pas de dose personnalisée de complément", () => {
  assert.doesNotMatch(COACHING_KNOWLEDGE_PROMPT, /—/);
  assert.doesNotMatch(COACHING_KNOWLEDGE_PROMPT, /https?:\/\//);
  assert.doesNotMatch(COACHING_KNOWLEDGE_PROMPT, /pas après 15 h/i);
  assert.doesNotMatch(ENERGY_GUIDANCE_FR, /—/);
  assert.match(COACHING_KNOWLEDGE_PROMPT, /adhésion/);
  assert.match(COACHING_KNOWLEDGE_PROMPT, /ne cite jamais de source/);
});

test("prompt IA : sécurité TCA, aucun déficit proposé", () => {
  assert.match(COACHING_KNOWLEDGE_PROMPT, /Troubles du comportement alimentaire/);
  assert.match(COACHING_KNOWLEDGE_PROMPT, /jamais de déficit/);
});

test("compléments : pas de dose de vitamine D ni d'heure limite de caféine fixes", () => {
  assert.equal("caffeineAvoidAfterHour" in SUPPLEMENT_RULES, false);
  assert.equal("vitaminDIuPerDay" in SUPPLEMENT_RULES, false);
  assert.equal(SUPPLEMENT_RULES.vitaminDIuUpperLimit, 4000);
});

test("cohérence entre la règle et le texte du calculateur public", () => {
  assert.match(ENERGY_GUIDANCE_FR, /5 à 10 %/);
});

test("lipides : 0,8 à 1,5 g/kg et 20 à 35 % des calories, cohérents entre eux et avec le prompt", () => {
  assert.deepEqual(NUTRITION_RULES.fatGPerKg, { min: 0.8, max: 1.5 });
  assert.deepEqual(NUTRITION_RULES.fatPctKcal, { min: 0.2, max: 0.35 });
  assert.ok(COACHING_KNOWLEDGE_PROMPT.includes("0,8 à 1,5 g/kg (20 à 35 % des calories)"));
  assert.ok(!COACHING_KNOWLEDGE_PROMPT.includes("20 à 25 %"));
});

test("entraînement : volume de départ 8 à 12 puis 10 à 25, repos en fourchette, jamais un nombre unique", () => {
  assert.deepEqual(TRAINING_RULES.weeklyHardSetsStart, { min: 8, max: 12 });
  assert.deepEqual(TRAINING_RULES.weeklyHardSetsRange, { min: 10, max: 25 });
  assert.ok(TRAINING_RULES.restSeconds.compound.min < TRAINING_RULES.restSeconds.compound.max);
  assert.ok(TRAINING_RULES.restSeconds.isolation.min < TRAINING_RULES.restSeconds.isolation.max);
  assert.ok(COACHING_KNOWLEDGE_PROMPT.includes("8 à 12 séries difficiles"));
  assert.ok(COACHING_KNOWLEDGE_PROMPT.includes("10 à 25"));
});

const LEVELS: TrainingLevel[] = ["debutant", "intermediaire", "avance"];
const RECOVERIES: RecoveryStatus[] = ["limited", "normal", "good"];

test("volume de départ : toujours dans 8 à 12, plus bas quand la récupération est limitée, jamais lié au sexe", () => {
  for (const level of LEVELS) {
    for (const rec of RECOVERIES) {
      const v = weeklySetsStartFor(level, rec);
      assert.ok(v >= TRAINING_RULES.weeklyHardSetsStart.min && v <= TRAINING_RULES.weeklyHardSetsStart.max, `${level} ${rec}`);
    }
    assert.ok(weeklySetsStartFor(level, "limited") <= weeklySetsStartFor(level, "normal"));
    assert.ok(weeklySetsStartFor(level, "normal") <= weeklySetsStartFor(level, "good"));
    assert.ok(weeklySetsCeilingFor(level) >= TRAINING_RULES.weeklyHardSetsRange.min);
    assert.ok(weeklySetsCeilingFor(level) <= TRAINING_RULES.weeklyHardSetsRange.max);
  }
  assert.ok(weeklySetsStartFor("debutant") <= weeklySetsStartFor("avance"));
  assert.ok(weeklySetsCeilingFor("debutant") < weeklySetsCeilingFor("avance"));
});

test("petits muscles : départ allégé mais jamais sous le plancher des cas pratiques", () => {
  for (const level of LEVELS) {
    for (const rec of RECOVERIES) {
      for (const g of SMALL_MUSCLE_GROUPS) {
        const v = weeklySetsForMuscle(g, level, rec);
        assert.ok(v >= WEEKLY_SETS_FLOOR && v <= weeklySetsStartFor(level, rec));
      }
      assert.equal(weeklySetsForMuscle("Pectoraux", level, rec), weeklySetsStartFor(level, rec));
    }
  }
});

test("récupération : sommeil court, mauvaise qualité ou stress élevé la limitent, un bon profil la favorise", () => {
  assert.equal(recoveryStatusFrom({ sleepHours: 5 }), "limited");
  assert.equal(recoveryStatusFrom({ sleepQuality: 3 }), "limited");
  assert.equal(recoveryStatusFrom({ stressLevel: 9 }), "limited");
  assert.equal(recoveryStatusFrom({ sleepHours: 8, sleepQuality: 8, stressLevel: 3 }), "good");
  assert.equal(recoveryStatusFrom({}), "normal");
  assert.equal(recoveryStatusFrom({ sleepHours: 7 }), "normal");
});

test("temps de séance : le budget de séries grandit avec la durée, repos dans la fourchette", () => {
  assert.ok(sessionSetBudget(30) < sessionSetBudget(60));
  assert.ok(sessionSetBudget(60) < sessionSetBudget(90));
  assert.equal(sessionSetBudget(null), sessionSetBudget(60));
  const c = TRAINING_RULES.restSeconds.compound;
  const i = TRAINING_RULES.restSeconds.isolation;
  for (const heavy of [true, false]) {
    for (const timeLimited of [true, false]) {
      const rc = restSecondsFor("compound", { heavy, timeLimited });
      const ri = restSecondsFor("isolation", { heavy, timeLimited });
      assert.ok(rc >= c.min && rc <= c.max && ri >= i.min && ri <= i.max);
    }
  }
  assert.ok(restSecondsFor("compound", { timeLimited: true }) <= restSecondsFor("compound", { heavy: true }));
});

test("protéines réparties : total respecté, 3 à 5 prises, jamais au-dessus du haut de la fourchette par repas", () => {
  for (const [total, w] of [[160, 80], [110, 55], [200, 90]] as const) {
    const d = distributeProtein(total, w);
    assert.equal(d.perMealG.reduce((a, b) => a + b, 0), total);
    assert.ok(d.meals >= NUTRITION_RULES.proteinMeals.min && d.meals <= NUTRITION_RULES.proteinMeals.max);
    assert.equal(d.perMealG.length, d.meals);
  }
  // Total élevé avec peu de repas demandés : on ajoute des prises plutôt que de dépasser 0,4 g/kg.
  const d = distributeProtein(160, 80, 3);
  assert.ok(d.perMealG.every((g) => g <= proteinPerMealRange(80).max + 1));
});

test("règles d'ajustement : alignées sur les fourchettes de nutrition, durées de déficit et de pause cohérentes", () => {
  const { deficit, surplus } = ADJUSTMENT_RULES.weeklyRatePct;
  assert.equal(-deficit.max, NUTRITION_RULES.lossRatePctPerWeek.min);
  assert.equal(-deficit.min, NUTRITION_RULES.lossRatePctPerWeek.max);
  assert.equal(surplus.min, NUTRITION_RULES.gainRatePctPerMonth.min / 4);
  assert.equal(surplus.max, NUTRITION_RULES.gainRatePctPerMonth.max / 4);
  assert.ok(ADJUSTMENT_RULES.minDaysBeforeAdjust >= 14);
  assert.ok(ADJUSTMENT_RULES.minDaysBeforeAdjust >= MAINTENANCE_TREND_RULES.minSpanDays);
  assert.ok(ADJUSTMENT_RULES.maintenanceBreakWeeks.min < ADJUSTMENT_RULES.maintenanceBreakWeeks.max);
  assert.ok(ADJUSTMENT_RULES.stepKcal.min < ADJUSTMENT_RULES.stepKcal.max);
  assert.ok(HABIT_RULES.sleepHoursMin >= 7);
});

test("végétarien ou végan : protéines en haut de fourchette, points de vigilance complets", () => {
  assert.ok(PLANT_BASED_RULES.proteinGPerKgFloor >= NUTRITION_RULES.proteinGPerKg.min);
  assert.ok(PLANT_BASED_RULES.proteinGPerKgFloor <= NUTRITION_RULES.proteinGPerKg.max);
  const keys: string[] = PLANT_BASED_RULES.watch.map((w) => w.key);
  for (const k of ["b12", "fer", "zinc", "calcium", "iode", "omega3"]) assert.ok(keys.includes(k), k);
  for (const w of PLANT_BASED_RULES.watch) assert.doesNotMatch(`${w.label}${w.advice}`, /—/);
});

test("prompt IA : ajustements, phases, choix des exercices et progression présents, sans tiret cadratin", () => {
  assert.match(COACHING_KNOWLEDGE_PROMPT, /Ajuster :/);
  assert.match(COACHING_KNOWLEDGE_PROMPT, /Phases :/);
  assert.match(COACHING_KNOWLEDGE_PROMPT, /Choix des exercices/);
  assert.match(COACHING_KNOWLEDGE_PROMPT, /Progression :/);
  assert.doesNotMatch(COACHING_KNOWLEDGE_PROMPT, /—/);
});

test("programmation : aucune périodisation imposée, proximité de l'échec, programme indépendant de la diète, jamais de modification automatique", () => {
  assert.equal(PROGRAMMING_PRINCIPLES.periodizationImposed, false);
  assert.equal(PROGRAMMING_PRINCIPLES.programIndependentOfDiet, true);
  assert.equal(PROGRAMMING_PRINCIPLES.neverAutoModify, true);
  assert.ok(!PROGRAMMING_PRINCIPLES.programDependsOn.some((x) => /diète|calorie|nutrition/i.test(x)));
  assert.match(COACHING_KNOWLEDGE_PROMPT, /Proximité de l'échec/);
  assert.match(COACHING_KNOWLEDGE_PROMPT, /aucun n'est imposé/);
  assert.match(COACHING_KNOWLEDGE_PROMPT, /sangles de tirage/);
  assert.match(COACHING_KNOWLEDGE_PROMPT, /ne modifies jamais toi-même/);
  assert.doesNotMatch(COACHING_KNOWLEDGE_PROMPT, /mésocycle de \d|toutes les \d+ semaines/);
  assert.doesNotMatch(COACHING_KNOWLEDGE_PROMPT, /—/);
});

test("repères de volume : dérivés des règles du Mastermind, aucune valeur dupliquée par groupe", async () => {
  const { VOLUME_LANDMARKS, MUSCLE_GROUPS } = await import("../volume-data");
  for (const g of MUSCLE_GROUPS) {
    const lm = VOLUME_LANDMARKS[g];
    assert.ok(lm, g);
    assert.ok(lm.mev <= lm.mav && lm.mav <= lm.mrv);
    assert.equal(lm.mrv, TRAINING_RULES.weeklyHardSetsRange.max);
    if (!SMALL_MUSCLE_GROUPS.includes(g)) {
      assert.equal(lm.mev, TRAINING_RULES.weeklyHardSetsStart.min);
      assert.equal(lm.mav, TRAINING_RULES.weeklyHardSetsStart.max);
    }
  }
});
