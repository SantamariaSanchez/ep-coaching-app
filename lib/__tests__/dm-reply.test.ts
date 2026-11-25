import { test } from "node:test";
import assert from "node:assert/strict";
import { guideDmReply, openingQuestion, shortGuideLink } from "../dm-reply";
import { extractCtaKeywords } from "../cta-keywords";

test("shortGuideLink construit /g/NNN sans double barre", () => {
  assert.equal(shortGuideLink("https://ep-coaching.vercel.app/", "797"), "https://ep-coaching.vercel.app/g/797");
});

test("guideDmReply : le guide, le lien, une seule question", () => {
  const m = guideDmReply("Tu ne comprends rien aux machines de la salle", "https://x/g/797");
  assert.ok(m.includes("« Tu ne comprends rien aux machines de la salle »"));
  assert.ok(m.includes("https://x/g/797"));
  assert.equal((m.match(/\?/g) ?? []).length, 1);
  assert.ok(!/relance|offre|prix|places/i.test(m));
});

test("openingQuestion s'adapte au sujet du guide", () => {
  assert.match(openingQuestion("Ce qui freine ta perte de gras"), /perdre du gras/);
  assert.match(openingQuestion("Les machines de la salle"), /salle/);
  assert.match(openingQuestion("Un sujet sans mot clé"), /objectif/);
});

test("le numéro du CTA est bien lu pour retrouver le guide", () => {
  assert.deepEqual(extractCtaKeywords("Donc si t'es débutante, commente 797 et je t'envoie le guide."), ["797"]);
});
