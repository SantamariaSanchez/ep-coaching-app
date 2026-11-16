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
