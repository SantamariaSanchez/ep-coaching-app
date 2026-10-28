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

function video(i: number, structure: string | null, hookType: string | null): RotationScript {
  return { platform: "youtube", structure, hook_type: hookType, created_at: `2026-10-${String(10 + i).padStart(2, "0")}T10:00:00Z` };
}

test("YouTube : une structure qui revient sur les 10 dernières vidéos est signalée", () => {
  const c = checkRotation([video(1, "Y01", "FP"), video(2, "Y03", "PX"), video(3, "Y01", "VD")]);
  const s = c.find((x) => x.id === "youtube-structure")!;
  assert.equal(s.ok, false);
  assert.match(s.text, /Y01/);
});

test("YouTube : structures et hooks variés, aucune alerte", () => {
  const c = checkRotation([video(1, "Y01", "FP"), video(2, "Y03", "PX"), video(3, "Y06", "VD")]);
  assert.equal(c.find((x) => x.id === "youtube-structure")!.ok, true);
  assert.equal(c.find((x) => x.id === "youtube-hooks")!.ok, true);
});

test("YouTube : un hook du même type deux fois dans la fournée est signalé", () => {
  const c = checkRotation([video(1, "Y01", "FP"), video(2, "Y03", "FP")]);
  assert.equal(c.find((x) => x.id === "youtube-hooks")!.ok, false);
});

test("YouTube : sans plan vidéo enregistré, rien à contrôler", () => {
  const c = checkRotation([video(1, null, null), video(2, null, null)]);
  assert.equal(c.find((x) => x.id === "youtube-structure"), undefined);
});
