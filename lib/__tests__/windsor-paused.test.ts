import { test } from "node:test";
import assert from "node:assert/strict";
import { pausedMessage } from "../social/windsor";

test("lignes factices Windsor (lectures en pause) détectées", () => {
  const rows = [{ post_type: "Uh-oh! These are not your real numbers: reads are paused because you have 9 accounts connected", views: 0 }];
  assert.match(pausedMessage(rows) ?? "", /not your real numbers/);
  assert.equal(pausedMessage([{ post_type: "video", views: 12 }]), null);
});
