import test from "node:test";
import assert from "node:assert/strict";
import { ctaGuideRecap, ctaKeywordWarning, extractCtaKeywords, findUnknownCtaKeywords, isCoachOrientedGuide } from "../cta-keywords";

test("extractCtaKeywords reconnaît les numéros de guide et les mots en capitales", () => {
  assert.deepEqual(extractCtaKeywords("Si tu veux la checklist, commente 088 et je te l'envoie."), ["088"]);
  assert.deepEqual(extractCtaKeywords("commente APPLI et je t'envoie ton accès"), ["APPLI"]);
  assert.deepEqual(extractCtaKeywords("Commente « COACHING » pour en parler"), ["COACHING"]);
  assert.deepEqual(extractCtaKeywords("commentez le mot PROG"), ["PROG"]);
});

test("extractCtaKeywords ignore les mots ordinaires, le texte vide et les doublons", () => {
  assert.deepEqual(extractCtaKeywords("commente ci-dessous ce que tu en penses"), []);
  assert.deepEqual(extractCtaKeywords("commente 7"), []);
  assert.deepEqual(extractCtaKeywords(null), []);
  assert.deepEqual(extractCtaKeywords("commente 088 ... commente 088"), ["088"]);
});

test("findUnknownCtaKeywords laisse passer un guide connu et les mots logiques", async () => {
  const known = async (k: string) => k === "088";
  assert.deepEqual(await findUnknownCtaKeywords("commente 088 puis commente APPLI", known), []);
});

test("findUnknownCtaKeywords signale un mot-clé sans guide", async () => {
  const known = async (k: string) => k === "088";
  assert.deepEqual(await findUnknownCtaKeywords("commente PROG et je t'envoie", known), ["PROG"]);
  assert.deepEqual(await findUnknownCtaKeywords("commente 999", known), ["999"]);
});

test("ctaKeywordWarning formule un avertissement lisible", () => {
  assert.equal(ctaKeywordWarning([]), "");
  assert.match(ctaKeywordWarning(["PROG"]), /PROG/);
});

test("ctaGuideRecap rappelle le titre du guide cité", async () => {
  const titles: Record<string, string> = { "727": "Tes séries d'échauffement" };
  const recap = await ctaGuideRecap("commente 727 et je t'envoie le guide", async (k) => titles[k] ?? null);
  assert.match(recap, /Guide cité : 727 « Tes séries d'échauffement »/);
  assert.doesNotMatch(recap, /coachs/);
});

test("ctaGuideRecap alerte sur un guide pour coachs dans un contenu pour clientes", async () => {
  const titles: Record<string, string> = { "123": "Ta marque de coach, c'est toi, avant d'être un logo" };
  const lookup = async (k: string) => titles[k] ?? null;
  assert.match(await ctaGuideRecap("commente 123", lookup), /s'adresse aux coachs/);
  assert.doesNotMatch(await ctaGuideRecap("commente 123", lookup, "coachs"), /s'adresse aux coachs/);
});

test("ctaGuideRecap garde l'alerte des numéros inconnus et ignore APPLI", async () => {
  const recap = await ctaGuideRecap("commente 999 puis commente APPLI", async () => null);
  assert.match(recap, /999 ne correspond à aucun guide/);
  assert.doesNotMatch(recap, /APPLI ne correspond/);
});

test("isCoachOrientedGuide ne confond pas coach et coaching", () => {
  assert.equal(isCoachOrientedGuide("Le syndrome de l'imposteur du coach qui débute"), true);
  assert.equal(isCoachOrientedGuide("Ce qu'il faut savoir avant ta toute première séance de coaching"), false);
});
