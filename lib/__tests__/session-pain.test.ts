import test from "node:test";
import assert from "node:assert/strict";
import { PAIN_GUIDANCE, PAIN_NOTE, PAIN_RED_FLAGS } from "../session-pain";

test("douleur : orientation vers les urgences devant un signe grave", () => {
  assert.match(PAIN_RED_FLAGS, /poitrine/);
  assert.match(PAIN_RED_FLAGS, /15|112/);
});

test("douleur : jamais « force », jamais de diagnostic ni de date de reprise", () => {
  const all = [PAIN_RED_FLAGS, PAIN_GUIDANCE, PAIN_NOTE].join(" ");
  assert.match(PAIN_GUIDANCE, /ne force pas/);
  assert.doesNotMatch(all, /serre les dents|continue quand même|tendinite|déchirure|entorse|reprends dans/i);
  assert.doesNotMatch(all, /[—–]/);
  assert.match(PAIN_GUIDANCE, /professionnel de santé/);
});
