import test from "node:test";
import assert from "node:assert/strict";
import { cleanFeedback, shouldAskFeedback, summarizeFeedback, MOST_USEFUL_CHOICES } from "../app-feedback";

const NOW = new Date("2026-11-15T12:00:00Z");

test("on ne demande pas avant 3 jours, puis au plus tous les 60 jours", () => {
  assert.equal(shouldAskFeedback(null, null, NOW), false);
  assert.equal(shouldAskFeedback("2026-11-14T12:00:00Z", null, NOW), false);
  assert.equal(shouldAskFeedback("2026-11-10T12:00:00Z", null, NOW), true);
  assert.equal(shouldAskFeedback("2026-09-01T12:00:00Z", "2026-10-01T12:00:00Z", NOW), false);
  assert.equal(shouldAskFeedback("2026-06-01T12:00:00Z", "2026-09-01T12:00:00Z", NOW), true);
});

test("nettoyage : note obligatoire de 1 à 5, choix inconnu ignoré, texte borné", () => {
  assert.equal(cleanFeedback({ usefulness: 0, mostUseful: null, missing: "" }), null);
  assert.equal(cleanFeedback({ usefulness: "6", mostUseful: null, missing: "" }), null);
  assert.deepEqual(cleanFeedback({ usefulness: "4", mostUseful: "pirate", missing: "  " }), { usefulness: 4, most_useful: null, missing: null });
  assert.equal(cleanFeedback({ usefulness: 3, mostUseful: "seance", missing: "x".repeat(900) })!.missing!.length, 500);
});

test("résumé : moyenne, part des notes basses, ce qui sert le plus trié", () => {
  const rows = [
    { usefulness: 5, most_useful: "seance", missing: null, access_type: null, created_at: "2026-11-01" },
    { usefulness: 4, most_useful: "seance", missing: null, access_type: null, created_at: "2026-11-02" },
    { usefulness: 1, most_useful: "nutrition", missing: "x", access_type: null, created_at: "2026-11-03" },
  ];
  const s = summarizeFeedback(rows);
  assert.equal(s.count, 3);
  assert.equal(s.average, 3.3);
  assert.equal(s.lowShare, 33);
  assert.deepEqual(s.mostUseful.map((m) => m.id), ["seance", "nutrition"]);
  assert.equal(summarizeFeedback([]).average, null);
});

test("libellés sans tiret cadratin", () => {
  assert.doesNotMatch(MOST_USEFUL_CHOICES.map((c) => c.label).join(" "), /[—–]/);
});
