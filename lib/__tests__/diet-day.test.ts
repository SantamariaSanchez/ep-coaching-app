import { test } from "node:test";
import assert from "node:assert/strict";
import { dayAdherence, fmtGrams, matchRecipe, pickFocusMeal, rawEquivalent, roundUpForShopping, simpleEquivalent } from "../diet-day";

test("pickFocusMeal : prochain repas ouvert, en cours à 45 min, en retard sinon", () => {
  const slots = ["dinner", "breakfast", "lunch"];
  assert.deepEqual(pickFocusMeal(slots, {}, "06:00")?.slot, "breakfast");
  // Petit-déjeuner coché : on passe au déjeuner.
  const lunch = pickFocusMeal(slots, { breakfast: "mange" }, "09:00");
  assert.equal(lunch?.slot, "lunch");
  assert.equal(lunch?.when, "next");
  assert.equal(pickFocusMeal(slots, { breakfast: "mange" }, "12:30")?.when, "now");
  // Tout coché : rien à mettre en avant.
  assert.equal(pickFocusMeal(slots, { breakfast: "mange", lunch: "ecart", dinner: "saute" }, "12:00"), null);
  // Fin de journée, dîner coché, déjeuner resté sans réponse : en retard.
  assert.deepEqual(pickFocusMeal(slots, { breakfast: "mange", dinner: "mange" }, "23:59"), { slot: "lunch", when: "late" });
});

test("dayAdherence : cases cochées d'abord, estimation aux calories sinon", () => {
  const slots = ["breakfast", "lunch", "dinner", "afternoon"];
  assert.deepEqual(dayAdherence({ slots, status: { breakfast: "mange", lunch: "ecart", dinner: "saute" }, consumedKcal: 0, targetKcal: 2000 }), { pct: 38, basis: "checks", answered: 3, total: 4 });
  assert.equal(dayAdherence({ slots, status: {}, consumedKcal: 1800, targetKcal: 2000 }).pct, 90);
  assert.equal(dayAdherence({ slots, status: {}, consumedKcal: 2200, targetKcal: 2000 }).pct, 90);
  assert.equal(dayAdherence({ slots, status: {}, consumedKcal: 5000, targetKcal: 2000 }).pct, 0);
  assert.deepEqual(dayAdherence({ slots, status: {}, consumedKcal: 0, targetKcal: 2000 }), { pct: null, basis: null, answered: 0, total: 4 });
});

test("quantités : arrondis de courses et grammes lisibles", () => {
  assert.equal(roundUpForShopping(0), 0);
  assert.equal(roundUpForShopping(123), 130);
  assert.equal(roundUpForShopping(500), 500);
  assert.equal(roundUpForShopping(510), 550);
  assert.equal(fmtGrams(150), "150 g");
  assert.ok(/^1,2\skg$/.test(fmtGrams(1240)));
});

test("rawEquivalent : seulement pour un féculent pesé cuit", () => {
  assert.equal(rawEquivalent({ name: "Riz basmati cuit" }, 260), "≈ 100 g cru");
  assert.equal(rawEquivalent({ name: "Riz basmati cru" }, 260), null);
  assert.equal(rawEquivalent({ name: "Poulet cuit" }, 200), null);
});

test("simpleEquivalent : rien d'inventé hors des cas fiables", () => {
  assert.equal(simpleEquivalent({ name: "Riz", category: null }, 0), null);
  assert.equal(simpleEquivalent({ name: "Riz", category: null }, NaN), null);
});

test("matchRecipe : au moins deux aliments en commun", () => {
  const recipes = [
    { id: "a", ingredients: ["200 g de poulet", "riz basmati", "brocoli"] },
    { id: "b", ingredients: ["saumon", "quinoa"] },
  ];
  assert.equal(matchRecipe(recipes, [{ name: "Poulet (blanc)" }, { name: "Riz basmati cuit" }])?.id, "a");
  assert.equal(matchRecipe(recipes, [{ name: "Poulet (blanc)" }, { name: "Patate douce" }]), null);
  assert.equal(matchRecipe(recipes, [{ name: "Poulet" }]), null);
  // « riz » ne doit pas se retrouver dans « chorizo ».
  assert.equal(matchRecipe([{ id: "c", ingredients: ["chorizo", "poulet"] }], [{ name: "Riz cuit" }, { name: "Poulet" }]), null);
});
