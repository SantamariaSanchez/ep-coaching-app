import test from "node:test";
import assert from "node:assert/strict";
import { computeCadence } from "../content-cadence";
import { CONTENT_TARGET_KEYS, cleanProductionTime, cleanTargets, progressByTarget, reelsFromTime, targetsFromAnswers, targetsSummary } from "../content-targets";

// Exemple : la journée qu'Emmanuel a décrite le 15/11 (pas un défaut du code).
const PRODUCTION_DAY = {
  filmingMinutes: 240, editingMinutes: 240, reelMinutes: 5, youtubeMinutes: 120, youtubePerDay: 1,
  youtubeClipsPerDay: 30, shortVideoPlatforms: ["Instagram Reels", "TikTok", "YouTube Shorts", "Facebook Reels", "Threads"],
};
const WRITTEN_DAILY_TARGETS = { story_insta: 50, story_facebook: 50, post_insta: 25, relais: 50, linkedin: 50, mails: 10 };
import { CONTENT_FORMATS, VIDEO_CONTENT_FORMATS, parseScript, parseSticker } from "../content-formats";
import {
  checkWrittenPost, copyText, countByPlatform, defaultFormatFor, effectiveFormat, foldPreview,
  formatsForPlatform, isFormatAllowed, isWrittenPlatform, storyFrames, writtenPromptRules, WRITTEN_PLATFORMS,
} from "../written-content";

// ── Cadence ─────────────────────────────────────────────────────────────

test("cadence : 8 h de production, YouTube 2 h, reel 5 min → 72 reels par jour", () => {
  const c = computeCadence(PRODUCTION_DAY, WRITTEN_DAILY_TARGETS);
  assert.equal(c.reelsPerDay, 72);
  assert.equal(c.shortVideosPerDay, 72 + PRODUCTION_DAY.youtubeClipsPerDay);
  assert.equal(c.shortPostsPerDay, (72 + PRODUCTION_DAY.youtubeClipsPerDay) * 5);
  const written = Object.values(WRITTEN_DAILY_TARGETS).reduce((a, b) => a + b, 0);
  assert.equal(c.writtenPerDay, written);
  assert.equal(c.totalPerDay, c.shortPostsPerDay + 1 + written);
  assert.equal(c.totalPer30Days, c.totalPerDay * 30);
});

test("cadence : jamais négative ni infinie", () => {
  const c = computeCadence({ ...PRODUCTION_DAY, filmingMinutes: 30, editingMinutes: 30 }, {});
  assert.equal(c.reelsPerDay, 0);
  assert.equal(computeCadence({ ...PRODUCTION_DAY, reelMinutes: 0 }, {}).reelsPerDay, 0);
});

// ── Formats par plateforme ──────────────────────────────────────────────

test("les formats écrits ne sont jamais proposés pour un reel", () => {
  const ids = VIDEO_CONTENT_FORMATS.map((f) => f.id);
  for (const id of ["sequence_stories", "image_unique", "post_texte", "carrousel"]) assert.ok(!ids.includes(id), id);
  assert.ok(ids.includes("face_cam"));
  assert.deepEqual(formatsForPlatform("reel").map((f) => f.id), ids);
});

test("chaque plateforme écrite n'a que des formats qui existent et qui la permettent", () => {
  for (const w of WRITTEN_PLATFORMS) {
    assert.ok(w.formats.includes(w.defaultFormat), w.id);
    for (const id of w.formats) {
      const f = CONTENT_FORMATS.find((x) => x.id === id);
      assert.ok(f, `${w.id} → ${id}`);
      assert.ok(f!.onlyFor?.includes(w.id), `${id} doit permettre ${w.id}`);
      assert.equal(f!.filmed, false);
    }
  }
  assert.deepEqual(formatsForPlatform("story_insta").map((f) => f.id), ["sequence_stories"]);
  assert.ok(isFormatAllowed("post_insta", "carrousel"));
  assert.ok(!isFormatAllowed("story_insta", "face_cam"));
  assert.ok(isWrittenPlatform("post_insta") && !isWrittenPlatform("reel"));
});

