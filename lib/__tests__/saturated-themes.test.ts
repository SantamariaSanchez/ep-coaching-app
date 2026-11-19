import { test } from "node:test";
import assert from "node:assert/strict";
import { findSaturatedThemes, subjectText, saturatedRefusal } from "../saturated-themes";

const recent = [
  subjectText("Ta balance te ment", "Tu montes sur la balance ce matin…", ""),
  subjectText("Le poids qui bouge", "Tu te pèses tous les jours ?", ""),
  subjectText("Ta première séance", "Tu arrives à la salle", "Commence par la presse à cuisses."),
];

test("un thème déjà présent 2 fois sur les récents est refusé", () => {
  const found = findSaturatedThemes(subjectText("Pourquoi ta balance monte", "", ""), recent);
  assert.equal(found.length, 1);
  assert.equal(found[0].theme.id, "balance");
  assert.equal(found[0].count, 2);
  assert.match(saturatedRefusal(found), /Rien n'a été enregistré/);
});

test("un sujet neuf passe, et un thème vu une seule fois aussi", () => {
  assert.deepEqual(findSaturatedThemes(subjectText("La machine à fessiers que personne n'utilise", "", ""), recent), []);
  const once = [subjectText("Ton squat", "", ""), ...recent];
  assert.deepEqual(findSaturatedThemes(subjectText("Le squat n'est pas obligatoire", "", ""), once), []);
});

test("changer de programme, logbook, développé couché sont repérés ; squat bulgare non", () => {
  const r = [subjectText("Tu changes de programme toutes les deux semaines", "", ""), subjectText("Arrête de changer ton programme", "", "")];
  assert.equal(findSaturatedThemes("Pourquoi tu changes de programme", r)[0].theme.id, "changer_programme");
  const l = [subjectText("Ton logbook", "", ""), subjectText("Le logbook", "", "")];
  assert.equal(findSaturatedThemes("Note ça dans ton logbook", l)[0].theme.id, "logbook");
  const s = [subjectText("Squat", "", ""), subjectText("Développé couché", "", "")];
  assert.equal(findSaturatedThemes("Le développé couché pour débuter", s)[0].theme.id, "squat_dc");
  assert.deepEqual(findSaturatedThemes("Le squat bulgare sur une marche", s), []);
});

test("seule la fenêtre récente compte", () => {
  const old = [subjectText("a", "", ""), subjectText("b", "", ""), subjectText("balance", "", ""), subjectText("balance", "", "")];
  assert.deepEqual(findSaturatedThemes("ta balance", old, 2), []);
});

test("formes répétées : 3e fin « commente » ou 3e titre à deux-points d'affilée", async () => {
  const { findRepeatedForms, repeatedFormsRefusal } = await import("../saturated-themes");
  const c = { title: "Ta première séance", content: "… Commente SALLE et je t'envoie le guide." };
  const colon = { title: "Hip thrust : tu sens tout sauf tes fessiers", content: "… Abonne-toi." };
  assert.equal(findRepeatedForms(c, [c, c]).length, 1);
  assert.match(repeatedFormsRefusal(findRepeatedForms(c, [c, c])), /Rien n'a été enregistré/);
  assert.deepEqual(findRepeatedForms(c, [c, colon]), []);
  assert.deepEqual(findRepeatedForms(c, [c]), []);
  assert.equal(findRepeatedForms(colon, [colon, colon]).length, 1);
  assert.deepEqual(findRepeatedForms({ title: "Pourquoi tu sens tes cuisses et pas tes fessiers", content: "Abonne-toi." }, [colon, colon]), []);
});
