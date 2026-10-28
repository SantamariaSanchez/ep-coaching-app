import test from "node:test";
import assert from "node:assert/strict";
import { MEAL_SLOTS, SLOT_END, planItemsFor, planTotals, variantsFor } from "../nutrition-engine";
import { MEAL_SLOT_TIMES, MEAL_SLOT_LABELS } from "../meal-slots";
import { MEAL_SLOT_NAMES, MEAL_SLOT_ORDER, mealSlotOf } from "../agenda-engine";
import type { DietPlanWithMeals } from "@/utils/nutrition";

test("le créneau intra-entraînement existe partout, entre pré et post", () => {
  const keys = MEAL_SLOTS.map((s) => s.key) as string[];
  assert.equal(keys.indexOf("intraworkout"), keys.indexOf("preworkout") + 1);
  assert.equal(keys.indexOf("postworkout"), keys.indexOf("intraworkout") + 1);
  assert.deepEqual(MEAL_SLOT_ORDER, keys);
  assert.ok(MEAL_SLOT_TIMES.intraworkout && MEAL_SLOT_LABELS.intraworkout && MEAL_SLOT_NAMES.intraworkout && SLOT_END.intraworkout);
  assert.ok(MEAL_SLOT_TIMES.preworkout < MEAL_SLOT_TIMES.intraworkout && MEAL_SLOT_TIMES.intraworkout < MEAL_SLOT_TIMES.postworkout);
});

test("un bloc d'agenda « Intra-workout » est reconnu, pas confondu avec pré/post", () => {
  assert.equal(mealSlotOf({ label: "Intra-workout", start_time: "18:15" }), "intraworkout");
  assert.equal(mealSlotOf({ label: "Repas pre-workout", start_time: "17:00" }), "preworkout");
  assert.equal(mealSlotOf({ label: "Repas post-workout", start_time: "20:00" }), "postworkout");
});

const food = (id: string, kcal: number) => ({ id, name: id, category: null, calories_per_100: kcal, proteins_per_100: 0, carbs_per_100: 0, fats_per_100: 0 });
const meal = (id: string, slot: string, variant: number | null, kcal: number) => ({
  id, plan_id: "p", meal_slot: slot, food_id: id, quantity_g: 100, position: 0, day_of_week: "mar" as const, variant_group: variant, foods: food(id, kcal),
});

test("l'option d'un repas n'est pas ajoutée aux totaux et l'intra compte", () => {
  const plan = {
    id: "p", client_id: "c", name: "x", mode: "flexible", structure: "weekly", is_active: true, created_by: null, created_at: "",
    diet_plan_meals: [meal("a", "breakfast", null, 700), meal("b", "breakfast", 2, 650), meal("c", "intraworkout", null, 120)],
  } as unknown as DietPlanWithMeals;
  const date = "2026-10-27"; // mardi
  assert.equal(planTotals(planItemsFor(plan, date)).calories, 820);
  assert.deepEqual(variantsFor(plan, date, "breakfast"), [1, 2]);
  assert.equal(planTotals(planItemsFor(plan, date, { breakfast: 2 })).calories, 770);
});
