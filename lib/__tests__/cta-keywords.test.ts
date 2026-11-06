import test from "node:test";
import assert from "node:assert/strict";
import { ctaKeywordWarning, extractCtaKeywords, findUnknownCtaKeywords } from "../cta-keywords";

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
