import { test } from "node:test";
import assert from "node:assert/strict";
import { buildFirstMonth, formatKg } from "../first-month";

const base = {
  startDate: "2026-10-20",
  today: "2026-11-18", // jour 30
  sessions: [
    { session_date: "2026-10-21", is_completed: true },
    { session_date: "2026-10-23", is_completed: true },
    { session_date: "2026-11-04", is_completed: true },
    { session_date: "2026-11-05", is_completed: false },
  ],
  logs: [
    { exercise_name: "Hip thrust", weight_kg: 40, logged_at: "2026-10-21" },
    { exercise_name: "Hip thrust", weight_kg: 50, logged_at: "2026-11-04" },
    { exercise_name: "Goblet squat", weight_kg: "12", logged_at: "2026-10-21" },
    { exercise_name: "goblet squat", weight_kg: 14, logged_at: "2026-11-04" },
    { exercise_name: "Rowing", weight_kg: 20, logged_at: "2026-10-23" },
    { exercise_name: "Rowing", weight_kg: 18, logged_at: "2026-11-04" },
  ],
  bilanDates: ["2026-10-21", "2026-10-21", "2026-10-22", "2026-09-01"],
};

test("jour 30 : séances faites, semaines actives, charges en hausse, bilans", () => {
  const r = buildFirstMonth(base);
  assert.ok(r);
  assert.equal(r.day, 30);
  assert.equal(r.sessionsDone, 3);
  assert.equal(r.activeWeeks, 2);
  assert.deepEqual(r.liftsUp.map((l) => l.name), ["Hip thrust", "Goblet squat"]);
  assert.deepEqual(r.liftsUp[0], { name: "Hip thrust", from: 40, to: 50 });
  assert.equal(r.bilanDays, 2);
});

test("hors fenêtre ou sans séance : rien", () => {
  assert.equal(buildFirstMonth({ ...base, today: "2026-11-05" }), null); // jour 17
  assert.equal(buildFirstMonth({ ...base, today: "2026-12-20" }), null); // jour 62
  assert.equal(buildFirstMonth({ ...base, sessions: [] }), null);
  assert.equal(buildFirstMonth({ ...base, startDate: null }), null);
});

test("formatKg", () => {
  assert.equal(formatKg(50), "50 kg");
  assert.equal(formatKg(12.5), "12,5 kg");
});
