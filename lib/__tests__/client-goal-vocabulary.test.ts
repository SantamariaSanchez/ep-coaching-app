import test from "node:test";
import assert from "node:assert/strict";
import { RECIPES } from "../recipes-data";
import { PRACTICE_OPTIONS } from "../app-setup";

// Vocabulaire côté client (chantier Notion n° 27) : « perte de gras » et
// « prise de muscle » plutôt que « sèche » et « prise de masse » par défaut.
// « poêle sèche » ou « dattes sèches » restent permis : seul l'objectif est visé.
const GOAL_WORDS = /\(s[èe]che\b|\bs[èe]che express\b|\bprise de masse\b|\badh[ée]rence\b/i;

test("noms des recettes : pas de « sèche » ni de « prise de masse » comme objectif", () => {
  const bad = RECIPES.filter((r) => GOAL_WORDS.test(r.name)).map((r) => r.name);
  assert.deepEqual(bad, []);
});

test("objectifs proposés au membre : vocabulaire EP Coaching", () => {
  for (const o of PRACTICE_OPTIONS) {
    assert.ok(!/\bs[èe]che\b|\bprise de masse\b/i.test(`${o.label} ${o.hint ?? ""}`), o.label);
  }
});
