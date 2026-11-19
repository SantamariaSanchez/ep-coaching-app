import { test } from "node:test";
import assert from "node:assert/strict";
import { findWeakHooks, weakHooksRefusal, HOOK_WINDOW } from "../ai-tics";

test("accroches interdites repérées dans l'ouverture", () => {
  const cas: [string | null, string][] = [
    ["Beaucoup de gens me demandent comment faire un hip thrust", "Contenu."],
    [null, "Dans cette vidéo je vais vous parler des fessiers."],
    [null, "Salut tout le monde ! On parle squat."],
    [null, "Aujourd'hui on va parler de la peur de la salle."],
    ["Plein de filles m'ont demandé si la muscu fait grossir", ""],
  ];
  for (const [a, c] of cas) assert.ok(findWeakHooks(a, c).length > 0, `${a} / ${c}`);
});

test("bonnes accroches et annonce de plan plus loin : rien", () => {
  const ok: [string | null, string][] = [
    ["Si tu sens pas tes fessiers à la salle, regarde ça.", "Elle s'entraîne quatre fois par semaine, et pourtant rien ne bouge."],
    [null, "Là, pendant que tu regardes, tu es assise sur le plus gros muscle de ton corps."],
    [null, "x".repeat(HOOK_WINDOW + 10) + " Dans cette vidéo je vais te montrer trois erreurs."],
    [null, "Aujourd'hui j'ai raté ma séance, et c'est pas grave."],
  ];
  for (const [a, c] of ok) assert.deepEqual(findWeakHooks(a, c), [], `${a} / ${c}`);
});

test("message de refus explicite", () => {
  const msg = weakHooksRefusal(findWeakHooks("Beaucoup de gens me demandent ça", ""));
  assert.match(msg, /Rien n'a été enregistré/);
  assert.match(msg, /J2/);
});
