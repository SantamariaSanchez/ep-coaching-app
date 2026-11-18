import test from "node:test";
import assert from "node:assert/strict";
import { getWeekStart, getISOWeek } from "../../utils/checkins";

test("semaine du check-in : lundi de la semaine à Paris", () => {
  assert.equal(getWeekStart("2026-11-23"), "2026-11-23"); // lundi
  assert.equal(getWeekStart("2026-11-22"), "2026-11-16"); // dimanche
  assert.equal(getWeekStart("2026-11-18"), "2026-11-16"); // mercredi
  assert.equal(getWeekStart("2027-01-01"), "2026-12-28"); // vendredi, changement d'année
  assert.equal(getISOWeek(new Date("2026-11-16T12:00:00Z")), 47);
});
