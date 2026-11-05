import test from "node:test";
import assert from "node:assert/strict";
import { diagnosticSystemPrompt } from "../diagnostic-prompt";
import { NUTRITION_RULES } from "../coaching-knowledge";

test("le diagnostic public reprend les garde-fous : pas de calories, pas de jugement, pas de diagnostic", () => {
  const p = diagnosticSystemPrompt();
  assert.match(p, /jamais de chiffre de calories/);
  assert.match(p, /ne juges pas/);
  assert.match(p, /ne diagnostiques rien/);
  assert.match(p, /professionnel de santé/);
  assert.match(p, /adhésion/);
});

test("les repères chiffrés viennent de la source de vérité, sans valeur recopiée à la main", () => {
  const p = diagnosticSystemPrompt();
  assert.match(p, new RegExp(`${String(NUTRITION_RULES.proteinGPerKg.min).replace(".", ",")} à ${String(NUTRITION_RULES.proteinGPerKg.max).replace(".", ",")} g par kg`));
  assert.match(p, new RegExp(`${Math.round(NUTRITION_RULES.surplusPct.min * 100)} à ${Math.round(NUTRITION_RULES.surplusPct.max * 100)} %`));
});
