import { test } from "node:test";
import assert from "node:assert/strict";
import { SALES_CALL_LIBRARY } from "../sales-call-library";

test("les catégories ont des identifiants uniques et des questions non vides", () => {
  const ids = SALES_CALL_LIBRARY.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const cat of SALES_CALL_LIBRARY) {
    assert.ok(cat.questions.length > 0, cat.id);
    for (const q of cat.questions) {
      assert.ok(q.text.trim().length > 0 && q.note.trim().length > 0, cat.id);
    }
  }
});

test("aucun tiret cadratin dans la bibliothèque", () => {
  const all = JSON.stringify(SALES_CALL_LIBRARY);
  assert.ok(!all.includes("—") && !all.includes("–"));
});

test("les DM prévoient la limite santé et une relance finale qui s'arrête", () => {
  const dm = SALES_CALL_LIBRARY.find((c) => c.id === "dm");
  assert.ok(dm);
  assert.ok(dm.questions.some((q) => /médecin traitant/.test(q.note)));
  const relance = SALES_CALL_LIBRARY.find((c) => c.id === "dm-relance");
  assert.ok(relance);
  assert.ok(relance.questions.some((q) => /on arrête/.test(q.note)));
});
