import { test } from "node:test";
import assert from "node:assert/strict";
import { AI_COACH_ESCALATION_MARKER, eatingSafetyPromptRule, extractEscalation } from "../ai-coaches";

const M = AI_COACH_ESCALATION_MARKER;

test("extractEscalation : marqueur en tête retiré", () => {
  assert.deepEqual(extractEscalation(`${M}\nVa voir ton médecin.`), { escalate: true, text: "Va voir ton médecin." });
});

test("extractEscalation : marqueur au milieu ou en gras, jamais montré", () => {
  const a = extractEscalation(`Je comprends.\n${M}\nParles-en à Santamaria.`);
  assert.equal(a.escalate, true);
  assert.ok(!a.text.includes(M));
  const b = extractEscalation(`**${M}**\nParles-en à ton médecin.`);
  assert.equal(b.escalate, true);
  assert.equal(b.text, "Parles-en à ton médecin.");
});

test("extractEscalation : marqueur seul = escalade avec texte vide", () => {
  assert.deepEqual(extractEscalation(`  ${M}  `), { escalate: true, text: "" });
});

test("extractEscalation : sans marqueur", () => {
  assert.deepEqual(extractEscalation("  Bonne séance !  "), { escalate: false, text: "Bonne séance !" });
});

test("eatingSafetyPromptRule : aucun chiffre en stop ou inconnu, rien en clear", () => {
  assert.equal(eatingSafetyPromptRule("clear"), "");
  assert.match(eatingSafetyPromptRule("stop"), /AUCUN chiffre/);
  assert.match(eatingSafetyPromptRule(null), /AUCUN chiffre/);
  assert.match(eatingSafetyPromptRule("watch"), /jamais de déficit/);
});
