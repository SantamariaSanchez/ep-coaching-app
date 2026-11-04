import test from "node:test";
import assert from "node:assert/strict";
import { isBilanDone, parseDecimal, parseHours, formatHours, hoursBetween, changedFields, fieldFilled } from "../bilan-quick";

test("poids tapé au clavier", () => {
  assert.equal(parseDecimal("82,4"), 82.4);
  assert.equal(parseDecimal("82.4"), 82.4);
  assert.equal(parseDecimal(" 82 kg"), 82);
  assert.equal(parseDecimal("abc"), null);
  assert.equal(parseDecimal(""), null);
});

test("sommeil tapé librement", () => {
  assert.equal(parseHours("7h30"), 7.5);
  assert.equal(parseHours("7 h 30"), 7.5);
  assert.equal(parseHours("7:30"), 7.5);
  assert.equal(parseHours("7,5"), 7.5);
  assert.equal(parseHours("7.25"), 7.25);
  assert.equal(parseHours("8"), 8);
  assert.equal(parseHours("6h"), 6);
  assert.equal(parseHours("450 min"), 7.5);
  assert.equal(parseHours("7h75"), null);
  assert.equal(parseHours("beaucoup"), null);
  assert.equal(formatHours(7.5), "7 h 30");
  assert.equal(formatHours(8), "8 h");
});

test("7.30 veut dire 7 h 30, pas 7,3 h", () => {
  assert.equal(parseHours("7.30"), 7.5);
  assert.equal(parseHours("7,15"), 7.25);
  assert.equal(parseHours("7.75"), 7.75);
  assert.equal(parseHours("7.5"), 7.5);
});

test("durée entre coucher et lever", () => {
  assert.equal(hoursBetween("23:00", "06:30"), 7.5);
  assert.equal(hoursBetween("00:30", "08:00"), 7.5);
  assert.equal(hoursBetween("23:00", ""), null);
});

test("le poids seul ne valide plus tout le bilan", () => {
  const minimum = ["poids", "energie", "sommeil"] as const;
  assert.equal(isBilanDone({ weight_morning: 82 }, [...minimum], true), false);
  assert.equal(isBilanDone({ weight_morning: 82, energy: 4, sleep_hours: 7 }, [...minimum], true), true);
  // Hors jour de pesée, le poids n'est pas exigé.
  assert.equal(isBilanDone({ energy: 4, sleep_hours: 7 }, [...minimum], false), true);
  assert.equal(isBilanDone(null, [...minimum], true), false);
});

test("seuls les champs modifiés partent", () => {
  assert.deepEqual(changedFields<Record<string, unknown>>({ weight_morning: 82, energy: 3 }, { weight_morning: 82, energy: 4, sleep_hours: 7 }), { energy: 4, sleep_hours: 7 });
  assert.deepEqual(changedFields({ weight_morning: 82 }, { weight_morning: 82 }), {});
  assert.equal(fieldFilled("horaires_sommeil", { bedtime_actual: "23:00" }), false);
});
