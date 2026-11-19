import { test } from "node:test";
import assert from "node:assert/strict";
import { isStaleBuildError, shouldAutoReload } from "../stale-build";

test("isStaleBuildError : morceaux de code et actions serveur d'une ancienne version", () => {
  assert.equal(isStaleBuildError({ name: "ChunkLoadError", message: "Loading chunk 123 failed." }), true);
  assert.equal(isStaleBuildError(new TypeError("Failed to fetch dynamically imported module: https://x/_next/a.js")), true);
  assert.equal(isStaleBuildError(new Error('Failed to find Server Action "abc". This request might be from an older or newer deployment.')), true);
  assert.equal(isStaleBuildError(new Error("Importing a module script failed.")), true);
  assert.equal(isStaleBuildError(new Error("Cannot read properties of undefined")), false);
  assert.equal(isStaleBuildError(null), false);
});

test("shouldAutoReload : une fois par minute au plus", () => {
  assert.equal(shouldAutoReload(100_000, null), true);
  assert.equal(shouldAutoReload(100_000, 90_000), false);
  assert.equal(shouldAutoReload(200_000, 90_000), true);
});
