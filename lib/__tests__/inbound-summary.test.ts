import test from "node:test";
import assert from "node:assert/strict";
import { inboundSummary } from "../social/inbound-summary";

test("aucune demande : on le dit, sans inventer de taux", () => {
  const s = inboundSummary({ prequalifications: 0, coachSignups: 0 });
  assert.match(s, /Aucune demande/);
  assert.doesNotMatch(s, /%/);
});

test("accords au singulier et au pluriel", () => {
  assert.equal(inboundSummary({ prequalifications: 1, coachSignups: 0 }), "Sur 30 jours : 1 questionnaire rempli.");
  assert.equal(inboundSummary({ prequalifications: 3, coachSignups: 2 }), "Sur 30 jours : 3 questionnaires remplis et 2 coachs inscrits.");
});
