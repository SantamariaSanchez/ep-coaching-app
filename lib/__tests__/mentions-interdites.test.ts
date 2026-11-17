import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// Règle d'Emmanuel (17/11/2026) : jamais « fédération naturelle testée », « naturel testé »,
// « athlète naturel », « bodybuilding natural » ni la WNBF dans l'appli (textes, modèles,
// consignes des assistants). Ce test empêche qu'elles reviennent.
const INTERDIT = /f[ée]d[ée]ration naturelle test[ée]e|naturel(?:le)? test[ée]e?|athl[èe]te naturel|bodybuilding natural|\bWNBF\b/i;

function fichiers(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return n === "__tests__" || n === "node_modules" ? [] : fichiers(p);
    return /\.(ts|tsx)$/.test(n) ? [p] : [];
  });
}

test("aucune mention interdite dans app, components et lib", () => {
  const fautes = ["app", "components", "lib"].flatMap(fichiers).filter((p) => INTERDIT.test(readFileSync(p, "utf8")));
  assert.deepEqual(fautes, []);
});
