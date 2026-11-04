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

test("activation des coachs : numérateur et dénominateur explicites", () => {
  const s = inboundSummary({ prequalifications: 0, coachSignups: 1, coachesOnboarded: 1, coachesTotal: 11 });
  assert.match(s, /1 coach inscrit/);
  assert.match(s, /terminé l'onboarding : 1 sur 11/);
});

test("les leads guides gratuits sont comptés avec leur origine", () => {
  const s = inboundSummary({ prequalifications: 0, coachSignups: 0, leads: 3, leadsByOrigin: { instagram: 2, "origine inconnue": 1 } });
  assert.match(s, /3 leads guides gratuits \(instagram 2, origine inconnue 1\)/);
  assert.match(inboundSummary({ prequalifications: 0, coachSignups: 0, leads: 1 }), /1 lead guide gratuit/);
});
