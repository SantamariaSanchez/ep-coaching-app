import test from "node:test";
import assert from "node:assert/strict";
import { buildDietFramework, type DietType } from "../diet-models";
import { computeMacroTargets, NUTRITION_RULES, PLAN_STRUCTURE_RULES, proteinPerMealRange } from "../coaching-knowledge";

const TYPES: DietType[] = ["omnivore", "vegetarien", "vegan", "pescetarien"];

function targetsFor(weightKg: number, phase: "deficit" | "maintenance" | "surplus") {
  const t = computeMacroTargets({ weightKg, tdee: 2200 + weightKg * 6, phase });
  return { calories: t.calories, proteins: t.proteins, carbs: t.carbs, fats: t.fats };
}

test("cadre de diète : calories et protéines réparties sans perte, glucides positifs, protéines par repas dans la fourchette", () => {
  for (const type of TYPES) {
    for (const budget of ["serre", "standard"] as const) {
      for (const meals of [3, 4, 5]) {
        for (const w of [52, 75, 98]) {
          for (const phase of ["deficit", "maintenance", "surplus"] as const) {
            const targets = targetsFor(w, phase);
            const f = buildDietFramework({ targets, weightKg: w, mealsPerDay: meals, dietType: type, budget, eatingRelation: "non" });
            assert.ok(f);
            const sum = (k: "calories" | "proteins" | "fats") => f.meals.reduce((a, m) => a + m[k], 0);
            assert.equal(sum("proteins"), targets.proteins, `${type} ${meals} ${w}`);
            assert.ok(Math.abs(sum("calories") - targets.calories) <= 6, `kcal ${type} ${meals} ${w}`);
            assert.ok(Math.abs(sum("fats") - targets.fats) <= 4);
            const range = proteinPerMealRange(w);
            for (const m of f.meals) {
              assert.ok(m.carbs >= 0 && m.fiber >= 0);
              // 2,2 g/kg sur 5 repas dépasse 0,4 g/kg par prise : le cadre le signale au lieu de le cacher.
              if (m.proteins > range.max + 1) assert.ok(f.warnings.some((x) => /dépasse/.test(x)), `${m.name} ${m.proteins} > ${range.max}`);
            }
            assert.ok(f.meals.length >= NUTRITION_RULES.mealsPerDay.min && f.meals.length <= NUTRITION_RULES.mealsPerDay.max);
            const fiber = f.meals.reduce((a, m) => a + m.fiber, 0);
            assert.ok(Math.abs(fiber - f.fiberTotal) <= 2);
            assert.equal(f.fiberTotal, Math.round((targets.calories / 1000) * NUTRITION_RULES.fiberGPer1000Kcal));
          }
        }
      }
    }
  }
});

test("cadre de diète : relation à l'alimentation signalée, aucun chiffre ; antécédent, plan souple sans culpabilité", () => {
  const targets = targetsFor(70, "maintenance");
  for (const relation of ["actuel", "incertain"] as const) {
    assert.equal(buildDietFramework({ targets, weightKg: 70, eatingRelation: relation }), null);
  }
  const past = buildDietFramework({ targets, weightKg: 70, eatingRelation: "passe", planPreference: "fixe" });
  assert.ok(past);
  assert.ok(past.tips.some((t) => /Plan souple/.test(t)));
  assert.ok(!past.tips.some((t) => /Plan fixe/.test(t)));
});

test("végétarien et végan : points de vigilance, avertissement protéines sous le haut de fourchette, sources végétales", () => {
  const w = 70;
  const low = { calories: 2200, proteins: 112, carbs: 280, fats: 70 }; // 1,6 g/kg
  const vegan = buildDietFramework({ targets: low, weightKg: w, dietType: "vegan" })!;
  const labels = vegan.watch.map((x) => x.label).join(" ");
  for (const k of ["B12", "Fer", "Zinc", "Calcium", "Iode", "Oméga 3"]) assert.match(labels, new RegExp(k));
  assert.ok(vegan.warnings.some((x) => /haut de la fourchette/.test(x)));
  assert.ok(vegan.plantSources.length > 0);
  for (const bad of ["poulet", "dinde", "bœuf", "poisson", "saumon", "thon", "œufs", "fromage", "whey"]) {
    assert.ok(!vegan.proteinSources.some((s) => s.includes(bad)), `${bad} dans une diète végane`);
  }
  const omni = buildDietFramework({ targets: low, weightKg: w, dietType: "omnivore" })!;
  assert.equal(omni.watch.length, 0);
  assert.equal(omni.warnings.length, 0);
  const high = buildDietFramework({ targets: { ...low, proteins: 140 }, weightKg: w, dietType: "vegetarien" })!;
  assert.equal(high.warnings.length, 0);
  const veg = buildDietFramework({ targets: low, weightKg: w, dietType: "vegetarien" })!;
  assert.ok(!veg.proteinSources.some((s) => /poulet|bœuf|saumon|thon|poisson/.test(s)));
});

test("budget et pratique : pas de saumon en budget serré, conseils de préparation, 2 à 4 sources", () => {
  const targets = targetsFor(80, "maintenance");
  const cheap = buildDietFramework({ targets, weightKg: 80, budget: "serre", practical: true })!;
  assert.ok(!cheap.proteinSources.some((s) => /saumon/.test(s)));
  assert.ok(cheap.tips.some((t) => /Budget serré/.test(t)));
  assert.ok(cheap.tips.some((t) => /à l'avance/.test(t)));
  for (const type of TYPES) {
    const f = buildDietFramework({ targets, weightKg: 80, dietType: type })!;
    assert.ok(f.proteinSources.length >= PLAN_STRUCTURE_RULES.sourcesPerDay.min);
    assert.ok(f.fatSources.length >= PLAN_STRUCTURE_RULES.sourcesPerDay.min);
  }
});

test("cadre de diète : aucun tiret cadratin", () => {
  const f = buildDietFramework({ targets: targetsFor(75, "deficit"), weightKg: 75, dietType: "vegan", budget: "serre", practical: true })!;
  assert.doesNotMatch(JSON.stringify(f), /—/);
});
