import test from "node:test";
import assert from "node:assert/strict";
import { sanitizePeriodInput } from "../period-input";

const today = "2026-11-17";

test("une saisie normale passe et ne garde que les champs connus", () => {
  const r = sanitizePeriodInput(
    { start_date: "2026-11-01", end_date: "2026-11-05", flow: "moyen", symptoms: ["Fatigue", "Fatigue", "inventé"], notes: "  ok  ", client_id: "autre-compte", id: "x" },
    today,
  );
  assert.ok(r.ok);
  assert.deepEqual(r.value, { start_date: "2026-11-01", end_date: "2026-11-05", flow: "moyen", symptoms: ["Fatigue"], notes: "ok" });
  assert.equal("client_id" in r.value, false);
});

test("dates invalides, futures ou incohérentes refusées avec un message clair", () => {
  assert.equal(sanitizePeriodInput({ start_date: "" }, today).ok, false);
  assert.equal(sanitizePeriodInput({ start_date: "2026-02-30" }, today).ok, false);
  assert.equal(sanitizePeriodInput({ start_date: "2026-12-01" }, today).ok, false);
  assert.equal(sanitizePeriodInput({ start_date: "2026-11-10", end_date: "2026-11-09" }, today).ok, false);
  assert.equal(sanitizePeriodInput({ start_date: "2026-10-01", end_date: "2026-11-01" }, today).ok, false);
});

test("flux inconnu ignoré, notes bornées, fin vide acceptée", () => {
  const r = sanitizePeriodInput({ start_date: "2026-11-01", end_date: "", flow: "énorme", notes: "a".repeat(2000) }, today);
  assert.ok(r.ok);
  assert.equal(r.value.flow, null);
  assert.equal(r.value.end_date, null);
  assert.equal(r.value.notes?.length, 500);
});
