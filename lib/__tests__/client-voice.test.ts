import { test } from "node:test";
import assert from "node:assert/strict";
import { anonymizeSnippet, groupVoice, isUsableSnippet, voiceMarkdown, type VoiceSnippet } from "../client-voice";

const s = (text: string, source: VoiceSnippet["source"] = "checkin"): VoiceSnippet => ({ source, kind: "question", text, at: "2026-11-18" });

test("anonymizeSnippet retire email, téléphone, lien et compte", () => {
  const out = anonymizeSnippet("écris-moi à lea.d@gmail.com ou au 06 12 34 56 78, voir www.site.fr et @lea_fit");
  assert.ok(!out.includes("gmail") && !out.includes("06 12") && !out.includes("site.fr") && !out.includes("lea_fit"));
  assert.ok(out.includes("[email]") && out.includes("[téléphone]"));
});

test("anonymizeSnippet coupe les textes trop longs", () => {
  assert.ok(anonymizeSnippet("a".repeat(500)).length <= 220);
});

test("les sujets de santé ne deviennent jamais du contenu", () => {
  assert.equal(isUsableSnippet("je crois que j'ai un trouble alimentaire, je me fais vomir"), false);
  assert.equal(isUsableSnippet("ok"), false);
  assert.equal(isUsableSnippet("j'ai mal au genou quand je fais des squats"), false);
  assert.equal(isUsableSnippet("je crois que je me suis blessée au dos"), false);
  assert.equal(isUsableSnippet("J'ose pas aller à la salle, j'ai peur du regard des mecs"), true);
});

test("groupVoice regroupe par thème, trie par fréquence, sans doublon d'exemple", () => {
  const themes = groupVoice([
    s("J'ai peur du regard des autres à la salle"),
    s("Je me sens jugée quand je vais à la salle", "candidature"),
    s("Mes fessiers ne grossissent pas malgré les squats ?", "message"),
    s("J'ai peur du regard des autres à la salle"),
    s("Je pense avoir un TCA, je ne mange plus"),
  ]);
  assert.equal(themes[0].id, "salle");
  assert.equal(themes[0].count, 3);
  assert.equal(themes[0].examples.length, 2);
  assert.ok(themes.some((t) => t.id === "fessiers"));
  assert.ok(!themes.some((t) => t.examples.some((e) => /TCA/.test(e.text))));
});

test("pas de faux thème : parcours, général", () => {
  const themes = groupVoice([s("Mon parcours en général a été long")]);
  assert.ok(!themes.some((t) => t.id === "temps" || t.id === "salle"));
});

test("voiceMarkdown n'invente rien quand il n'y a pas de phrase", () => {
  assert.match(voiceMarkdown([], 30, 0), /ne pas inventer/);
  assert.match(voiceMarkdown(groupVoice([s("Je tiens jamais plus de 2 semaines, je perds la motivation")]), 30, 1), /Tenir sur la durée/);
});

test("cleanReasons : anonyme, sans doublon, santé exclue", async () => {
  const { cleanReasons } = await import("../client-voice");
  const r = cleanReasons([
    { kind: "pourquoi toi", text: "Ta vidéo sur les fessiers, écris-moi lea@gmail.com" },
    { kind: "pourquoi toi", text: "Ta vidéo sur les fessiers, écris-moi lea@gmail.com" },
    { kind: "ce qui a donné envie", text: "j'ai un trouble alimentaire" },
    { kind: "ce qui a donné envie", text: null },
  ]);
  assert.equal(r.length, 1);
  assert.ok(!r[0].text.includes("gmail"));
});
