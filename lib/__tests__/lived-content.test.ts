import { test } from "node:test";
import assert from "node:assert/strict";
import { composeWeeklyNote, hasLivedMarker, ideaFromLivedNote, isLivedNote, isoWeekKey, looksLived, withLivedTag, WEEKLY_QUESTIONS } from "../lived-content";

test("isLivedNote reconnaît les tags vécu", () => {
  assert.equal(isLivedNote(["vécu"]), true);
  assert.equal(isLivedNote(["Anecdote"]), true);
  assert.equal(isLivedNote(["script"]), false);
  assert.equal(isLivedNote(null), false);
});

test("looksLived : récit daté à la première personne seulement", () => {
  assert.equal(looksLived("Aujourd'hui j'ai tourné trois reels et un client m'a écrit qu'il avait perdu 2 kg, j'étais content."), true);
  assert.equal(looksLived("Idée : parler du déficit calorique dans un reel."), false);
  assert.equal(looksLived("todo appeler le comptable aujourd'hui j'ai oublié"), false);
  assert.equal(looksLived("https://exemple.fr/page"), false);
});

test("withLivedTag n'ajoute le tag qu'une fois", () => {
  const t = "Hier j'ai fait mon tournage du matin, on a eu un problème de micro et j'ai tout refait en une heure.";
  assert.deepEqual(withLivedTag(t, []), ["vécu"]);
  assert.deepEqual(withLivedTag(t, ["vécu"]), ["vécu"]);
});

test("isoWeekKey", () => {
  assert.equal(isoWeekKey(new Date(2026, 9, 29)), "2026-W44");
});

test("composeWeeklyNote : seulement les réponses données, rien d'inventé", () => {
  assert.equal(composeWeeklyNote({ marquant: "   " }), null);
  const n = composeWeeklyNote({ marquant: "Un client a craqué en séance." }, new Date(2026, 9, 29));
  assert.ok(n);
  assert.ok(n.text.includes("Un client a craqué en séance."));
  assert.ok(n.tags.includes("vécu"));
  for (const q of WEEKLY_QUESTIONS.slice(1)) assert.ok(!n.text.includes(q.label));
});

test("ideaFromLivedNote reprend le texte tel quel et se dédoublonne", () => {
  const note = { id: "abc", title: "Ma semaine 2026-W44", body: "Un client a craqué en séance. #vécu", tags: ["vécu"], created_at: "2026-10-29" };
  const idea = ideaFromLivedNote(note);
  assert.ok(idea.notes.includes("Un client a craqué en séance."));
  assert.ok(!idea.notes.includes("#vécu"));
  assert.equal(hasLivedMarker(idea.notes, "abc"), true);
  assert.equal(hasLivedMarker(idea.notes, "autre"), false);
  assert.equal(idea.content_format, "storytelling");
});