test("format par défaut : garde le format courant s'il est permis, sinon celui de la plateforme", () => {
  assert.equal(defaultFormatFor("story_insta", "face_cam"), "sequence_stories");
  assert.equal(defaultFormatFor("post_insta", "image_unique"), "image_unique");
  assert.equal(defaultFormatFor("reel", "sequence_stories"), "face_cam");
  assert.equal(defaultFormatFor("youtube", "yap"), "yap");
});

test("anciens posts LinkedIn en « face caméra » : lus comme un post texte", () => {
  assert.equal(effectiveFormat("linkedin", "face_cam"), "post_texte");
  assert.equal(effectiveFormat("linkedin", null), "post_texte");
  assert.equal(effectiveFormat("linkedin", "carrousel"), "carrousel");
  assert.equal(effectiveFormat("reel", "yap"), "yap");
});

// ── Séquence de stories ─────────────────────────────────────────────────

const SEQ = `Story 1 : Je mange 5 fois par jour et je sèche quand même.
Visuel : mon assiette de 10 h

Story 2 : Le problème n'a jamais été le nombre de repas.
Visuel : écran de l'appli, macros du jour
la suite sur deux lignes

Story 3 : Et toi ?
Sticker : sondage | 3 repas / 5 repas

Story 4 : Le guide complet est ici
Lien : https://ep-coaching.vercel.app/guides/repas

Story 5 : Demain je montre ma journée entière.`;

test("séquence : chaque story avec son visuel, son sticker et son lien", () => {
  const parsed = parseScript("sequence_stories", SEQ);
  assert.equal(parsed.shape, "frames");
  if (parsed.shape !== "frames") return;
  assert.equal(parsed.frames.length, 5);
  assert.equal(parsed.frames[0].visuel, "mon assiette de 10 h");
  assert.equal(parsed.frames[1].visuel, "écran de l'appli, macros du jour\nla suite sur deux lignes");
  assert.deepEqual(parsed.frames[2].sticker, { kind: "sondage", detail: "3 repas / 5 repas" });
  assert.equal(parsed.frames[3].lien, "https://ep-coaching.vercel.app/guides/repas");
  assert.equal(parsed.frames[4].sticker, null);
});

test("séquence : « Sondage : ... » direct et sticker inconnu gardé tel quel", () => {
  const frames = storyFrames("sequence_stories", "Story 1 : a\nSondage : Oui / Non\nStory 2 : b\nSticker : compte à rebours vendredi");
  assert.deepEqual(frames[0].sticker, { kind: "sondage", detail: "Oui / Non" });
  assert.deepEqual(frames[1].sticker, { kind: "autre", detail: "compte à rebours vendredi" });
  assert.deepEqual(parseSticker("curseur"), { kind: "curseur", detail: "" });
  assert.equal(parseSticker("  "), null);
});

test("séquence sans « Story N » : retombe sur le texte brut, rien ne casse", () => {
  assert.equal(parseScript("sequence_stories", "juste un texte").shape, "texte");
});

// ── Contrôles ───────────────────────────────────────────────────────────

const messages = (p: Parameters<typeof checkWrittenPost>[0]) => checkWrittenPost(p).map((c) => c.message).join(" | ");

test("story : séquence propre, aucun avertissement", () => {
  assert.deepEqual(checkWrittenPost({ platform: "story_insta", content_format: "sequence_stories", content: SEQ }), []);
});

test("story : pas d'interaction et lien en dernière story signalés", () => {
  const m = messages({ platform: "story_insta", content_format: "sequence_stories", content: "Story 1 : a\nStory 2 : b\nStory 3 : c\nLien : https://x.fr" });
  assert.match(m, /Aucun sondage/);
  assert.match(m, /dernière story/);
});

test("LinkedIn : tiret cadratin, lien en bio, puces et longueur signalés", () => {
  const long = "a".repeat(3001);
  const m = messages({ platform: "linkedin", content_format: "post_texte", content: `Tu manges trop peu — voilà.\n- un\n- deux\nLien en bio\n${long}` });
  assert.match(m, /cadratin/);
  assert.match(m, /Lien en bio/i);
  assert.match(m, /puces/);
  assert.match(m, /3000/);
});

test("LinkedIn : un post court et propre passe", () => {
  assert.deepEqual(checkWrittenPost({ platform: "linkedin", content_format: "post_texte", content: "Tu ne manques pas de motivation.\n\nTu manques d'un plan.\n\nTu commences par quoi ?" }), []);
});

