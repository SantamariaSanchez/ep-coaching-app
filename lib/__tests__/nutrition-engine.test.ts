import test from "node:test";
import assert from "node:assert/strict";
import { macrosFor, sumMacros, roundGrams, equivalentGrams, rebalance, adaptUpcoming, isSignificantGap, ZERO, type Macros } from "../nutrition-engine";
import type { Food } from "@/utils/nutrition";

const food = (name: string, category: string, kcal: number, p: number, c: number, f: number): Food =>
  ({ id: name, name, category, calories_per_100: kcal, proteins_per_100: p, carbs_per_100: c, fats_per_100: f }) as Food;

const poulet = food("Blanc de poulet", "Viandes", 110, 23, 0, 1.5);
const riz = food("Riz cuit", "Féculents", 130, 2.7, 28, 0.3);
const huile = food("Huile d'olive", "Matières grasses", 900, 0, 0, 100);

test("quantité modifiée : les macros suivent exactement, sans écart", () => {
  const a = macrosFor(poulet, 150);
  assert.equal(a.proteins, 34.5);
  assert.equal(a.calories, 165);
  const b = macrosFor(poulet, 300);
  assert.equal(b.proteins, a.proteins * 2);
  assert.deepEqual(macrosFor(poulet, 0), ZERO);
});

test("total d'une journée = somme des aliments, dans n'importe quel ordre", () => {
  const items = [macrosFor(poulet, 150), macrosFor(riz, 200), macrosFor(huile, 10)];
  const t = sumMacros(items);
  const r = sumMacros([...items].reverse());
  assert.ok(Math.abs(t.calories - r.calories) < 1e-9);
  assert.ok(Math.abs(t.proteins - (34.5 + 5.4)) < 1e-9);
});

test("arrondi lisible des grammes, jamais négatif ni NaN", () => {
  assert.equal(roundGrams(12.4), 12);
  assert.equal(roundGrams(0.2), 1);
  assert.equal(roundGrams(143), 145);
  assert.equal(roundGrams(-5), 0);
  assert.equal(roundGrams(Number.NaN), 0);
});

test("équivalence : même apport sur le macro clé, plafonnée", () => {
  const dinde = food("Dinde", "Viandes", 105, 24, 0, 1);
  const g = equivalentGrams(poulet, 150, dinde);
  assert.ok(Math.abs(macrosFor(dinde, g).proteins - macrosFor(poulet, 150).proteins) < 3);
  const tiny = food("Aliment presque vide", "Viandes", 1, 0.1, 0, 0);
  assert.ok(equivalentGrams(poulet, 150, tiny) <= 2000);
});

test("rééquilibrage : légumes et sauces ne bougent jamais, quantités bornées", () => {
  const legume = food("Brocoli", "Légumes", 30, 3, 4, 0.3);
  const target: Macros = { calories: 700, proteins: 60, carbs: 70, fats: 15 };
  const out = rebalance(
    [
      { key: "p", food: poulet, grams: 100 },
      { key: "r", food: riz, grams: 100 },
      { key: "l", food: legume, grams: 200 },
    ],
    ZERO,
    target
  );
  assert.equal(out.get("l"), 200);
  for (const k of ["p", "r"]) {
    const g = out.get(k)!;
    assert.ok(g >= 0 && g <= 300, `${k}=${g}`);
  }
});

test("un petit écart ne change rien (pas de grammes modifiés pour rien)", () => {
  const upcoming = [{ slot: "dinner", items: [{ key: "p", food: poulet, grams: 150 }, { key: "r", food: riz, grams: 200 }] }];
  const planned = sumMacros(upcoming[0].items.map((a) => macrosFor(a.food, a.grams)));
  const target = { ...planned, calories: planned.calories + 40 };
  assert.equal(isSignificantGap({ calories: 40, proteins: 0, carbs: 0, fats: 0 }, target), false);
  assert.equal(adaptUpcoming(upcoming, ZERO, target).size, 0);
});

test("gros écart : le repas à venir est adapté dans la limite de 50 % à 160 %", () => {
  const upcoming = [{ slot: "dinner", items: [{ key: "p", food: poulet, grams: 150 }, { key: "r", food: riz, grams: 200 }] }];
  const planned = sumMacros(upcoming[0].items.map((a) => macrosFor(a.food, a.grams)));
  const target = { calories: planned.calories + 600, proteins: planned.proteins + 40, carbs: planned.carbs + 80, fats: planned.fats };
  const out = adaptUpcoming(upcoming, ZERO, target);
  assert.ok(out.size > 0);
  for (const [k, g] of out) {
    const base = k === "p" ? 150 : 200;
    assert.ok(g >= base * 0.5 - 1 && g <= base * 1.6 + 5, `${k}=${g}`);
  }
});
