// Vocabulaire du Studio créatif (2026-10-13, retour direct du fondateur :
// « tout ce qui est dans TRANSCRIPTION, c'est ton vocabulaire ; il y a des
// mots dans les scripts actuels qui ne sont pas dans le vocabulaire, mets-les
// à jour »). Source unique : la page Notion « Dictionnaire EP Coaching : les
// mots à utiliser », construite à partir des vrais transcripts (Hans Kadss,
// Marvin Ndiaye, Leo Garret, ThePrepDad, Matis Clouet, Hormozi, Leo
// Grindarss, Denis Gallois). Ici on n'en garde que ce qui sert dans l'appli :
//  1. les mots à bannir, avec la formule du dictionnaire qui les remplace,
//     pour signaler un script hors vocabulaire directement sur sa carte ;
//  2. le bloc de règles collé devant chaque prompt copié depuis le Studio.
// Fichier pur (aucun import serveur), utilisable côté client.

export interface VocabularyIssue {
  /** Ce qui a été trouvé dans le texte (tel quel). */
  found: string;
  /** Pourquoi ça sort du vocabulaire. */
  why: string;
  /** Par quoi le remplacer (formule du dictionnaire). */
  fix: string;
}

interface Rule {
  re: RegExp;
  why: string;
  fix: string;
}

