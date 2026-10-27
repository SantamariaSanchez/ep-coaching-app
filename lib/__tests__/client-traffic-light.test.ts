import test from "node:test";
import assert from "node:assert/strict";
import { TRAFFIC_LIGHT_QUESTION, classifyClient } from "../client-traffic-light";

test("aucune alerte : vert", () => {
  assert.equal(classifyClient([]), "vert");
});

test("stagnation seule : orange", () => {
  assert.equal(classifyClient([{ type: "weight_stagnation", severity: "medium" }]), "orange");
  assert.equal(classifyClient([{ type: "technique_low", severity: "low" }]), "orange");
});

test("du mal à suivre ou alerte critique : rouge", () => {
  assert.equal(classifyClient([{ type: "nutrition_adherence", severity: "medium" }]), "rouge");
  assert.equal(classifyClient([{ type: "checkin_missing", severity: "low" }]), "rouge");
  assert.equal(classifyClient([{ type: "weight_stagnation", severity: "high" }]), "rouge");
});

test("le rouge l'emporte sur l'orange", () => {
  assert.equal(
    classifyClient([
      { type: "weight_stagnation", severity: "medium" },
      { type: "training_missed", severity: "medium" },
    ]),
    "rouge"
  );
});

test("chaque feu a sa question, sans tiret cadratin", () => {
  for (const q of Object.values(TRAFFIC_LIGHT_QUESTION)) {
    assert.ok(q.length > 10);
    assert.doesNotMatch(q, /—/);
  }
});
