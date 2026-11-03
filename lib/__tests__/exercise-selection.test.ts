import test from "node:test";
import assert from "node:assert/strict";
import { injuryAvoidKeywords, hasInjuryPrecautions, isTrainingExercise, isHeavyLift, exerciseRank, rankCandidates, PREFERRED_EXERCISES } from "../exercise-selection";
import type { LibraryExercise } from "@/utils/exercise-library";

const ex = (name: string, extra: Partial<LibraryExercise> = {}) => ({ name, muscle_group: "Quadriceps", ...extra }) as LibraryExercise;

test("blessure en texte libre : on écarte, on ne diagnostique pas", () => {
  assert.ok(injuryAvoidKeywords("douleur au genou droit").includes("sissy"));
  assert.ok(injuryAvoidKeywords("hernie discale").includes("soulevé de terre"));
  assert.deepEqual(injuryAvoidKeywords(""), []);
  assert.deepEqual(injuryAvoidKeywords(null), []);
  assert.equal(hasInjuryPrecautions("rien à signaler"), false);
});

test("mobilité, échauffement et rééducation ne comptent jamais comme séries", () => {
  assert.equal(isTrainingExercise({ name: "Bird dog", muscle_group: "Abdominaux" }), false);
  assert.equal(isTrainingExercise({ name: "Leg curl assis", muscle_group: "Ischios" }), true);
});

test("presse et soulevé roumain : exercices lourds (repos plus long)", () => {
  assert.equal(isHeavyLift("Presse à cuisses"), true);
  assert.equal(isHeavyLift("Soulevé de terre roumain"), true);
  assert.equal(isHeavyLift("Leg extension"), false);
});

test("mollets : une variante assise ET une debout en tête de liste", () => {
  const list = PREFERRED_EXERCISES["Mollets"].isolation;
  assert.match(list[0], /assis/i);
  assert.match(list[1], /debout/i);
});

test("un exercice au-dessus du niveau de la personne passe après", () => {
  const easy = ex("Exercice facile", { difficulty: "debutant" });
  const hard = ex("Exercice difficile", { difficulty: "avance" });
  assert.ok(exerciseRank(hard, "Quadriceps", "compose", "debutant") > exerciseRank(easy, "Quadriceps", "compose", "debutant"));
  assert.deepEqual(rankCandidates([hard, easy], "Quadriceps", "compose", "debutant").map((e) => e.name), ["Exercice facile", "Exercice difficile"]);
});
