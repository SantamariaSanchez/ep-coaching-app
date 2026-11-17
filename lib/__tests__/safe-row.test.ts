import test from "node:test";
import assert from "node:assert/strict";
import { stripProtected } from "../safe-row";

test("les colonnes d'identité et de propriétaire envoyées par le navigateur sont retirées", () => {
  const forged = { goal: "x", client_id: "victime", id: "y", coach_id: "z", owner_id: "o", user_id: "u", author_id: "a", created_by: "c", created_at: "t" };
  assert.deepEqual(stripProtected(forged), { goal: "x" });
});

test("un objet sans clé protégée reste identique, une entrée invalide donne un objet vide", () => {
  assert.deepEqual(stripProtected({ a: 1, b: null }), { a: 1, b: null });
  assert.deepEqual(stripProtected(null as unknown as object), {});
});
