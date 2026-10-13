import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { checkVocabulary, usesVous, type VocabularyIssue } from "@/lib/content-vocabulary";

// Réécriture d'un script du Studio avec le vocabulaire du dictionnaire
// (2026-10-13, retour direct : « il y a des mots dans les scripts actuels
// qui ne sont pas dans le vocabulaire, mets-les à jour »). Un appel à
// Claude par script, sortie JSON stricte, puis contrôle par le même
// détecteur que les cartes du Studio : si un mot interdit reste, un second
// tour lui renvoie la liste exacte à corriger.

export interface RewriteInput {
  platform: string;
  title: string;
  hook: string | null;
  content: string | null;
  cta: string | null;
  caption: string | null;
  durationSeconds: number | null;
  /** Numéro du guide gratuit à faire commenter (reel), s'il y en a un. */
  guideKeyword: string | null;
  guideTitle: string | null;
  /** Lien du guide (YouTube, LinkedIn, Threads). */
  guideUrl: string | null;
}

export interface RewriteOutput {
  title: string;
  hook: string;
  content: string;
  cta: string;
  caption: string;
}

const MODEL = "claude-opus-5-5";

// Condensé du « Dictionnaire EP Coaching : les mots à utiliser » (Notion),
// construit uniquement avec des tournures réellement présentes dans les
// transcripts. Stable : il sert de préfixe mis en cache d'un script à
// l'autre quand on réécrit tout le Studio d'un coup.
const SYSTEM = `Tu réécris des scripts de contenu pour Santamaria Sanchéz, coach en bodybuilding natural (EP Coaching) : perdre du gras, prendre du muscle, se préparer, et coach pour les coachs qui veulent des clients. Tu gardes le SUJET, l'idée et les faits du script d'origine. Tu changes la façon de le dire : uniquement avec le vocabulaire ci-dessous, tiré des vrais transcripts des créateurs de la niche (ThePrepDad, Marvin Ndiaye, Matis Clouet, Hans Kadss, Leo Garret, Hormozi, Leo Grindarss, Denis Gallois).

VOCABULAIRE À UTILISER
- Ouvertures : « C'est une question qui revient extrêmement souvent. » « Tu penses que t'as un problème de X. C'est pas du tout le cas. » « J'aimerais casser un petit peu un mythe. » « Si tu [situation], t'es exactement sur la bonne vidéo. » « Je vais aller droit au but. » « Je me suis fait avoir aussi quand j'ai commencé. » « Tu ne manques pas d'infos. Tu manques de priorités. » « Une douleur n'arrive jamais sans raison. » « Je suis désolé, mais je me dois de te dire quelque chose. »
- Liaisons (une ou deux par phrase au plus) : en fait, tout simplement, concrètement, du coup, en gros, en vrai, la vérité c'est que, évidemment, forcément, justement, clairement, franchement, au final, c'est aussi simple que ça, très simple, le nerf de la guerre, la base des bases.
- Relances : « Je m'explique. » « Regarde bien ce calcul. » « Ce passage est important parce que... » « Et c'est là que ça devient intéressant. » « Je prends un exemple très simple. » « Ce n'est pas de la magie, c'est de l'arithmétique. » « Premier point... Deuxième point... Et le dernier point... » « Jusqu'ici on a parlé de A. Maintenant on attaque le nerf de la guerre : B. »
- Nuance : « C'est ma méthode à moi. Je dis pas qu'il y a que ma méthode qui marche. » « Ce conseil n'est pas pour toi si... » « Ça dépend de ce que tu veux. » « Faut pas être fataliste. » « C'est du cas par cas. »
- Métier : diète, plan alimentaire, maintenance, déficit, surplus, sèche, prise de masse, perte de gras, macros, calories, protéines, adhésion, satiété, sensations de faim, refeed, diet break, nombre de pas, la muscu, séance, séries, reps, monter en charge, proche de l'échec, fourchette de répétitions, progression, logbook, cardio, récupération, sommeil, check-in, suivi, bilan, coaching, accompagnement, appel.
- Fins : « Donc si je devais récapituler... » « Ce que tu dois retenir, c'est que... » « Petit récap, on arrive sur la fin. » « Le plus important, c'est de passer à l'action. » « Voilà, maintenant tu sais ce que tu dois faire. »
- Mots familiers qu'ils disent vraiment (avec parcimonie) : se prendre la tête, bosser, galère, la flemme, ras le bol, c'est dingue, nickel, allez c'est parti.

INTERDITS ABSOLUS
- Citer une étude, un chercheur, « la littérature », une revue, un pourcentage ou un chiffre de résultat qui n'est pas dans le script d'origine. Jamais de témoignage inventé, jamais de client nommé.
- Tiret cadratin ou demi-cadratin. Vouvoiement (toujours « tu »).
- « lien en bio », « dans ma bio », « aujourd'hui on va parler de », « j'accompagne les gens qui... », « n'hésite pas », « écris-moi en message privé ».
- mindset, game changer, booster, hack, scaler, littéralement, insane, optimiser, méthode miracle, tension mécanique, périodisation, macronutriments, catabolisme, NEAT, thermogenèse, biomécanique, « barre » (dire « monter en charge » ou « sur la machine »).
- Parler de l'âge de Santamaria, de prix, d'agents IA.

FORMAT
- content : texte mot pour mot, à la première personne, en paragraphes courts séparés par une ligne vide. Phrases courtes, rythme parlé, un enfant doit comprendre. Pas de titre, pas de liste à puces, pas de crochet.
- hook : la toute première phrase de content, telle quelle.
- title : titre interne court (moins de 70 caractères), une vraie phrase.`;

