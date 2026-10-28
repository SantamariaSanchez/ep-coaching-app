import test from "node:test";
import assert from "node:assert/strict";
import {
  analyzeYoutubeScript, buildVideoBlueprint, buildYoutubeDescription, checkDescription, cleanVideoPlan, clipHooks,
  deriveClips, generateTitles, scoreTitle, thumbnailIdeas, thumbnailTextOptions, YT_STRUCTURES, CLIP_CTA,
} from "../youtube-studio";

const filler = (n: number, seed = "mot") => Array.from({ length: n }, (_, i) => `${seed}${i % 7}`).join(" ");

function script(): string {
  return [
    "Tu fais des abdos tous les soirs et ton ventre ne part pas. Ce n'est pas un problème de volonté.",
    `Je suis Emmanuel Santamaria Sanchéz, coach en bodybuilding natural. Dans cette vidéo, je te montre trois choses. Le guide gratuit est dans la description. Et reste jusqu'au dernier point, c'est pas celui que tu crois. ${filler(40)}`,
    `Premier point : le gras ne part pas là où tu travailles. ${filler(180)} 2 kilos, 500 calories, 3 séances.`,
    `Regarde bien ce calcul. ${filler(150)} 1 800 calories sur 7 jours.`,
    `Deuxième point : le déficit décide. ${filler(180)} 10 000 pas.`,
    `Petite parenthèse, le guide est dans la description. On reprend. ${filler(120)}`,
    `Retiens bien ça. ${filler(160)}`,
    `Troisième point, celui que je t'ai annoncé : ton tour de taille. ${filler(180)}`,
    `Donc si je devais récapituler cette vidéo, trois choses. ${filler(60)}`,
    "Abonne-toi, et le lien du guide est dans la description. Je te dis à très vite.",
  ].join("\n\n");
}

test("titre : un bon titre dépasse un titre technique coupé par deux-points", () => {
  const good = scoreTitle("Tu fais des abdos tous les soirs, pourquoi ton ventre ne part pas ?");
  const bad = scoreTitle("Hypertrophie : périodisation et catabolisme");
  assert.ok(good.score > bad.score);
  assert.equal(scoreTitle("a".repeat(70)).criteria.find((c) => c.id === "length")!.ok, false);
});

test("titre : pas de tiret cadratin ni d'appât", () => {
  assert.equal(scoreTitle("Le secret incroyable pour ton ventre — garanti").criteria.find((c) => c.id === "no_clickbait")!.ok, false);
  assert.equal(scoreTitle("Le secret — ton ventre").criteria.find((c) => c.id === "clean")!.ok, false);
});

test("générateur : un candidat par angle renseigné, classés par note", () => {
  const t = generateTitles({ subject: "ton ventre", pain: "tu fais des abdos tous les soirs", result: "perdre ton ventre", mistake: "faire des abdos pour perdre du ventre", myth: "manger le soir fait grossir", truth: "ton total de la semaine décide", count: 3 });
  const angles = new Set(t.map((x) => x.angle));
  for (const a of ["curiosite", "resultat", "erreur", "contre_pied", "chiffre"]) assert.ok(angles.has(a as never), a);
  for (let i = 1; i < t.length; i++) assert.ok(t[i - 1].score >= t[i].score);
  assert.ok(t.every((x) => !/[—–]/.test(x.text)));
  assert.deepEqual(generateTitles({}), []);
});

test("miniatures : 3 concepts, texte de 4 mots maximum", () => {
  const ideas = thumbnailIdeas({ title: "Ta balance monte depuis que tu fais de la muscu ?" });
  assert.equal(ideas.concepts.length, 3);
  assert.match(ideas.concepts[0].composition, /balance/);
  for (const o of thumbnailTextOptions("5 séances par semaine, pourquoi pas de résultat ?")) assert.ok(o.split(/\s+/).length <= 4);
});

