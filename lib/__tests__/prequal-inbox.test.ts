import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PREQUAL_STATUSES, isPrequalStatus, prequalAnswerLines, waitingDays, whatsappNumber, firstContactMessage,
} from "../prequal-inbox";

test("statuts : ceux de la contrainte de la table, rien d'autre", () => {
  assert.deepEqual([...PREQUAL_STATUSES], ["nouveau", "contacte", "appel_reserve", "ferme", "pas_adapte"]);
  assert.equal(isPrequalStatus("contacte"), true);
  assert.equal(isPrequalStatus("converti"), false);
  assert.equal(isPrequalStatus(null), false);
});

test("réponses : libellés connus d'abord, vides retirées", () => {
  const lines = prequalAnswerLines({ budget: "100", zzz: "x", objectif: "Prendre du muscle", vide: "  ", n: 3 as unknown as string });
  assert.deepEqual(lines.map((l) => l.label), ["Objectif", "Budget mensuel", "zzz"]);
  assert.equal(prequalAnswerLines(null).length, 0);
});

test("attente en jours", () => {
  const now = Date.parse("2026-11-16T12:00:00Z");
  assert.equal(waitingDays("2026-11-16T08:00:00Z", now), 0);
  assert.equal(waitingDays("2026-11-04T12:00:00Z", now), 12);
  assert.equal(waitingDays("2026-11-17T12:00:00Z", now), 0);
});

test("numéro WhatsApp", () => {
  assert.equal(whatsappNumber("06 12 34 56 78"), "33612345678");
  assert.equal(whatsappNumber("+33 6 12 34 56 78"), "33612345678");
  assert.equal(whatsappNumber("0032 470 12 34 56"), "32470123456");
  assert.equal(whatsappNumber(""), null);
  assert.equal(whatsappNumber("123"), null);
});

test("premier message : prénom, nom du coach, pas de tiret cadratin", () => {
  const m = firstContactMessage("Léa", "Emmanuel");
  assert.match(m, /^Salut Léa, c'est Emmanuel d'EP Coaching\./);
  assert.ok(!m.includes("—"));
  assert.match(firstContactMessage(null, null), /^Salut, c'est l'équipe/);
});

test("audit : retrouve la candidature la plus récente par email, sans tenir compte de la casse", async () => {
  const { prequalForEmail, auditWhen } = await import("../prequal-inbox");
  const rows = [
    { id: "a", email: "Lea@Mail.fr", created_at: "2026-11-01T10:00:00Z" },
    { id: "b", email: "lea@mail.fr", created_at: "2026-11-10T10:00:00Z" },
    { id: "c", email: "autre@mail.fr", created_at: "2026-11-12T10:00:00Z" },
  ];
  assert.equal(prequalForEmail(" LEA@mail.fr ", rows)?.id, "b");
  assert.equal(prequalForEmail(null, rows), null);
  assert.equal(prequalForEmail("inconnue@mail.fr", rows), null);
  assert.match(auditWhen("2026-11-26T23:30:00Z"), /27 nov\.?,? 00:30/);
});

test("date de Paris d'un audit à 00:30 heure de Paris (23:30 UTC la veille)", async () => {
  const { parisDateOf } = await import("../dates");
  assert.equal(parisDateOf("2026-11-26T23:30:00Z"), "2026-11-27");
  assert.equal(parisDateOf("2026-07-01T22:30:00Z"), "2026-07-02");
});

test("fenêtre des audits : commence 2 h avant maintenant", async () => {
  const { auditsWindowStart } = await import("../prequal-inbox");
  assert.equal(auditsWindowStart(Date.parse("2026-11-27T10:00:00Z")), "2026-11-27T08:00:00.000Z");
});

test("candidature non terminée : repérée, marqueur jamais affiché", async () => {
  const { isPartialPrequal, prequalAnswerLines } = await import("../prequal-inbox");
  assert.equal(isPartialPrequal({ objectif: "perte", _partial: "true" }), true);
  assert.equal(isPartialPrequal({ objectif: "perte" }), false);
  assert.ok(!prequalAnswerLines({ objectif: "perte", _partial: "true" }).some((l) => l.label === "_partial"));
});

test("auditFollowUp : avancer avant l'appel, reprogrammer après 15 min", async () => {
  const { auditFollowUp } = await import("../prequal-inbox");
  const start = "2026-11-20T18:00:00Z";
  const before = auditFollowUp("Léa", start, Date.parse("2026-11-19T10:00:00Z"), "Emmanuel");
  assert.equal(before.kind, "avancer");
  assert.match(before.message, /^Salut Léa, c'est Emmanuel/);
  assert.match(before.message, /plus tôt/);
  assert.equal(auditFollowUp(null, start, Date.parse("2026-11-20T18:10:00Z")).kind, "avancer");
  const after = auditFollowUp("", start, Date.parse("2026-11-20T18:16:00Z"));
  assert.equal(after.kind, "absente");
  assert.match(after.message, /^Salut, c'est l'équipe/);
  assert.match(after.message, /deux créneaux/);
});
