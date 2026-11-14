import { test } from "node:test";
import assert from "node:assert/strict";
import { formatKg, formatRange, formatRest, parseRepScheme, rangeForSet, suggestSet } from "../set-targets";

test("parseRepScheme : schémas du programme", () => {
  assert.deepEqual(parseRepScheme("1x12-15, 2x10-12", 3), [{ min: 12, max: 15 }, { min: 10, max: 12 }, { min: 10, max: 12 }]);
  assert.deepEqual(parseRepScheme("8-12", 3), [{ min: 8, max: 12 }, { min: 8, max: 12 }, { min: 8, max: 12 }]);
  assert.deepEqual(parseRepScheme("6-8, 8-10", null), [{ min: 6, max: 8 }, { min: 8, max: 10 }]);
  assert.deepEqual(parseRepScheme("12-8", 1), [{ min: 8, max: 12 }]);
  assert.deepEqual(parseRepScheme("2×10–12", 2), [{ min: 10, max: 12 }, { min: 10, max: 12 }]);
  // Schéma plus court que le nombre de séries : complété par la dernière fourchette.
  assert.deepEqual(parseRepScheme("6-8, 8-10", 3)?.[2], { min: 8, max: 10 });
});

test("parseRepScheme : illisible → null", () => {
  for (const bad of [null, "", "AMRAP", "30s", "0x10", "50x10", "8-12, max", "0"]) {
    assert.equal(parseRepScheme(bad, 3), null, String(bad));
  }
});

test("rangeForSet, formatRange, formatKg, formatRest", () => {
  const r = parseRepScheme("6-8, 10", null);
  assert.deepEqual(rangeForSet(r, 5), { min: 10, max: 10 });
  assert.equal(rangeForSet(null, 0), null);
  assert.equal(formatRange({ min: 10, max: 10 }), "10");
  assert.equal(formatRange({ min: 8, max: 12 }), "8-12");
  assert.equal(formatKg(32.5), "32,5");
  assert.equal(formatKg(40), "40");
  assert.equal(formatRest(45), "45 s");
  assert.equal(formatRest(60), "1 min");
  assert.equal(formatRest(90), "1 min 30");
  assert.equal(formatRest(-5), "0 s");
});

test("suggestSet : double progression", () => {
  const range = { min: 8, max: 12 };
  assert.equal(suggestSet({ range, prev: null, targetRir: 2 }), null);
  assert.equal(suggestSet({ range, prev: { weight: 0, reps: "10", rir: null }, targetRir: 2 }), null);
  // Dans la fourchette : une rep de plus.
  assert.deepEqual(
    (({ weightKg, reps }) => ({ weightKg, reps }))(suggestSet({ range, prev: { weight: 60, reps: "10", rir: 2 }, targetRir: 2 })!),
    { weightKg: 60, reps: 11 },
  );
  // Haut de fourchette : +2,5 kg au-dessus de 20 kg, +1 kg en dessous.
  assert.equal(suggestSet({ range, prev: { weight: 60, reps: "12", rir: 2 }, targetRir: 2 })!.weightKg, 62.5);
  assert.equal(suggestSet({ range, prev: { weight: 12, reps: "13", rir: null }, targetRir: 2 })!.weightKg, 13);
  // Haut atteint mais arraché bien plus près de l'échec que prévu : on consolide.
  assert.deepEqual(
    (({ weightKg, reps }) => ({ weightKg, reps }))(suggestSet({ range, prev: { weight: 60, reps: "12", rir: 0 }, targetRir: 2 })!),
    { weightKg: 60, reps: 12 },
  );
  // Sous la fourchette : même charge, bas de fourchette.
  assert.equal(suggestSet({ range, prev: { weight: 60, reps: "6", rir: 1 }, targetRir: 2 })!.reps, 8);
});