test("plan : la chronologie couvre toute la vidéo avec des relances espacées", () => {
  const bp = buildVideoBlueprint({ durationMin: 12, parts: 4 });
  assert.equal(bp.segments[0].startSec, 0);
  assert.equal(bp.segments.at(-1)!.endSec, 720);
  const relances = bp.beats.filter((b) => b.kind === "relance");
  for (let i = 1; i < relances.length; i++) assert.ok(relances[i].atSec - relances[i - 1].atSec <= 180);
  assert.equal((bp as unknown as Record<string, unknown>).chapters, undefined);
});

test("aucun chapitre ni timecode dans le module (décision d'Emmanuel)", async () => {
  const mod = (await import("../youtube-studio")) as Record<string, unknown>;
  assert.equal(mod.extractChapters, undefined);
  assert.equal(mod.formatChapters, undefined);
  assert.ok(!YT_STRUCTURES.some((s) => ["Y17", "Y18", "Y19"].includes(s.id)));
  assert.equal(YT_STRUCTURES.length, 16);
});

test("analyse : script conforme sans alerte de rétention", () => {
  const a = analyzeYoutubeScript({ content: script(), durationSec: 720 });
  for (const id of ["hook_open", "promise", "loop_open", "resource_mid", "recap", "end_asks"]) assert.equal(a.checks.find((c) => c.id === id)!.ok, true, id);
  assert.ok(a.passed >= a.total - 3);
});

test("analyse : repère ouverture générique, vouvoiement, tiret et chapitre écrit", () => {
  const bad = `Salut, aujourd'hui on va parler de ton ventre — vous allez voir. ${filler(500)}\n\n00:00 Chapitre\n\n${filler(300)}`;
  const a = analyzeYoutubeScript({ content: bad, durationSec: 720 });
  assert.equal(a.checks.find((c) => c.id === "hook_open")!.ok, false);
  const brand = a.checks.find((c) => c.id === "brand")!;
  assert.equal(brand.ok, false);
  assert.match(brand.detail, /Chapitre ou timecode/);
  assert.equal(a.checks.find((c) => c.id === "relances")!.ok, false);
});

test("description : modèle d'Emmanuel, conforme au contrôle", () => {
  const d = buildYoutubeDescription({
    guideSlug: "guide-motivation", falseProblem: "tu as perdu ta motivation", trueProblem: "le problème est en amont : tu n'as aucun repère.",
    promise: "le check-in d'une minute par semaine.", rule: "La motivation, c'est ce qui te lance. C'est pas ce qui te fait progresser.",
    question: "Depuis combien de semaines tu t'entraînes sans te peser ? Écris-moi le chiffre en commentaire !", themes: "la motivation et la progression", hashtags: ["motivation", "#musculation", "bodybuilding"],
  });
  assert.ok(checkDescription(d).every((c) => c.ok), JSON.stringify(checkDescription(d).filter((c) => !c.ok)));
  assert.ok(d.startsWith("Je t'ai préparé"));
  assert.ok(!/00:00/.test(d));
  assert.equal(checkDescription(d + "\n\n00:00 Intro\n01:10 Partie 1").find((c) => c.id === "forbidden")!.ok, false);
});

test("clips : passages courts, 4 titres hook, CTA exact", () => {
  const clips = deriveClips(script(), 720);
  assert.ok(clips.length >= 1);
  for (const c of clips) {
    assert.ok(c.words >= 60);
    assert.ok(c.description.endsWith(CLIP_CTA));
    for (const h of c.hooks) assert.ok(h.split(/\s+/).length <= 7 && !/[.,:;!?]/.test(h));
  }
  assert.deepEqual(clipHooks("Ton corps ne compte pas en jours. Ce n'est pas la volonté, mais le total de la semaine.").length > 0, true);
});

test("plan enregistré : valeurs inconnues écartées", () => {
  const p = cleanVideoPlan({ structure: "Y03", hookType: "ZZ", hookId: "H12", titles: ["a", 3], checklist: { titre_choisi: true, inconnu: true } });
  assert.deepEqual(p, { structure: "Y03", hookId: "H12", titles: ["a"], checklist: { titre_choisi: true } });
  assert.equal(YT_STRUCTURES.length, 16);
});
