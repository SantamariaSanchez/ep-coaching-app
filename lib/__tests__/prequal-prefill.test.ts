import { test } from "node:test";
import assert from "node:assert/strict";
import { prequalPrefill } from "../prequal-prefill";

test("prequalPrefill : sépare prénom et nom, encode le reste", () => {
  const p = new URLSearchParams(prequalPrefill("  Léa  Martin Dupont ", " lea@ex.fr ", "06 12 34 56 78"));
  assert.equal(p.get("prenom"), "Léa");
  assert.equal(p.get("nom"), "Martin Dupont");
  assert.equal(p.get("email"), "lea@ex.fr");
  assert.equal(p.get("telephone"), "06 12 34 56 78");
});

test("prequalPrefill : champs vides absents", () => {
  assert.equal(prequalPrefill("Léa", "", " "), "prenom=L%C3%A9a");
  assert.equal(prequalPrefill("", "", ""), "");
});
