import test from "node:test";
import assert from "node:assert/strict";
import { postRates, readPost, readAll, bestGroups, type PostNumbers } from "../social/post-insights";
import { checkVocabulary } from "../content-vocabulary";

const P = (o: Partial<PostNumbers>): PostNumbers => ({
  views: null,
  reach: null,
  likes: null,
  comments: null,
  shares: null,
  saves: null,
  new_followers: null,
  avg_watch_seconds: null,
  duration_seconds: null,
  completion_rate: null,
  ...o,
});

const usual = [
  P({ views: 1000, shares: 10, saves: 10, comments: 5, likes: 50 }),
  P({ views: 1200, shares: 12, saves: 11, comments: 6, likes: 60 }),
  P({ views: 900, shares: 9, saves: 9, comments: 4, likes: 45 }),
  P({ views: 1100, shares: 11, saves: 12, comments: 5, likes: 55 }),
];

test("taux rapportés aux vues, rétention depuis le temps regardé", () => {
  const r = postRates(P({ views: 1000, shares: 20, avg_watch_seconds: 15, duration_seconds: 30 }));
  assert.equal(r.partages, 0.02);
  assert.equal(r.retention, 0.5);
  assert.equal(postRates(P({ completion_rate: 40 })).retention, 0.4);
});

test("pas assez de publications : aucune comparaison inventée", () => {
  const r = readPost(P({ views: 5000, shares: 200 }), usual.slice(0, 2));
  assert.equal(r.verdict, "pas_assez");
  assert.equal(r.score, null);
  assert.deepEqual(r.howTo, []);
});

test("publication très partagée et enregistrée : à refaire, avec des pistes concrètes", () => {
  const r = readPost(P({ views: 1000, shares: 40, saves: 35, comments: 5, likes: 50 }), usual);
  assert.equal(r.verdict, "a_refaire");
  assert.deepEqual(r.strengths.slice(0, 2).sort(), ["enregistrements", "partages"]);
  assert.ok(r.howTo.length >= 2);
});

test("publication faible : en dessous, avec un point à corriger", () => {
  const r = readPost(P({ views: 1000, shares: 2, saves: 2, comments: 1, likes: 20 }), usual);
  assert.equal(r.verdict, "en_dessous");
  assert.ok(r.weaknesses.includes("partages"));
  assert.ok(r.howTo.length > 0);
});

test("ce qui marche chez toi : groupes d'au moins 2, triés", () => {
  const all = [...usual, P({ views: 1000, shares: 40, saves: 40, comments: 5, likes: 50 }), P({ views: 1000, shares: 35, saves: 30, comments: 6, likes: 55 })];
  const read = readAll(all);
  const keys = ["face_cam", "face_cam", "face_cam", "face_cam", "liste", "liste"];
  const groups = bestGroups(read.map((r, i) => ({ key: keys[i], reading: r.reading })));
  assert.equal(groups[0].key, "liste");
  assert.equal(groups[0].count, 2);
});

test("les conseils respectent le vocabulaire EP Coaching", () => {
  const r1 = readPost(P({ views: 5000, shares: 40, saves: 1, comments: 0, likes: 50, completion_rate: 5, new_followers: 30 }), [
    ...usual.map((u) => ({ ...u, completion_rate: 30, new_followers: 2 })),
  ]);
  for (const t of r1.howTo) assert.deepEqual(checkVocabulary(t), [], t);
});

test("peu de vues : on garde le format et on ne change que le hook", () => {
  const r = readPost(P({ views: 200, shares: 2, saves: 2, comments: 1, likes: 10 }), usual);
  assert.ok(r.weaknesses.includes("vues"));
  assert.ok(r.howTo.some((t) => /hook/.test(t) && /format/.test(t)));
});
