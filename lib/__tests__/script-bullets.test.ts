import test from "node:test";
import assert from "node:assert/strict";
import { bulletsToText, pointsFromText, sanitizeBullets } from "../script-bullets";

test("sanitizeBullets nettoie et retire les puces tapées", () => {
  assert.deepEqual(sanitizeBullets({ main: "  Tu sautes ta séance ?  ", points: ["- Nuit courte", "• ", "2. Flemme"], cta: "Commente 588" }), {
    main: "Tu sautes ta séance ?",
    points: ["Nuit courte", "Flemme"],
    cta: "Commente 588",
  });
});

test("sanitizeBullets renvoie null quand tout est vide ou invalide", () => {
  assert.equal(sanitizeBullets({ main: " ", points: [], cta: "" }), null);
  assert.equal(sanitizeBullets("texte"), null);
  assert.equal(sanitizeBullets(null), null);
});

test("pointsFromText : une ligne par point, au plus 12", () => {
  assert.deepEqual(pointsFromText("- un\n\n* deux\n3) trois"), ["un", "deux", "trois"]);
  assert.equal(pointsFromText(Array.from({ length: 20 }, (_, i) => `p${i}`).join("\n")).length, 12);
});

test("bulletsToText met le CTA à la fin", () => {
  assert.equal(bulletsToText({ main: "Idée", points: ["a", "b"], cta: "Abonne-toi" }), "Idée\n- a\n- b\n→ Abonne-toi");
  assert.equal(bulletsToText({ main: "Idée", points: [], cta: "" }), "Idée");
});
