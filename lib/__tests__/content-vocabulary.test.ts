import test from "node:test";
import assert from "node:assert/strict";
import { checkVocabulary, usesVous, SCRIPT_VOICE_NOTES, VOCABULARY_PROMPT_BLOCK, DICTIONARY_HOOKS } from "../content-vocabulary";

test("vocabulaire : adhésion, Road map, jamais de chapitre ni de timecode", () => {
  const found = (txt: string) => checkVocabulary(txt).map((i) => i.found.toLowerCase());
  assert.ok(found("Ton adhérence au plan").includes("adhérence"));
  assert.ok(found("Ta Trajectoire commence lundi").includes("trajectoire"));
  assert.ok(found("[CHAPITRE 2 : le déficit]").length > 0);
  assert.ok(found("Ajoute des timecodes dans la description").includes("timecodes"));
  assert.deepEqual(found("Ton adhésion au plan et ta Road map décident."), []);
});

test("vocabulaire : les mots bannis du dictionnaire sont signalés", () => {
  const found = checkVocabulary("Une accroche, un palier, ton framework et un lead magnet").map((i) => i.found.toLowerCase());
  for (const w of ["accroche", "palier", "framework", "lead magnet"]) assert.ok(found.includes(w), w);
});

test("vocabulaire : tutoiement et blocs de prompt sans chapitre ni scène inventée", () => {
  assert.equal(usesVous("Vous allez voir"), true);
  assert.equal(usesVous("Tu vas voir"), false);
  assert.match(SCRIPT_VOICE_NOTES, /AUCUN chapitre/);
  assert.match(VOCABULARY_PROMPT_BLOCK, /adhérence/);
  assert.ok(DICTIONARY_HOOKS.every((h) => !/[—–]/.test(h)));
});

test("bibliothèque du Studio : hooks et prompts sans mot banni, sans tiret, sans chapitre", async () => {
  const { HOOK_BANK, CONTENT_PROMPTS } = await import("../content-library");
  // Les hooks et prompts peuvent citer un mot banni pour l'interdire (ex. « jamais de chapitres »).
  const hooks = HOOK_BANK.map((h) => h.text);
  for (const t of hooks) {
    assert.deepEqual(checkVocabulary(t), [], t);
    assert.ok(!/[—–]/.test(t), t);
  }
  for (const p of CONTENT_PROMPTS) assert.ok(!/[—–]/.test(p.prompt), p.title);
  const categories = new Set(HOOK_BANK.map((h) => h.category));
  for (const c of ["Calcul", "Vrai ou faux", "Mythe démonté", "Titre YouTube"]) assert.ok(categories.has(c), c);
});

test("bibliothèque du Studio : prompts « outil comme moyen » et hooks testés", async () => {
  const { CONTENT_PROMPTS } = await import("../content-library");
  const byTitle = (t: string) => CONTENT_PROMPTS.find((p) => p.title === t)?.prompt ?? "";
  assert.match(byTitle("Montrer mon outil sans parler de l'outil (4 formats)"), /avant 20 secondes/);
  assert.match(byTitle("Montrer mon outil sans parler de l'outil (4 formats)"), /jamais dans le texte/);
  assert.match(byTitle("Tester 10 hooks sur un format qui marche"), /3 premières secondes/);
  assert.match(byTitle("Surfer sur une actualité"), /à vérifier/);
});

test("bibliothèque du Studio : revue hebdomadaire et matrice sans rien inventer (C58)", async () => {
  const { CONTENT_PROMPTS } = await import("../content-library");
  const byTitle = (n: string) => CONTENT_PROMPTS.find((p) => p.title === n)?.prompt ?? "";
  assert.match(byTitle("Revue hebdomadaire courte des tests de contenu"), /visibilité/);
  assert.match(byTitle("Revue hebdomadaire courte des tests de contenu"), /Ne conclus rien sur une seule publication/);
  assert.match(byTitle("Matrice sujet, angle, format et appel à l'action"), /aucun témoignage ni aucun résultat inventé/);
});
