import test from "node:test";
import assert from "node:assert/strict";
import { cycleGapSuggestion, CYCLE_GAP_DAYS } from "../client-suggestions";

const today = new Date("2026-11-03T12:00:00Z");

test("aucun cycle noté : pas de signal (déjà couvert par l'invitation à activer le suivi)", () => {
  assert.equal(cycleGapSuggestion(null, today), null);
});

test("dernier début il y a 30 jours : pas de signal", () => {
  assert.equal(cycleGapSuggestion("2026-10-04", today), null);
});

test("plus de 3 mois sans début noté : signal à vérifier, orientation médecin, aucun chiffre de calories", () => {
  const s = cycleGapSuggestion("2026-07-01", today);
  assert.ok(s);
  assert.equal(s.tab, "cycle");
  assert.match(s.text, /médecin/);
  assert.match(s.text, /oubli/);
  assert.doesNotMatch(s.text, /kcal|calories|diagnostic de/i);
  assert.equal(CYCLE_GAP_DAYS, 90);
});
