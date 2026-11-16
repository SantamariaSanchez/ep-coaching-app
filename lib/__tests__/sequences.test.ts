import { test } from "node:test";
import assert from "node:assert/strict";
import { LEAD_STEPS, dueDayStep, dueAuditStep, leadMail, auditMail, onboardingMail, firstName, parisWhen } from "../sequences";

const DAY = 86_400_000;
const T0 = Date.parse("2026-11-16T10:00:00Z");

test("relance lead : l'étape du jour, jamais une vieille relance en rafale", () => {
  const anchor = new Date(T0).toISOString();
  assert.equal(dueDayStep(LEAD_STEPS, anchor, T0 + 1 * DAY, new Set()), null);
  assert.equal(dueDayStep(LEAD_STEPS, anchor, T0 + 2.1 * DAY, new Set())?.key, "j2");
  assert.equal(dueDayStep(LEAD_STEPS, anchor, T0 + 2.1 * DAY, new Set(["j2"])), null);
  assert.equal(dueDayStep(LEAD_STEPS, anchor, T0 + 8.5 * DAY, new Set())?.key, "j8");
  assert.equal(dueDayStep(LEAD_STEPS, anchor, T0 + 12 * DAY, new Set()), null);
});

test("rappels d'audit : la dernière étape atteinte, seulement près de son seuil", () => {
  const start = new Date(T0 + 10 * DAY).toISOString();
  assert.equal(dueAuditStep(start, T0 + 1000, new Set())?.key, "j10");
  // Pris 3 jours avant : pas de J-10, pas de J-5 en retard.
  assert.equal(dueAuditStep(start, T0 + 7 * DAY, new Set()), null);
  assert.equal(dueAuditStep(start, T0 + 8 * DAY, new Set())?.key, "j2");
  assert.equal(dueAuditStep(start, T0 + 10 * DAY - 58 * 60_000, new Set())?.key, "h1");
  assert.equal(dueAuditStep(start, T0 + 10 * DAY - 25 * 60_000, new Set())?.key, "m30");
  assert.equal(dueAuditStep(start, T0 + 10 * DAY - 25 * 60_000, new Set(["m30"])), null);
  assert.equal(dueAuditStep(start, T0 + 11 * DAY, new Set()), null);
});

test("mails : un seul lien suivi, prénom échappé, aucun tiret cadratin", () => {
  for (const step of ["j2", "j4", "j8", "j16", "j30"]) {
    const m = leadMail({ step, guideTitle: "Guide <macros>", guideUrl: "https://x/ressources/g?src=email", appUrl: "https://x", candidatureUrl: "https://f/p" })!;
    assert.ok(m.subject.length > 3);
    assert.ok(!m.html.includes("—") && !m.subject.includes("—"));
    assert.ok(!m.html.includes("<macros>"));
    assert.ok((m.html.match(/href=/g) ?? []).length <= 1);
  }
  for (const step of ["j10", "j5", "j2", "j1", "h1", "m30"]) {
    const m = auditMail({ step, name: "<b>Léa</b>", startsAt: "2026-11-18T13:30:00Z", joinUrl: "https://meet/x" })!;
    assert.ok(!m.html.includes("<b>Léa</b>"));
    assert.ok(!m.html.includes("—"));
  }
  for (const step of ["j1", "j3", "j7"]) assert.ok(onboardingMail({ step, name: "Tom", appUrl: "https://x" })!.html.includes("Tom"));
  assert.equal(leadMail({ step: "j99", guideTitle: "", guideUrl: "", appUrl: "", candidatureUrl: "" }), null);
});

test("prénom et date de Paris", () => {
  assert.equal(firstName("Léa Martin"), "Léa");
  assert.equal(firstName("  "), null);
  assert.match(parisWhen("2026-11-18T13:30:00Z"), /mercredi 18 novembre à 14 h 30/);
});
