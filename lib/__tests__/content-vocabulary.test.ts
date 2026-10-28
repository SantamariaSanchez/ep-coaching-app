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
