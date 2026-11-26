import test from "node:test";
import assert from "node:assert/strict";
import { shootingOrder, isFilmableScript } from "../shooting-session";

test("session : même format enchaîné, plus ancien d'abord, format absent = face caméra", () => {
  const s = [
    { id: "b2", created_at: "2026-11-05", content_format: "broll_voix_off" },
    { id: "f1", created_at: "2026-11-01", content_format: "face_cam" },
    { id: "b1", created_at: "2026-11-02", content_format: "broll_voix_off" },
    { id: "f2", created_at: "2026-11-03", content_format: "face_cam" },
    { id: "n1", created_at: "2026-11-04", content_format: null },
  ];
  assert.deepEqual(shootingOrder(s).map((x) => x.id), ["f1", "f2", "n1", "b1", "b2"]);
  assert.deepEqual(shootingOrder([]), []);
});

test("prêt à tourner : texte non vide, vidéo, pas un post écrit", () => {
  const base = { status: "a_tourner", platform: "reel", content_format: "face_cam", content: "Hook : …" };
  assert.equal(isFilmableScript(base), true);
  assert.equal(isFilmableScript({ ...base, content: "   " }), false);
  assert.equal(isFilmableScript({ ...base, status: "tourne" }), false);
  assert.equal(isFilmableScript({ ...base, platform: "linkedin" }), false);
  assert.equal(isFilmableScript({ ...base, content_format: "carrousel" }), false);
});

test("session : dans un format, les scripts qui envoient vers un guide passent devant", () => {
  const s = [
    { id: "old", created_at: "2026-10-01", content_format: "face_cam", cta: "Abonne-toi" },
    { id: "g2", created_at: "2026-10-05", content_format: "face_cam", cta: "Commente 822, et je te l'envoie" },
    { id: "g1", created_at: "2026-10-03", content_format: "face_cam", content: "… commente 641 et je te l'envoie" },
    { id: "b", created_at: "2026-10-02", content_format: "broll_voix_off", cta: "Commente APPLI" },
  ];
  assert.deepEqual(shootingOrder(s).map((x) => x.id), ["g1", "g2", "old", "b"]);
});

test("chemin vers un lead : guide, mot géré à la main ou audit ; une question en commentaire ne compte pas", async () => {
  const { hasGuideCta } = await import("../shooting-session");
  assert.equal(hasGuideCta({ cta: "Commente 314, et je te l'envoie" }), true);
  assert.equal(hasGuideCta({ cta: "Commente COACHING" }), true);
  assert.equal(hasGuideCta({ cta: "Réserve ton audit gratuit de 30 minutes, le lien est dans ma bio" }), true);
  assert.equal(hasGuideCta({ cta: "Dis-moi dans les commentaires : toi, t'y vas ?" }), false);
});
