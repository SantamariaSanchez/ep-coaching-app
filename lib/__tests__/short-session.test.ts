import test from "node:test";
import assert from "node:assert/strict";
import { isCompoundName, planShortSession, SHORT_SESSION_TIPS, type ShortSessionExercise } from "../short-session";

const ex = (key: string, name: string, remainingSets: number, restSeconds: number | null = null, doneSets = 0): ShortSessionExercise =>
  ({ key, name, remainingSets, doneSets, restSeconds });

// Séance type : 2 polyarticulaires puis 3 isolations, 3 séries chacun.
const SESSION = [
  ex("a", "Développé couché", 3, 180),
  ex("b", "Rowing barre", 3, 150),
  ex("c", "Élévations latérales", 3, 90),
  ex("d", "Curl incliné", 3, 90),
  ex("e", "Extension triceps poulie", 3, 90),
];

test("polyarticulaire ou isolation, par le nom", () => {
  assert.ok(isCompoundName("Développé couché"));
  assert.ok(isCompoundName("Tirage vertical"));
  assert.ok(isCompoundName("Soulevé de terre roumain"));
  assert.ok(!isCompoundName("Élévations latérales"));
  assert.ok(!isCompoundName("Curl incliné"));
});

test("assez de temps : rien à couper", () => {
  const p = planShortSession(SESSION, 120);
  assert.equal(p.fitsAlready, true);
  assert.ok(p.lines.every((l) => l.action === "garder"));
});

test("30 minutes : on réduit les séries avant de retirer, l'isolation part avant les polyarticulaires", () => {
  const p = planShortSession(SESSION, 30);
  assert.equal(p.fitsAlready, false);
  assert.ok(p.minutesAfter <= 30, `estimé ${p.minutesAfter}`);
  const a = p.lines.find((l) => l.key === "a")!;
  const b = p.lines.find((l) => l.key === "b")!;
  assert.notEqual(a.action, "retirer");
  assert.notEqual(b.action, "retirer");
  // Aucune isolation gardée alors qu'un polyarticulaire serait retiré.
  const removedCompound = p.lines.some((l) => (l.key === "a" || l.key === "b") && l.action === "retirer");
  assert.equal(removedCompound, false);
});

test("15 minutes : le premier exercice reste toujours, au moins une série", () => {
  const p = planShortSession(SESSION, 15);
  const first = p.lines[0];
  assert.equal(first.key, "a");
  assert.ok(first.remainingAfter >= 1);
});

test("temps impossible : le premier exercice reste et la proposition le dit", () => {
  const p = planShortSession(SESSION, 1);
  assert.equal(p.tooShort, true);
  assert.ok(p.lines[0].remainingAfter >= 1);
  assert.ok(p.lines.slice(1).every((l) => l.remainingAfter === 0));
});

test("séries déjà faites : jamais retiré, seulement arrêté là", () => {
  const p = planShortSession([ex("a", "Squat", 2, 180, 2), ex("b", "Leg curl", 3, 90, 1), ex("c", "Mollets", 3, 60)], 5);
  const b = p.lines.find((l) => l.key === "b")!;
  assert.notEqual(b.action, "retirer");
  assert.equal(p.lines.find((l) => l.key === "c")!.action, "retirer");
});

test("exercices déjà terminés : ignorés", () => {
  const p = planShortSession([ex("a", "Squat", 0, 180, 3), ex("b", "Leg curl", 3, 90)], 60);
  assert.equal(p.lines.length, 1);
  assert.equal(p.lines[0].key, "b");
});

test("repères sans tiret cadratin ni culpabilisation", () => {
  const all = SHORT_SESSION_TIPS.join(" ");
  assert.doesNotMatch(all, /[—–]/);
  assert.doesNotMatch(all, /discipline|paresse|flemme/i);
});
