import test from "node:test";
import assert from "node:assert/strict";
import { foodLogInputError } from "../food-log-input";

test("aliment noté : valeurs du navigateur bornées", () => {
  const ok = { quantityG: 150, calories: 240, proteins: 30, carbs: 10, fats: 8, loggedAt: "2026-11-18" };
  assert.equal(foodLogInputError(ok), null);
  assert.equal(foodLogInputError({ ...ok, quantityG: -100 }), "Quantité invalide.");
  assert.equal(foodLogInputError({ ...ok, quantityG: 0 }), "Quantité invalide.");
  assert.equal(foodLogInputError({ ...ok, calories: Number.NaN }), "Valeurs nutritionnelles invalides.");
  assert.equal(foodLogInputError({ ...ok, calories: 99999 }), "Valeurs nutritionnelles invalides.");
  assert.equal(foodLogInputError({ ...ok, loggedAt: "hier" }), "Date invalide.");
});
