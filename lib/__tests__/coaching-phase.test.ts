import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PHASE_DEFAULT_WEEKS,
  generateCoachingPhaseSuggestions,
  phaseChangeKind,
  phaseWeekNumber,
  plannedPhaseEnd,
  validatePhaseDetails,
} from "../coaching-phase-helpers";

const NOW = Date.parse("2026-10-28T10:00:00Z");

test("durées par défaut des phases alignées sur 6 mois", () => {
  assert.equal(PHASE_DEFAULT_WEEKS.calibrage, 3);
  assert.equal(PHASE_DEFAULT_WEEKS.optimisation, 5);
});

test("on peut avancer, reculer ou rester dans la même phase", () => {
  assert.equal(phaseChangeKind("calibrage", "optimisation"), "forward");
  assert.equal(phaseChangeKind("optimisation", "calibrage"), "backward");
  assert.equal(phaseChangeKind("performance", "optimisation"), "backward");
  assert.equal(phaseChangeKind("optimisation", "optimisation"), "same");
});

test("fin prévue et numéro de semaine", () => {
  assert.equal(plannedPhaseEnd("2026-10-01T00:00:00Z", 5), "2026-11-05");
  assert.equal(plannedPhaseEnd("2026-10-01T00:00:00Z", null), null);
  assert.equal(phaseWeekNumber("2026-10-28T00:00:00Z", NOW), 1);
  assert.equal(phaseWeekNumber("2026-10-14T00:00:00Z", NOW), 3);
});

test("validation : date future refusée, date passée acceptée, durée bornée", () => {
  assert.ok(validatePhaseDetails({ startedOn: "2026-12-01" }, { now: NOW }).error);
  assert.ok(!validatePhaseDetails({ startedOn: "2026-10-20" }, { now: NOW }).error);
  assert.ok(validatePhaseDetails({ startedOn: "pas-une-date" }, { now: NOW }).error);
  assert.ok(validatePhaseDetails({ plannedWeeks: 0 }, { now: NOW }).error);
  assert.ok(validatePhaseDetails({ plannedWeeks: 53 }, { now: NOW }).error);
  assert.ok(validatePhaseDetails({ plannedWeeks: 2.5 }, { now: NOW }).error);
  assert.equal(validatePhaseDetails({ plannedWeeks: 5 }, { now: NOW }).plannedWeeks, 5);
  assert.equal(validatePhaseDetails({ plannedWeeks: null }, { now: NOW }).plannedWeeks, null);
});

test("validation : pas de début avant la phase précédente", () => {
  const r = validatePhaseDetails({ startedOn: "2026-09-01" }, { now: NOW, previousStartedAt: "2026-10-01T00:00:00Z" });
  assert.ok(r.error);
  const ok = validatePhaseDetails({ startedOn: "2026-10-10" }, { now: NOW, previousStartedAt: "2026-10-01T00:00:00Z" });
  assert.ok(!ok.error && ok.startedAt);
});

test("suggestion quand la durée prévue est dépassée", () => {
  const since = new Date(Date.now() - 50 * 86_400_000).toISOString();
  const s = generateCoachingPhaseSuggestions({ phase: "optimisation", since, plannedWeeks: 5 }, []);
  assert.ok(s.some((x) => x.id === "phase-duree-depassee"));
  const recent = new Date(Date.now() - 10 * 86_400_000).toISOString();
  assert.ok(!generateCoachingPhaseSuggestions({ phase: "optimisation", since: recent, plannedWeeks: 5 }, []).some((x) => x.id === "phase-duree-depassee"));
});
