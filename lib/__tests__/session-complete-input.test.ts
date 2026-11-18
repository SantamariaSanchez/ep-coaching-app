import test from "node:test";
import assert from "node:assert/strict";
import { cleanCompleteBody } from "../session-complete-input";

test("fin de séance : corps vide ou mal formé refusé proprement", () => {
  assert.equal(cleanCompleteBody(null), null);
  assert.equal(cleanCompleteBody("x"), null);
  assert.deepEqual(cleanCompleteBody({})?.workoutData, []);
});

test("fin de séance : valeurs hors bornes et texte injecté neutralisés", () => {
  const b = cleanCompleteBody({
    duration_minutes: "<img src=x>", energy_level: 9, pump: 3, general_feeling: 4.4,
    workoutData: [
      { exerciseName: "Squat", muscleGroup: "Quadriceps", isDirect: true, setsCompleted: 4, rirActual: 2, weightKg: 60 },
      { exerciseName: "Fente", setsCompleted: 1000, weightKg: -5 },
      { exerciseName: "", setsCompleted: 3 },
    ],
  })!;
  assert.equal(b.duration_minutes, null);
  assert.equal(b.energy_level, null);
  assert.equal(b.general_feeling, 4);
  assert.equal(b.workoutData.length, 1);
  assert.equal(b.workoutData[0].weightKg, 60);
});