// Les règles du fondateur passent en premier : ce sont celles qui coûtent le
// plus cher si elles partent en ligne (bio, étude citée, tiret, etc.).
const RULES: Rule[] = [
  { re: /lien (?:est )?(?:en|dans (?:ma|la)) bio|dans (?:ma|la) bio/gi, why: "Jamais de lien dans la bio", fix: "Reel : « Commente [numéro du guide] et je te l'envoie ». YouTube : « le lien est dans la description »." },
  { re: /\b(?:une|selon une|d'après une) [ée]tudes?\b|\bchercheurs?\b|\brevue scientifique\b/gi, why: "Aucune étude ni source citée", fix: "Parle comme un coach qui sait : « je vais être très clair là-dessus », « la vérité c'est que »." },
  { re: /[—–]/g, why: "Jamais de tiret cadratin ou demi-cadratin", fix: "Une virgule, un point, ou deux phrases." },
  { re: /j'accompagne (?:les|des) (?:gens|personnes|coachs)/gi, why: "Phrase de positionnement corporate", fix: "Dis ce que tu fais en vrai : « je suis coach en bodybuilding natural », « mes clients ont un suivi chaque semaine »." },
  { re: /aujourd'hui,? on va parler d[eu]/gi, why: "Ouverture interdite", fix: "Ouvre sur la douleur : « C'est une question qui revient extrêmement souvent. »" },
  { re: /\bn'h[ée]sitez? pas\b|\bau plaisir\b/gi, why: "Ton corporate", fix: "« Dis-moi en commentaire », « le lien est dans la description »." },
  // Jargon de coach LinkedIn et de vente.
  { re: /\bgame[- ]changer\b/gi, why: "Jargon", fix: "« ça change tout », « c'est ce qui fait la différence »" },
  { re: /\bmine d'or\b/gi, why: "Jargon", fix: "« c'est le nerf de la guerre »" },
  { re: /\binsane\b|\bde malade\b/gi, why: "Jargon", fix: "« c'est une dinguerie » (rare), « c'est dingue »" },
  { re: /\blitt[ée]ralement\b/gi, why: "Tic à bannir", fix: "« en fait », « vraiment »" },
  { re: /\bmindset\b/gi, why: "Jargon", fix: "« la tête », « ta façon de voir les choses »" },
  { re: /\bboost(?:er|e|es|ez)\b/gi, why: "Jargon", fix: "« faire monter », « aider »" },
  { re: /\bhacks?\b/gi, why: "Jargon", fix: "« une astuce », « un truc simple »" },
  { re: /\bscal(?:er|e|ing)\b/gi, why: "Jargon business", fix: "« faire grandir ton activité », « avoir plus de clients »" },
  { re: /\bhigh ticket\b|\bclos(?:er|ing)\b|\bsett(?:er|ing)\b|\bfunnel\b|\bnurturing\b|\bshow-?up\b/gi, why: "Jargon de vente", fix: "« appel », « offre », « prendre un appel »" },
  { re: /\bm[ée]thode miracle\b/gi, why: "Interdit (sauf pour la dénoncer)", fix: "« c'est pas de la magie, c'est de l'arithmétique »" },
  { re: /\bapporter de la valeur\b|\bproposition de valeur\b|\bsynergie\b|\boptimiser (?:son|ton|votre) potentiel\b/gi, why: "Mot corporate", fix: "« t'aider », « te faire gagner du temps »" },
  { re: /\brevenus? passifs?\b|\bz[oô]ne de g[ée]nie\b/gi, why: "Jargon", fix: "À retirer." },
  // Mots trop savants : les créateurs les traduisent quand ils les disent.
  { re: /\btension m[ée]canique\b/gi, why: "Trop savant", fix: "« monter en charge », « aller proche de l'échec »" },
  { re: /\bp[ée]riodisation\b/gi, why: "Trop savant", fix: "« comment tu organises tes semaines »" },
  { re: /\bNEAT\b|\bthermogen[eè]se\b/gi, why: "Trop savant", fix: "« ton nombre de pas », « ce que tu dépenses dans la journée »" },
  { re: /\bcatabolisme\b|\bcatabolique\b/gi, why: "Trop savant", fix: "« perdre du muscle »" },
  { re: /\bmacronutriments?\b/gi, why: "Trop savant", fix: "« macros »" },
  { re: /\bbiom[ée]canique\b/gi, why: "Trop savant", fix: "« la façon dont tu fais le mouvement »" },
  // Interdits EP Coaching.
  { re: /\bbarres?\b/gi, why: "Interdit EP Coaching (« barre »)", fix: "« monter en charge », « sur la machine »" },
  { re: /\bMRR\b|\bRPM\b|\bB2[BC]\b|\bgo to market\b|\bvibe cod/gi, why: "Jargon SaaS", fix: "À retirer : parle de clients, d'abonnés, de vues." },
];

/** Contrôle un texte de script : ce qui sort du vocabulaire du dictionnaire. */
export function checkVocabulary(text: string | null | undefined): VocabularyIssue[] {
  if (!text) return [];
  const out: VocabularyIssue[] = [];
  const seen = new Set<string>();
  for (const rule of RULES) {
    rule.re.lastIndex = 0;
    for (const m of text.matchAll(rule.re)) {
      const key = `${rule.why}|${m[0].toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ found: m[0], why: rule.why, fix: rule.fix });
    }
  }
  return out;
}

/** Vouvoiement dans un script (le tutoiement est la règle). */
export function usesVous(text: string | null | undefined): boolean {
  if (!text) return false;
  return /\b(vous|votre|vos)\b/i.test(text);
}

// ── Formules du dictionnaire (version EP Coaching) ───────────────────────
// Construites uniquement avec des mots présents dans les transcripts.

export const DICTIONARY_HOOKS = [
  "Comment [faire X] ? C'est une question qui revient extrêmement souvent.",
  "Tu penses que t'as un problème de [X]. C'est pas du tout le cas.",
  "Tu ne manques pas d'infos. Tu manques de priorités.",
  "Si tu t'entraînes depuis un an et que rien ne bouge, t'es exactement sur la bonne vidéo.",
  "J'aimerais casser un petit peu un mythe : [mythe].",
  "[A] et [B], c'est pas la même chose. Et je vais t'expliquer pourquoi.",
  "Je me suis fait avoir aussi quand j'ai commencé.",
  "Je vais aller droit au but : [problème] bloque pour une raison très simple.",
  "La grosse chose évidente, c'est ça le problème. Pas les 100 détails.",
  "Ras le bol, on met les choses au clair : [vérité].",
  "Une douleur n'arrive jamais sans raison.",
  "Tu penses que [X] est compliqué. En vrai, c'est beaucoup plus simple que tu ne le penses.",
];

export const DICTIONARY_TRANSITIONS = [
  "Je m'explique.",
  "Regarde bien ce calcul.",
  "Ce passage est important parce que...",
  "Et c'est là que ça devient intéressant.",
  "Premier point... Deuxième point... Et le dernier point, c'est celui que personne n'applique.",
  "Jusqu'ici on a parlé de [A]. Maintenant on attaque le nerf de la guerre : [B].",
  "Je prends un exemple très simple.",
  "Ce n'est pas de la magie, c'est de l'arithmétique.",
  "C'est ma méthode à moi. Je dis pas qu'il y a que ma méthode qui marche.",
  "Ce conseil n'est pas pour toi si [situation].",
];

export const DICTIONARY_ENDINGS = [
  "Donc si je devais récapituler : [A], [B], [C].",
  "Ce que tu dois retenir, c'est que [idée].",
  "Petit récap, on arrive sur la fin.",
  "Le plus important, c'est de passer à l'action. Maintenant c'est à toi de jouer.",
  "Voilà, maintenant tu sais ce que tu dois faire.",
  "Merci d'avoir regardé, et je te dis à très vite.",
];

/**
 * Règles collées devant chaque prompt copié depuis le Studio, pour que
 * Claude écrive avec le vocabulaire des transcripts et pas avec le sien.
 */
export const VOCABULARY_PROMPT_BLOCK = [
  "RÈGLES D'ÉCRITURE (vocabulaire des créateurs de la niche, à respecter à la lettre) :",
  "- Tutoiement, phrases courtes, ton direct de coach. Écris comme on parle, pas comme un article.",
  "- Mots à utiliser : en fait, tout simplement, concrètement, en gros, du coup, la vérité c'est que, je m'explique, regarde bien, c'est aussi simple que ça, le nerf de la guerre. Métier : diète, déficit, surplus, maintenance, sèche, prise de masse, macros, adhésion, séance, monter en charge, proche de l'échec, check-in, suivi.",
  "- Hooks types : « C'est une question qui revient extrêmement souvent. » « Tu penses que t'as un problème de X. C'est pas du tout le cas. » « J'aimerais casser un petit peu un mythe. »",
  "- Fins types : « Donc si je devais récapituler... » « Ce que tu dois retenir, c'est que... » « Maintenant c'est à toi de jouer. »",
  "- INTERDITS : citer une étude ou un chercheur, inventer un chiffre ou un témoignage, le tiret cadratin, « lien en bio », « aujourd'hui on va parler de », « j'accompagne les gens qui », mindset, game changer, booster, hack, scaler, littéralement, tension mécanique, périodisation, macronutriments, « barre » (dire « monter en charge »).",
  "- Appel à l'action : reel = faire commenter un numéro de guide ou un mot clé (PROG, DIETE, COACHING, APPLI...) ; YouTube = « le lien est dans la description » ; LinkedIn et Threads = un lien OU une question, jamais les deux.",
].join("\n");
