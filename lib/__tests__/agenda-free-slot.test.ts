import { test } from "node:test";
import assert from "node:assert/strict";
import { firstFreeSlot } from "../agenda-engine";

test("garde l'heure voulue si elle est libre", () => {
  assert.deepEqual(firstFreeSlot({ s: 600, e: 660 }, [{ s: 480, e: 540 }]), { s: 600, e: 660 });
});

test("décale juste après le bloc qui chevauche", () => {
  assert.deepEqual(firstFreeSlot({ s: 600, e: 660 }, [{ s: 570, e: 630 }]), { s: 630, e: 690 });
});

test("saute plusieurs blocs collés", () => {
  assert.deepEqual(firstFreeSlot({ s: 600, e: 630 }, [{ s: 590, e: 640 }, { s: 640, e: 700 }]), { s: 700, e: 730 });
});

test("revient plus tôt si la fin de journée est pleine", () => {
  assert.deepEqual(firstFreeSlot({ s: 1380, e: 1440 }, [{ s: 1320, e: 1440 }]), { s: 1260, e: 1320 });
});

test("null si la journée est pleine", () => {
  assert.equal(firstFreeSlot({ s: 600, e: 660 }, [{ s: 0, e: 1440 }]), null);
});
