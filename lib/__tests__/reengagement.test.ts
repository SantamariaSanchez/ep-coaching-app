import { test } from "node:test";
import assert from "node:assert/strict";
import { buildMessage, categoryForGoal, categoryForPrimaryGoal, pickGuide, REENGAGEMENT_STEPS } from "../reengagement";
import { FREE_TIER_DAYS, INACTIVITY_DELETE_DAYS } from "../free-tier";

test("categoryForGoal : objectif écrit par le membre", () => {
  assert.equal(categoryForGoal(null), "Général");
  assert.equal(categoryForGoal("  "), "Général");
  assert.equal(categoryForGoal("Perdre 4 kg d'ici février"), "Nutrition");
  assert.equal(categoryForGoal("Prendre du muscle"), "Entraînement");
  assert.equal(categoryForGoal("Mieux dormir"), "Récupération");
  assert.equal(categoryForGoal("Retrouver de la discipline"), "Psychologie");
  assert.equal(categoryForGoal("Voyager"), "Général");
  assert.equal(categoryForPrimaryGoal("perte_poids"), "Nutrition");
  assert.equal(categoryForPrimaryGoal(null), "Général");
});

test("pickGuide : déterministe, différent d'une étape à l'autre", () => {
  const guides = Array.from({ length: 7 }, (_, i) => ({ slug: `g${i}`, title: `G${i}`, hook: null }));
  assert.equal(pickGuide([], "abc", 1), null);
  assert.equal(pickGuide(guides, "client-1", 2)?.slug, pickGuide(guides, "client-1", 2)?.slug);
  const picked = new Set([1, 2, 3, 4, 5].map((s) => pickGuide(guides, "client-1", s)?.slug));
  assert.ok(picked.size > 1);
});

const ctx = { firstName: "Léa", goal: "Perdre 4 kg", guide: { slug: "mon guide", title: "Titre", hook: "Accroche" }, appUrl: "https://app.test" };

test("buildMessage : saisies libres échappées dans le HTML", () => {
  const html = buildMessage(1, { ...ctx, firstName: "<b>x</b>", goal: `<img src=x onerror="a()">`, guide: { slug: "a b", title: "<script>t</script>", hook: "<i>h</i>" } }).html;
  for (const raw of ["<b>x</b>", "<img src=x", "<script>t</script>", "<i>h</i>"]) assert.ok(!html.includes(raw), raw);
  assert.ok(html.includes("/ressources/a%20b"));
});

test("buildMessage : rien qui contredise les règles du compte gratuit", () => {
  for (let step = 1; step <= REENGAGEMENT_STEPS; step++) {
    const m = buildMessage(step, ctx);
    const text = `${m.subject} ${m.pushTitle} ${m.pushBody} ${m.html}`;
    assert.ok(!/tout est gratuit|rien à acheter|dans un an|reste ouvert et gratuit/i.test(text), `étape ${step}`);
    // Règles de contenu : pas de tiret cadratin, pas d'étude citée.
    assert.ok(!/[–—]/.test(text), `tiret étape ${step}`);
    assert.ok(!/\bétudes?\b/i.test(text), `étude étape ${step}`);
    assert.ok(m.subject.length > 0 && m.pushUrl.startsWith("/"));
  }
  assert.ok(buildMessage(1, ctx).html.includes(`gratuit pendant ${FREE_TIER_DAYS} jours`));
  assert.ok(buildMessage(5, ctx).html.includes(`${INACTIVITY_DELETE_DAYS} jours sans aucune connexion`));
});
