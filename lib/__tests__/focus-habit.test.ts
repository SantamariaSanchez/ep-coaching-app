import test from "node:test";
import assert from "node:assert/strict";
import { FOCUS_HABIT_CANDIDATES, FOCUS_HABIT_DAYS, focusHabitProgress } from "../focus-habit";
import { HABITS } from "../mindset-content";

test("les habitudes proposées existent dans le catalogue", () => {
  const keys = new Set(HABITS.map((h) => h.key));
  for (const k of FOCUS_HABIT_CANDIDATES) assert.ok(keys.has(k), k);
});

test("jour 1 : premier jour, rien de fini", () => {
  const p = focusHabitProgress("2026-10-01", "2026-10-01", []);
  assert.equal(p.dayIndex, 1);
  assert.equal(p.daysDone, 0);
  assert.equal(p.finished, false);
  assert.equal(p.cells.length, FOCUS_HABIT_DAYS);
  assert.equal(p.cells[0], "future");
});

test("jours cochés et manqués", () => {
  const p = focusHabitProgress("2026-10-01", "2026-10-04", ["2026-10-01", "2026-10-03", "2026-10-04"]);
  assert.equal(p.dayIndex, 4);
  assert.equal(p.daysDone, 3);
  assert.deepEqual(p.cells.slice(0, 5), ["done", "missed", "done", "done", "future"]);
});

test("deux semaines écoulées : terminé, index plafonné", () => {
  const p = focusHabitProgress("2026-10-01", "2026-10-20", []);
  assert.equal(p.finished, true);
  assert.equal(p.dayIndex, FOCUS_HABIT_DAYS);
  assert.ok(p.cells.every((c) => c === "missed"));
  assert.equal(focusHabitProgress("2026-10-01", "2026-10-14", []).finished, false);
  assert.equal(focusHabitProgress("2026-10-01", "2026-10-15", []).finished, true);
});

test("les coches hors fenêtre ne comptent pas, les doublons non plus", () => {
  const p = focusHabitProgress("2026-10-05", "2026-10-07", ["2026-10-01", "2026-10-05", "2026-10-05"]);
  assert.equal(p.daysDone, 1);
});