function platformRules(input: RewriteInput): string {
  const p = input.platform;
  if (p === "youtube") {
    return `PLATEFORME : vidéo YouTube longue. Garde la longueur du script d'origine (même nombre de parties). Structure : ouverture sur la question ou la douleur, présentation courte (qui parle et pourquoi l'écouter), promesse, parties annoncées à l'oral (« premier point », « on passe au deuxième »), exemples concrets, récapitulatif (« donc si je devais récapituler »), fin avec 2 ou 3 demandes. JAMAIS de chapitres, de timecodes ni de titre de partie. cta = la phrase parlée finale, qui renvoie en description (« le lien est dans la description »). caption = la description YouTube : première ligne = ${input.guideUrl ? `le lien ${input.guideUrl} avec une phrase qui donne envie` : "une phrase qui donne envie d'aller voir le guide en description"}, puis 2 ou 3 phrases simples, puis https://ep-coaching.vercel.app/auth/client pour l'appli, puis 3 à 5 hashtags. Liens nus, aucun timecode.`;
  }
  if (p === "linkedin" || p === "threads") {
    const name = p === "linkedin" ? "LinkedIn" : "Threads";
    return `PLATEFORME : post ${name} écrit (rien à filmer). ${p === "threads" ? "3 à 6 lignes maximum, une seule idée, prise de position dès la première ligne." : "Les 2 premières lignes font tout. Une idée par ligne, beaucoup d'air."} Fin : un lien seul sur sa ligne OU une question, jamais les deux. Si le post d'origine a un lien, garde-le exactement. cta = la dernière ligne du post. caption = chaîne vide.`;
  }
  const kw = input.guideKeyword;
  const target = input.durationSeconds && input.durationSeconds > 0 ? Math.min(150, Math.max(30, input.durationSeconds)) : 60;
  return `PLATEFORME : reel (vidéo courte verticale, postée sur Instagram, TikTok, YouTube Shorts et Facebook). Environ ${Math.round(target * 2.6)} mots (2,6 mots par seconde, ${target} secondes), jamais plus de 390 mots. Structure : hook qui nomme une douleur précise en moins de 2 secondes, le vrai problème en une phrase, une scène reconnaissable ou un exemple simple, 2 ou 3 actions concrètes, une punchline courte, puis UN seul appel à l'action. Appel à l'action : on fait COMMENTER. ${kw ? `Le guide gratuit est le n°${kw}${input.guideTitle ? ` (« ${input.guideTitle} »)` : ""} : la dernière phrase fait commenter ${kw} (ex. « Commente ${kw} et je te l'envoie. »).` : "Pas de guide : fais commenter un mot clé en majuscules en rapport avec la vidéo (PROG, DIETE, COACHING, APPLI, NUTRITION, ROADMAP...)."} cta = cette dernière phrase, telle quelle. caption = la description : ligne 1 « Abonne toi », une ligne vide, 3 ou 4 lignes courtes en tu avec les mots du script (la fausse croyance, ce qu'elle coûte, le vrai déclic), une ligne vide, puis la même demande de commentaire${kw ? ` (« Commente ${kw} pour recevoir le guide »)` : ""}. Aucun lien, aucun @ de compte.`;
}

const SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    hook: { type: "string" },
    content: { type: "string" },
    cta: { type: "string" },
    caption: { type: "string" },
  },
  required: ["title", "hook", "content", "cta", "caption"],
  additionalProperties: false,
} as const;

function remainingIssues(out: RewriteOutput): VocabularyIssue[] {
  const text = [out.title, out.hook, out.content, out.cta, out.caption].join("\n");
  const issues = checkVocabulary(text);
  if (usesVous(text)) issues.push({ found: "vous", why: "Le tutoiement est la règle", fix: "Passe en « tu »." });
  return issues;
}

async function callClaude(client: Anthropic, input: RewriteInput, feedback?: { previous: RewriteOutput; issues: VocabularyIssue[] }): Promise<RewriteOutput | null> {
  const original = {
    titre: input.title,
    hook: input.hook ?? "",
    script: input.content ?? "",
    appel_a_l_action: input.cta ?? "",
    description: input.caption ?? "",
  };
  let user = `${platformRules(input)}\n\nSCRIPT D'ORIGINE (garde le sujet et les faits, réécris la forme) :\n${JSON.stringify(original, null, 2)}`;
  if (feedback) {
    user += `\n\nTA PREMIÈRE VERSION :\n${JSON.stringify(feedback.previous, null, 2)}\n\nCes mots sortent encore du vocabulaire, corrige-les sans rien changer d'autre :\n${feedback.issues.map((i) => `- « ${i.found} » : ${i.why}. ${i.fix}`).join("\n")}`;
  }
  // Repli côté serveur si le modèle décline (rare sur ce sujet) : la même
  // requête repart sur le modèle de secours dans le même appel.
  const stream = client.beta.messages.stream({
    model: MODEL,
    betas: ["server-side-fallback-2026-06-01"],
    fallbacks: [{ model: "claude-opus-4-8" }],
    max_tokens: 32000,
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA } },
    messages: [{ role: "user", content: user }],
  });
  const message = await stream.finalMessage();
  if (message.stop_reason === "refusal" || message.stop_reason === "max_tokens") return null;
  const text = message.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") return null;
  try {
    const parsed = JSON.parse(text.text) as RewriteOutput;
    if (!parsed.content?.trim()) return null;
    return {
      title: parsed.title.trim().slice(0, 200),
      hook: parsed.hook.trim(),
      content: parsed.content.trim(),
      cta: parsed.cta.trim(),
      caption: parsed.caption.trim(),
    };
  } catch {
    return null;
  }
}

/** Réécrit un script avec le vocabulaire du dictionnaire. null si l'IA est indisponible. */
export async function rewriteScriptWithVocabulary(input: RewriteInput): Promise<{ output?: RewriteOutput; error?: string }> {
  if (!process.env.ANTHROPIC_API_KEY) return { error: "Réécriture indisponible pour le moment (clé IA absente)." };
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  try {
    let out = await callClaude(client, input);
    if (!out) return { error: "La réécriture n'a pas abouti, réessaie." };
    const issues = remainingIssues(out);
    if (issues.length) {
      const second = await callClaude(client, input, { previous: out, issues });
      if (second) out = second;
    }
    return { output: out };
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return { error: "Trop de réécritures en même temps, réessaie dans une minute." };
    if (e instanceof Anthropic.APIError) return { error: `Service IA indisponible (${e.status ?? "erreur"}).` };
    return { error: "La réécriture n'a pas abouti, réessaie." };
  }
}

/** Durée d'un texte parlé, arrondie à 5 s (2,6 mots par seconde pour un reel, 2,3 en long). */
export function spokenDuration(content: string, platform: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  const perSecond = platform === "youtube" ? 2.3 : 2.6;
  return Math.max(15, Math.round(words / perSecond / 5) * 5);
}
