import test from "node:test";
import assert from "node:assert/strict";
import { shootingOrder } from "../shooting-session";

test("session : même format enchaîné, plus ancien d'abord", () => {
  const s = [
    { id: "b2", created_at: "2026-11-05", content_format: "broll_voix_off" },
    { id: "f1", created_at: "2026-11-01", content_format: "face_cam" },
    { id: "b1", created_at: "2026-11-02", content_format: "broll_voix_off" },
    { id: "f2", created_at: "2026-11-03", content_format: "face_cam" },
    { id: "n1", created_at: "2026-11-04", content_format: null },
  ];
  assert.deepEqual(shootingOrder(s).map((x) => x.id), ["f1", "f2", "b1", "b2", "n1"]);
  assert.deepEqual(shootingOrder([]), []);
});