test("post Insta : légende manquante et slide trop chargée signalées", () => {
  const slide = Array.from({ length: 30 }, (_, i) => `mot${i}`).join(" ");
  const m = messages({ platform: "post_insta", content_format: "carrousel", content: `Slide 1 : accroche\nSlide 2 : ${slide}`, instagram_caption: "" });
  assert.match(m, /légende/);
  assert.match(m, /25 mots/);
});

test("post Insta : légende copiée en priorité, contenu sinon", () => {
  assert.equal(copyText({ platform: "post_insta", content: "Slide 1 : a", instagram_caption: " La légende " }), "La légende");
  assert.equal(copyText({ platform: "linkedin", content: " Le post " }), "Le post");
});

test("plateforme non écrite : aucun contrôle", () => {
  assert.deepEqual(checkWrittenPost({ platform: "reel", content_format: "face_cam", content: "a — b" }), []);
});

// ── Utilitaires ─────────────────────────────────────────────────────────

test("aperçu avant « voir plus » : coupé au dernier espace", () => {
  assert.deepEqual(foldPreview("court", 210), { visible: "court", cut: false });
  const r = foldPreview("mot ".repeat(100), 210);
  assert.ok(r.cut && r.visible.length <= 210 && !r.visible.endsWith(" "));
});

test("règles du générateur : présentes pour chaque plateforme écrite, absentes pour un reel", () => {
  for (const w of WRITTEN_PLATFORMS) assert.ok(writtenPromptRules(w.id));
  assert.equal(writtenPromptRules("reel"), null);
  assert.match(writtenPromptRules("story_insta")!, /une seule idée/i);
  assert.doesNotMatch(WRITTEN_PLATFORMS.map((w) => writtenPromptRules(w.id)).join(" "), /[—–]/);
});

test("compte du jour par plateforme", () => {
  assert.deepEqual(countByPlatform([{ platform: "linkedin" }, { platform: "linkedin" }, { platform: "story_insta" }, { platform: null }]), { linkedin: 2, story_insta: 1 });
});

test("aucun tiret cadratin dans les nouveaux formats", () => {
  for (const id of ["post_texte", "image_unique", "sequence_stories"]) {
    const f = CONTENT_FORMATS.find((x) => x.id === id)!;
    assert.doesNotMatch([f.description, f.shapeHint, f.template, f.rule ?? "", ...f.structure, ...f.tips].join(" "), /[—–]/, id);
  }
});

// ── Objectifs réglés par le coach ───────────────────────────────────────

test("objectifs : aucun défaut, clés inconnues et valeurs absurdes écartées", () => {
  assert.deepEqual(targetsFromAnswers({}), {});
  assert.deepEqual(targetsFromAnswers(null), {});
  assert.deepEqual(cleanTargets({ reel: "72", linkedin: 50.4, story_insta: -3, threads: 0, inconnu: 9, post_insta: 99999 }), { reel: 72, linkedin: 50, post_insta: 500 });
  assert.deepEqual(cleanTargets("n'importe quoi"), {});
  assert.ok(CONTENT_TARGET_KEYS.includes("story_insta"));
});

test("temps de production : calcul des reels proposés", () => {
  const t = cleanProductionTime({ filmingMinutes: 240, editingMinutes: 240, reelMinutes: 5, youtubeMinutes: 120, youtubePerDay: 1 })!;
  assert.equal(reelsFromTime(t), 72);
  assert.equal(cleanProductionTime({}), null);
  assert.equal(reelsFromTime({ ...t, reelMinutes: 0 }), 0);
});

test("progression : un reel posté depuis l'ancienne plateforme instagram compte comme reel", () => {
  const p = progressByTarget({ reel: 3, instagram: 1, linkedin: 2 });
  assert.equal(p.reel, 4);
  assert.equal(p.linkedin, 2);
  assert.equal(p.youtube, 0);
});

test("résumé pour le connecteur : ce qui manque, sans tiret cadratin", () => {
  const txt = targetsSummary({ linkedin: 50 }, { linkedin: 10 }, { linkedin: 5 });
  assert.match(txt, /Posts LinkedIn : objectif 50 par jour, publié aujourd'hui 10, en stock 5, il en manque 35/);
  assert.match(txt, /Reels : pas d'objectif fixé/);
  assert.doesNotMatch(txt, /[—–]/);
});
