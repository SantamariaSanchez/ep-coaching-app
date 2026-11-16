import { test } from "node:test";
import assert from "node:assert/strict";
import { POST_TEMPLATES, templatesFor, unfilledLines, titleFromPost } from "../post-templates";
import { checkWrittenPost } from "../written-content";

test("chaque réseau texte a au moins deux structures", () => {
  assert.ok(templatesFor("linkedin").length >= 2);
  assert.ok(templatesFor("threads").length >= 2);
  assert.equal(templatesFor("story_insta").length, 0);
});

test("une structure se remplit : les crochets restants sont comptés", () => {
  for (const tpl of POST_TEMPLATES) {
    assert.ok(unfilledLines(tpl.skeleton) >= 3, tpl.id);
    assert.ok(!tpl.skeleton.includes("—"), tpl.id);
    // Une structure vierge reste sous la limite de chaque réseau visé.
    for (const p of tpl.platforms) {
      const errs = checkWrittenPost({ platform: p, content_format: "post_texte", content: tpl.skeleton, instagram_caption: null }).filter((c) => c.level === "erreur");
      assert.equal(errs.length, 0, `${tpl.id} ${p}`);
    }
  }
  assert.equal(unfilledLines("Un vrai texte, sans crochets."), 0);
});

test("titre de rangement : la 1re ligne, coupée proprement", () => {
  assert.equal(titleFromPost("\n\n« Pas de glucides le soir »\nsuite"), "Pas de glucides le soir");
  assert.ok(titleFromPost("a".repeat(120)).length <= 80);
  assert.equal(titleFromPost("   "), "Post sans titre");
});
