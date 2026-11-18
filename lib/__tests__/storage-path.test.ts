import test from "node:test";
import assert from "node:assert/strict";
import { ownStoragePath } from "../storage-path";

test("chemin de fichier : seulement dans son propre dossier", () => {
  const me = "11111111-1111-1111-1111-111111111111";
  assert.equal(ownStoragePath(`${me}/1700-a.jpg`, me), `${me}/1700-a.jpg`);
  assert.equal(ownStoragePath(`22222222-2222-2222-2222-222222222222/photo.jpg`, me), null);
  assert.equal(ownStoragePath(`${me}/../autre/photo.jpg`, me), null);
  assert.equal(ownStoragePath("", me), null);
  assert.equal(ownStoragePath(42, me), null);
});
