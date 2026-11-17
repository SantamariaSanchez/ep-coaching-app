import { test } from "node:test";
import assert from "node:assert/strict";
import { findAiTics, aiTicsRefusal } from "../ai-tics";

test("tics d'IA : les tournures signalées par Emmanuel sont trouvées", () => {
  const cas = [
    "Le problème, ce n'est pas ta motivation, c'est ton plan.",
    "Le vrai problème c'est pas ta volonté.",
    "Ce n'est pas un échec, c'est un repas.",
    "L'écart n'est pas un échec. C'est un repas.",
    "Tu ne manques pas de volonté. Tu manques d'un plan.",
    "Le souci c'est pas ta diète mais ta régularité.",
    "Note tout dans ton carnet.",
    "Tu ne manques pas de volonté.",
  ];
  for (const c of cas) assert.ok(findAiTics(c).length > 0, c);
});

test("tics d'IA : une phrase normale passe", () => {
  const ok = [
    "Ouvre ton logbook et regarde ta dernière séance.",
    "Ce n'est pas grave.",
    "Tu manges à ta faim, avec des protéines à chaque repas.",
    "C'est pas magique. Il faut du temps.",
  ];
  for (const c of ok) assert.deepEqual(findAiTics(c), [], c);
});

test("tics d'IA : le refus dit quoi réécrire et que rien n'est enregistré", () => {
  const msg = aiTicsRefusal(findAiTics("Le problème, ce n'est pas ta motivation, c'est ton plan."));
  assert.match(msg, /refusé/);
  assert.match(msg, /transcripts/);
  assert.match(msg, /Rien n'a été enregistré/);
});
