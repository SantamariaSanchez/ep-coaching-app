import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanPrepAnswers, prepLines, isPrepToken, PREP_QUESTIONS } from "../audit-prep";
import { auditMail } from "../sequences";

test("cleanPrepAnswers : garde les clés connues, nettoie et borne", () => {
  const out = cleanPrepAnswers({ objectif: "  perdre   du gras ", pirate: "x", salle: 42, semaine: "a".repeat(5000) });
  assert.equal(out.objectif, "perdre du gras");
  assert.equal(out.pirate, undefined);
  assert.equal(out.salle, undefined);
  assert.equal(out.semaine.length, PREP_QUESTIONS.find((q) => q.key === "semaine")!.max);
  assert.deepEqual(cleanPrepAnswers({ objectif: "   " }), {});
});

test("prepLines suit l'ordre des questions et saute le vide", () => {
  const lines = prepLines({ salle: "Basic Fit", objectif: "me sentir forte", hesitation: "" });
  assert.deepEqual(lines.map((l) => l.value), ["me sentir forte", "Basic Fit"]);
  assert.deepEqual(prepLines(null), []);
});

test("isPrepToken n'accepte qu'un uuid", () => {
  assert.ok(isPrepToken("3f2b8c1e-0a4d-4b6e-9c2f-1a2b3c4d5e6f"));
  assert.ok(!isPrepToken("abc"));
  assert.ok(!isPrepToken("3f2b8c1e-0a4d-4b6e-9c2f-1a2b3c4d5e6f' or 1=1"));
});

test("auditMail ajoute le lien de préparation quand il est donné", () => {
  const base = { step: "j5", name: "Léa", startsAt: "2026-11-30T17:00:00Z", joinUrl: null };
  assert.match(auditMail({ ...base, prepUrl: "https://ep-coaching.vercel.app/audit/x" })!.html, /Préparer mon audit/);
  assert.doesNotMatch(auditMail(base)!.html, /Préparer mon audit/);
});
