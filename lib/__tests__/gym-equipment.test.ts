import test from "node:test";
import assert from "node:assert/strict";
import { EXERCISE_LIBRARY_SEED } from "../exercise-library-seed";
import { GYM_TEMPLATES, equipmentFilterFor, exerciseFeasible, filterFeasible, missingEquipment, sanitizeEquipment, templateFor } from "../gym-equipment";

const pendulum = { name: "Squat pendulaire (pendulum)", equipment: "Machine" };
const legPress = { name: "Presse à cuisses (leg press)", equipment: "Machine" };
const pushups = { name: "Pompes", equipment: "Poids du corps" };

test("salle sans squat pendulaire : l'exercice n'est pas proposé, la presse oui", () => {
  const eq = ["leg_press", "barbell"];
  assert.equal(exerciseFeasible(pendulum, eq), false);
  assert.equal(exerciseFeasible(legPress, eq), true);
  assert.deepEqual(missingEquipment(pendulum, eq), ["Squat pendulaire (pendulum)"]);
});

test("poids du corps : filtre strict ; matériel non renseigné : aucun filtre", () => {
  assert.deepEqual(equipmentFilterFor({ kind: "poids_du_corps", equipment: [] }), []);
  assert.equal(equipmentFilterFor({ kind: "custom", equipment: [] }), null);
  assert.equal(equipmentFilterFor(null), null);
  assert.equal(exerciseFeasible(legPress, []), false);
  assert.equal(exerciseFeasible(pushups, []), true);
  assert.equal(exerciseFeasible(legPress, null), true);
});

test("barre : développé couché demande un banc, squat un rack", () => {
  assert.equal(exerciseFeasible({ name: "Développé couché barre", equipment: "Barre" }, ["barbell"]), false);
  assert.equal(exerciseFeasible({ name: "Développé couché barre", equipment: "Barre" }, ["barbell", "flat_bench"]), true);
  assert.equal(exerciseFeasible({ name: "Squat barre (back squat)", equipment: "Barre" }, ["barbell"]), false);
  assert.equal(exerciseFeasible({ name: "Squat barre (back squat)", equipment: "Barre" }, ["barbell", "squat_rack"]), true);
});

test("salles types : la salle commerciale fait presque tout, le home gym beaucoup moins, CrossFit sans machines guidées", () => {
  const lib = EXERCISE_LIBRARY_SEED.map((e) => ({ name: e.name, equipment: e.equipment ?? null }));
  const n = (k: string) => filterFeasible(lib, templateFor(k as never)!.equipment).length;
  assert.ok(n("commerciale") > n("home_gym"));
  assert.ok(n("home_gym") > n("poids_du_corps"));
  assert.ok(n("commerciale") > lib.length * 0.7);
  assert.equal(exerciseFeasible(legPress, templateFor("crossfit")!.equipment), false);
  assert.equal(GYM_TEMPLATES.length, 4);
});

test("clés inconnues écartées", () => {
  assert.deepEqual(sanitizeEquipment(["smith", "smith", "nope", 3]), ["smith"]);
});
