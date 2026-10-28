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
