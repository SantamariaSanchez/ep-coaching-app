import { test } from "node:test";
import assert from "node:assert/strict";
import { trainingAdherence } from "../training-adherence";

test("séances tenues : le rappel reste le rappel simple", () => {
  const a = trainingAdherence({ plannedPerWeek: 4, done14d: 7, weeksSinceStart: 5, label: "Jambes" });
  assert.equal(a.level, "tenu");
  assert.match(a.reminder, /Tu avais « Jambes » de prévu/);
});

test("séances fragiles : on propose la version courte, sans culpabiliser", () => {
  const a = trainingAdherence({ plannedPerWeek: 4, done14d: 4, weeksSinceStart: 5, label: "Haut du corps" });
  assert.equal(a.level, "fragile");
  assert.match(a.reminder, /Peu de temps \? Adapter la séance/);
});

test("décroché : moins de séances par semaine, au moins 2, jamais plus que prévu", () => {
  const a = trainingAdherence({ plannedPerWeek: 4, done14d: 1, weeksSinceStart: 5 });
  assert.equal(a.level, "decroche");
  assert.equal(a.suggestedPerWeek, 2);
  assert.match(a.reminder, /On vise 2 par semaine/);
  const two = trainingAdherence({ plannedPerWeek: 2, done14d: 0, weeksSinceStart: 5 });
  assert.equal(two.suggestedPerWeek, null);
  assert.match(two.reminder, /version courte : 25 minutes/);
});

test("les deux premières semaines, et sans séance prévue, on ne conclut rien", () => {
  assert.equal(trainingAdherence({ plannedPerWeek: 4, done14d: 0, weeksSinceStart: 1 }).level, "inconnu");
  assert.equal(trainingAdherence({ plannedPerWeek: 0, done14d: 0, weeksSinceStart: 9 }).level, "inconnu");
});
