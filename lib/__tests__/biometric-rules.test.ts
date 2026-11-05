import { test } from "node:test";
import assert from "node:assert/strict";
import { generateInsightsForLatest, type BiometricLogInput } from "../biometric-rules";
import { READINESS_CONTRIBUTOR_INFO } from "../oura";

// Chantier C72 : aucune donnée de montre ou de bague n'est présentée comme un
// diagnostic, ni ne déclenche une décision d'entraînement automatique. Ces
// tests figent la règle sur les textes montrés au client.

const day = (n: number, over: Partial<BiometricLogInput> = {}): BiometricLogInput => ({
  log_date: `2026-11-${String(n).padStart(2, "0")}`,
  sleep_hours: 5,
  readiness_score: 50,
  hrv_ms: 60,
  resting_hr: 55,
  body_temp_deviation: null,
  ...over,
});

// Chiffres de charge, injonctions de repos ou d'allègement, causes médicales.
const FORBIDDEN = /(\d+\s?-\s?\d+\s?%|\bréduis\b|\bévite\b|allège|jour de repos|repos actif|maladie|surmenage|système nerveux|bon jour pour|nouveau record|ton corps est prêt)/i;

test("aucun insight de montre ne prescrit une charge ni n'évoque une maladie", () => {
  const history = [day(1, { hrv_ms: 100, resting_hr: 50 }), day(2, { hrv_ms: 100, resting_hr: 50 }), day(3, { hrv_ms: 100, resting_hr: 50 }), day(4, { hrv_ms: 100, resting_hr: 50 })];
  const today = day(5, { hrv_ms: 60, resting_hr: 60, body_temp_deviation: 0.8 });
  const insights = generateInsightsForLatest([...history, today]);
  const types = insights.map((i) => i.type);
  for (const t of ["sleep_debt", "low_readiness_streak", "hrv_drop", "resting_hr_elevated", "temperature_elevated"]) {
    assert.ok(types.includes(t), `insight attendu : ${t}`);
  }
  for (const i of insights) assert.doesNotMatch(i.suggestion, FORBIDDEN, i.type);
});

test("le jour de bonne récupération ne pousse pas à forcer", () => {
  const history = [day(1, { sleep_hours: 8, readiness_score: 90 }), day(2, { sleep_hours: 8, readiness_score: 90 })];
  const insights = generateInsightsForLatest([...history, day(3, { sleep_hours: 8, readiness_score: 90, hrv_ms: 60 })]);
  const green = insights.find((i) => i.type === "green_light");
  assert.ok(green);
  assert.doesNotMatch(green.suggestion, FORBIDDEN);
  assert.match(green.suggestion, /coach/i);
});

test("les conseils par sous-score de la bague restent descriptifs", () => {
  for (const [key, info] of Object.entries(READINESS_CONTRIBUTOR_INFO)) {
    assert.doesNotMatch(info.tip, FORBIDDEN, key);
  }
});
