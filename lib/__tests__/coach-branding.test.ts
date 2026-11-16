import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeHex, brandCssVars, cleanBrandName, isAllowedLogo, hasBrand, luminance } from "../coach-branding";

test("couleur : format strict, sinon rien", () => {
  assert.equal(normalizeHex("#AABBCC"), "#aabbcc");
  assert.equal(normalizeHex("aabbcc"), "#aabbcc");
  assert.equal(normalizeHex("red"), null);
  assert.equal(normalizeHex("#abc"), null);
  assert.equal(brandCssVars("nope"), null);
});

test("variables CSS : la couleur du coach, éclaircie si trop sombre pour le fond", () => {
  const css = brandCssVars("#2f7bf6")!;
  assert.match(css, /--ep-accent: #2f7bf6 !important;/);
  assert.match(css, /--ep-accent-rgb: 47, 123, 246 !important;/);
  const dark = brandCssVars("#050505")!;
  const hex = dark.match(/--ep-accent: (#[0-9a-f]{6})/)![1];
  assert.ok(luminance(hex) >= 0.08);
  assert.ok(!css.includes("<") && !css.includes("}"));
});

test("nom, logo, présence d'une marque", () => {
  assert.equal(cleanBrandName("  Coaching   Léa  "), "Coaching Léa");
  assert.equal(cleanBrandName("x".repeat(60))!.length, 40);
  assert.equal(cleanBrandName(""), null);
  assert.equal(isAllowedLogo("image/png", 1000), true);
  assert.equal(isAllowedLogo("image/svg+xml", 1000), false);
  assert.equal(isAllowedLogo("image/png", 2_000_000), false);
  assert.equal(hasBrand({ name: null, color: null, logoUrl: null }), false);
  assert.equal(hasBrand({ name: "Léa", color: null, logoUrl: null }), true);
});
