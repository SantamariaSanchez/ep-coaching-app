import test from "node:test";
import assert from "node:assert/strict";
import { claudeFormatRefusal } from "../claude-writing-policy";

test("reel et YouTube : face caméra seulement", () => {
  assert.equal(claudeFormatRefusal("reel", "face_cam"), null);
  assert.equal(claudeFormatRefusal("reel", null), null);
  assert.equal(claudeFormatRefusal("youtube", "face_cam"), null);
  assert.match(claudeFormatRefusal("reel", "tier_list") ?? "", /face caméra/);
  assert.match(claudeFormatRefusal("youtube", "broll_voix_off") ?? "", /face caméra/);
});

test("plus aucun carrousel ni format Instagram écrit", () => {
  assert.match(claudeFormatRefusal("linkedin", "carrousel") ?? "", /carrousel/);
  assert.match(claudeFormatRefusal("post_insta", "carrousel") ?? "", /arrêtés/);
  assert.match(claudeFormatRefusal("story_insta", "sequence_stories") ?? "", /arrêtés/);
  assert.match(claudeFormatRefusal("threads", "post_texte") ?? "", /arrêtés/);
});

test("LinkedIn reste en post texte", () => {
  assert.equal(claudeFormatRefusal("linkedin", "post_texte"), null);
  assert.equal(claudeFormatRefusal("linkedin", null), null);
});
