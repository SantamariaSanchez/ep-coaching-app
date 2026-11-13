import { test } from "node:test";
import assert from "node:assert/strict";
import { pickStartGoals } from "../weekly-review-helpers";

test("pickStartGoals : rien sans fiche ou champs vides", () => {
  assert.equal(pickStartGoals(null), null);
  assert.equal(pickStartGoals({ goal_3_months: "  ", goal_12_months: null }), null);
});

test("pickStartGoals : garde ce qui est rempli", () => {
  assert.deepEqual(pickStartGoals({ goal_3_months: " 74 kg fin février ", goal_12_months: "" }), { short: "74 kg fin février", long: null });
});

test("pickStartGoals : tronque un texte trop long", () => {
  const r = pickStartGoals({ goal_12_months: "a".repeat(300) });
  assert.ok(r && r.long && r.long.length === 200 && r.long.endsWith("..."));
});
