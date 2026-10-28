import test from "node:test";
import assert from "node:assert/strict";
import { accessoriesForSession, derivedAccessoriesFor, ALWAYS_ACCESSORIES } from "../session-accessories";

const names = (list: { accessory: string }[]) => list.map((a) => a.accessory);

test("séance de tirage : les straps sont toujours là, en tête", () => {
  const bag = accessoriesForSession(["Tirage vertical poulie haute (lat pulldown)", "Rowing T-bar", "Curl marteau"]);
  assert.equal(names(bag)[0], "Straps");
});

test("straps pour rowing, tractions, shrugs et soulevé de terre ; pas pour un squat ni un face pull", () => {
  for (const n of ["Tractions pronation", "Tirage horizontal barre", "Shrugs haltères", "Soulevé de terre", "Rack pulls"]) {
    assert.ok(derivedAccessoriesFor(n).includes("Prime Straps"), n);
  }
  for (const n of ["Squat barre (back squat)", "Face pull", "Développé couché barre", "Dead hang (suspension)"]) {
    assert.ok(!derivedAccessoriesFor(n).includes("Prime Straps"), n);
  }
});

test("cuffs à la poulie, chaînes et bandes d'après le nom, ceinture sur le lourd", () => {
  assert.ok(derivedAccessoriesFor("Élévations latérales poulie", "Poulie").includes("Cuffs"));
  assert.ok(derivedAccessoriesFor("Squat avec chaînes", "Barre").includes("Chaînes"));
  assert.ok(derivedAccessoriesFor("Développé couché avec bandes élastiques", "Barre").includes("Bandes élastiques"));
  assert.ok(derivedAccessoriesFor("Squat barre (back squat)", "Barre").includes("Ceinture"));
  assert.deepEqual(derivedAccessoriesFor("Pompes", "Poids du corps"), []);
});

test("choix explicite conservé, plafond de 4 puis trépied et shaker", () => {
  const bag = accessoriesForSession(["Tirage vertical", "Soulevé de terre", "Squat barre"], { "Squat barre": ["Lock Belt", "Super Pin", "Micro Plates"] }, { "squat barre": "Barre" });
  assert.equal(bag.length, 4 + ALWAYS_ACCESSORIES.length);
  assert.ok(names(bag).includes("Lock Belt"));
});
