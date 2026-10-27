import test from "node:test";
import assert from "node:assert/strict";
import { checkRotation, type RotationScript } from "../studio-rotation";

function reel(i: number, format: string | null, pillar: string | null = null): RotationScript {
  return { platform: "reel", content_format: format, pillar, created_at: `2026-10-${String(10 + i).padStart(2, "0")}T10:00:00Z` };
}

test("pas assez de reels : rien à contrôler", () => {
  assert.deepEqual(checkRotation([reel(1, "face_cam"), reel(2, "yap")]), []);
});

test("5 reels avec 2 formats : alerte de variété", () => {
  const scripts = [reel(1, "face_cam"), reel(2, "face_cam"), reel(3, "yap"), reel(4, "yap"), reel(5, "face_cam")];
  const c = checkRotation(scripts).find((x) => x.id === "reel-formats")!;
  assert.equal(c.ok, false);
  assert.match(c.text, /2 formats/);
});

test("5 reels avec 3 formats : ok, le format par défaut est face caméra", () => {
  const scripts = [reel(1, null), reel(2, "yap"), reel(3, "tier_list"), reel(4, "face_cam"), reel(5, "yap")];
  assert.equal(checkRotation(scripts).find((x) => x.id === "reel-formats")!.ok, true);
});

test("pilier l'ego qui bloque : au plus un sur cinq", () => {
  const scripts = [
    reel(1, "face_cam", "ego_qui_bloque"),
    reel(2, "yap", "ego_qui_bloque"),
    reel(3, "tier_list"),
    reel(4, "clone"),
    reel(5, "question_reponse"),
  ];
  assert.equal(checkRotation(scripts).find((x) => x.id === "reel-ego")!.ok, false);
  scripts[1].pillar = "le_apres";
  assert.equal(checkRotation(scripts).find((x) => x.id === "reel-ego")!.ok, true);
});

test("YouTube : jamais trois fois de suite le même format", () => {
  const yt = (i: number, f: string): RotationScript => ({ platform: "youtube", content_format: f, created_at: `2026-10-${10 + i}T10:00:00Z` });
  assert.equal(checkRotation([yt(1, "face_cam"), yt(2, "face_cam"), yt(3, "face_cam")])[0].ok, false);
  assert.equal(checkRotation([yt(1, "face_cam"), yt(2, "yap"), yt(3, "face_cam")])[0].ok, true);
});

test("les textes n'ont pas de tiret cadratin", () => {
  const scripts = [reel(1, "face_cam"), reel(2, "face_cam"), reel(3, "face_cam"), reel(4, "face_cam"), reel(5, "face_cam")];
  for (const c of checkRotation(scripts)) assert.doesNotMatch(c.text, /—/);
});
