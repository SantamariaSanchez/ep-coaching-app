import test from "node:test";
import assert from "node:assert/strict";
import {
  EATING_RELATION_OPTIONS,
  EATING_STOP_MESSAGE,
  EATING_WATCH_MESSAGE,
  deficitAllowed,
  eatingCoachAlert,
  eatingSafetyLevel,
  parseEatingRelation,
} from "../eating-safety";

test("niveaux : actuel et incertain bloquent, passé prévient, non et inconnu passent", () => {
  assert.equal(eatingSafetyLevel("actuel"), "stop");
  assert.equal(eatingSafetyLevel("incertain"), "stop");
  assert.equal(eatingSafetyLevel("passe"), "watch");
  assert.equal(eatingSafetyLevel("non"), "clear");
  assert.equal(eatingSafetyLevel(null), "clear");
  assert.equal(eatingSafetyLevel(undefined), "clear");
});

test("aucun déficit chiffré au niveau stop", () => {
  assert.equal(deficitAllowed("stop"), false);
  assert.equal(deficitAllowed("watch"), true);
  assert.equal(deficitAllowed("clear"), true);
});

test("lecture des réponses : valeurs stockées et libellés du questionnaire", () => {
  for (const o of EATING_RELATION_OPTIONS) {
    assert.equal(parseEatingRelation(o.value), o.value);
    assert.equal(parseEatingRelation(o.label), o.value);
  }
  assert.equal(parseEatingRelation("n'importe quoi"), null);
  assert.equal(parseEatingRelation(42), null);
  assert.equal(parseEatingRelation(null), null);
});

test("messages : orientation vers un professionnel de santé, ni apparence ni tiret cadratin", () => {
  assert.match(EATING_STOP_MESSAGE, /professionnel de santé/);
  assert.match(EATING_STOP_MESSAGE, /3114/);
  for (const m of [EATING_STOP_MESSAGE, EATING_WATCH_MESSAGE]) {
    assert.doesNotMatch(m, /—/);
    assert.doesNotMatch(m, /apparence|physique|poids idéal/i);
  }
});

test("alerte coach : seulement pour stop et watch", () => {
  assert.equal(eatingCoachAlert("clear", "Léa"), null);
  assert.match(eatingCoachAlert("stop", "Léa")!.title, /Léa/);
  assert.match(eatingCoachAlert("watch", "Léa")!.body, /culpabilise jamais/);
});
