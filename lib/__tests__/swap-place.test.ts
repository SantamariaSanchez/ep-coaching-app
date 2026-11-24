import test from "node:test";
import assert from "node:assert/strict";
import { equipmentForSwapPlace, parseSwapPlace, swapPlaceGymId } from "../swap-place";
import { exerciseFeasible } from "../gym-equipment";

test("parseSwapPlace n'accepte que les lieux connus", () => {
  assert.equal(parseSwapPlace("maison"), "maison");
  assert.equal(parseSwapPlace("sans_materiel"), "sans_materiel");
  assert.equal(parseSwapPlace("gym:2b1c0f7e-1234-4abc-9def-0123456789ab"), "gym:2b1c0f7e-1234-4abc-9def-0123456789ab");
  assert.equal(parseSwapPlace("gym:pas-un-id"), "habituelle");
  assert.equal(parseSwapPlace("n'importe quoi"), "habituelle");
  assert.equal(parseSwapPlace(null), "habituelle");
});

test("swapPlaceGymId sort l'identifiant de salle", () => {
  assert.equal(swapPlaceGymId("gym:2b1c0f7e-1234-4abc-9def-0123456789ab"), "2b1c0f7e-1234-4abc-9def-0123456789ab");
  assert.equal(swapPlaceGymId("maison"), null);
});

test("la salle habituelle ne filtre rien", () => {
  assert.equal(equipmentForSwapPlace("habituelle"), null);
});

test("sans matériel garde le poids du corps et écarte la presse", () => {
  const eq = equipmentForSwapPlace("sans_materiel");
  assert.deepEqual(eq, []);
  assert.equal(exerciseFeasible({ name: "Presse à cuisses", equipment: "Machine" }, eq), false);
});

test("maison ou hôtel garde les haltères et écarte la presse à cuisses", () => {
  const eq = equipmentForSwapPlace("maison");
  assert.ok(eq && eq.includes("dumbbells"));
  assert.equal(exerciseFeasible({ name: "Curl haltères", equipment: "Haltères" }, eq), true);
  assert.equal(exerciseFeasible({ name: "Presse à cuisses", equipment: "Machine" }, eq), false);
});

test("une salle enregistrée sans matériel renseigné ne filtre rien", () => {
  assert.equal(equipmentForSwapPlace("gym:2b1c0f7e-1234-4abc-9def-0123456789ab", { kind: "custom", equipment: [] }), null);
  assert.deepEqual(equipmentForSwapPlace("gym:2b1c0f7e-1234-4abc-9def-0123456789ab", { kind: "custom", equipment: ["dumbbells"] }), ["dumbbells"]);
});
