// Studio YouTube (2026-10-28). Tout ce qui fait une vidéo longue qui retient :
// structure (hook 0-30 s, promesse, plan, boucles ouvertes, relances,
// rappel de la ressource, récap, demandes de fin), titres notés, description
// au format d'Emmanuel, idées de miniatures A/B, chapitres horodatés (plan de
// production), clips pour les reels et checklist de publication et de
// recyclage.
//
// Sources : Centre de commandes contenu (structures Y01 à Y16, banque de hooks
// H01 à H92, modèle de description A4), Bible contenu (D1, F : relances et
// transitions), guides de production YouTube, titres et miniatures, et les
// transcripts de référence (Yomi Denzel, Marvin Ndiaye, ThePrepDad, Hormozi).
// Aucune source n'est jamais affichée à un client.
//
// Module pur, sans import serveur : utilisable côté client, serveur et dans le
// connecteur Claude. Testé dans lib/__tests__/youtube-studio.test.ts.

import { checkVocabulary, usesVous } from "@/lib/content-vocabulary";

// ── Constantes de la méthode ─────────────────────────────────────────────

/** Mots par seconde en voix off de vidéo longue (guide de production YouTube). */
export const WORDS_PER_SECOND = 2.3;
export const TITLE_MAX_CHARS = 60;

export interface YtStructure {
  id: string;
  name: string;
  /** Déroulé type, dans l'ordre. */
  steps: string[];
  /** Pour quel genre de sujet. */
  bestFor: string;
}

export const YT_STRUCTURES: YtStructure[] = [
  { id: "Y01", name: "Question fréquente", steps: ["Question que tout le monde se pose", "Présentation courte", "Promesse", "Nuance", "3 à 5 parties", "Cas type chiffré", "Récap", "2 ou 3 demandes"], bestFor: "Une question qui revient souvent (combien, comment, est-ce que)." },
  { id: "Y02", name: "Les N seules façons", steps: ["Chiffre fermé (pas 10, non N)", "Classées de la plus sûre à la plus rapide", "Un nom imagé par façon", "La plus forte en dernier"], bestFor: "Un sujet où tu peux fermer la liste (les raisons, les façons, les causes)." },
  { id: "Y03", name: "Les niveaux", steps: ["Débutant", "Intermédiaire", "Avancé", "À chaque niveau : l'erreur typique et ce qui débloque"], bestFor: "Quand la bonne réponse change selon l'expérience." },
  { id: "Y04", name: "Audit filmé", steps: ["Un vrai volontaire", "Questions courtes", "Verdict en une phrase", "Plan en 3 étapes", "Un mois après si possible"], bestFor: "Une assiette, une semaine, un compte de coach. Uniquement avec un vrai volontaire." },
  { id: "Y05", name: "Construction en direct", steps: ["Partage d'écran", "On construit ta diète ou ta semaine", "Mets pause", "Leçons numérotées"], bestFor: "Un outil ou une méthode à appliquer pendant la vidéo." },
  { id: "Y06", name: "Mythes en série", steps: ["5 à 7 croyances", "La part de vérité", "La vérité", "Que faire"], bestFor: "Un thème plein d'idées reçues." },
  { id: "Y07", name: "Les erreurs à ne pas refaire", steps: ["On a fait des erreurs, on les reprend", "5 erreurs", "La leçon de chacune"], bestFor: "Débutants qui répètent les mêmes erreurs." },
  { id: "Y08", name: "Questions-réponses", steps: ["Retour sur la semaine", "3 à 5 vraies questions de la communauté", "Petite morale à chaque fois"], bestFor: "Quand tu as de vraies questions reçues." },
  { id: "Y09", name: "Histoire vraie et mécanisme", steps: ["Histoire publique datée et vérifiée", "Le mécanisme qu'elle montre", "Comment l'appliquer à ton physique"], bestFor: "Une leçon qui se raconte. Jamais d'histoire inventée." },
  { id: "Y10", name: "Deux situations", steps: ["Les deux extrêmes", "À ton avis, lequel progresse le plus ?", "Le milieu qui marche"], bestFor: "Comparer deux façons de faire." },
  { id: "Y11", name: "Étape par étape de zéro", steps: ["Situation de départ", "Je construis devant toi", "Étapes numérotées", "Plan complet"], bestFor: "Un plan complet à faire de A à Z." },
  { id: "Y12", name: "La méthode nommée", steps: ["Le nom de la méthode (Trajectoire)", "Une partie par phase", "Ce qu'on y fait", "Comment savoir qu'on en sort"], bestFor: "Expliquer le cycle prise de muscle, perte de gras, maintenance." },
  { id: "Y13", name: "La contrainte principale", steps: ["Il y a que 3 raisons pour lesquelles...", "Le test pour trouver la tienne", "La solution pour chaque cas"], bestFor: "Un blocage (stagnation, motivation, ventre qui ne part pas) avec peu de causes." },
  { id: "Y14", name: "Copier ce qui marche ailleurs", steps: ["Ce que font ceux qui progressent", "Ce que tu peux copier dès demain"], bestFor: "Un sujet de méthode et d'organisation." },
  { id: "Y15", name: "Une semaine de prépa", steps: ["La vraie semaine d'Emmanuel", "Chaque scène donne une leçon"], bestFor: "Preuve par l'exécution. Vécu documenté uniquement." },
  { id: "Y16", name: "Classement des conseils des réseaux", steps: ["Les conseils qu'on voit partout", "Notés sur 5 (utile, simple, durable)", "Le meilleur à la fin"], bestFor: "Trier les conseils viraux." },
];

export function getYtStructure(id: string | null | undefined): YtStructure | null {
  return YT_STRUCTURES.find((s) => s.id === id) ?? null;
}

export interface HookType {
  id: string;
  label: string;
  /** Un hook réel de la banque (créateur source), mécanisme à reprendre, jamais la phrase. */
  example: string;
}

/** Types de hook de la banque D4 du Centre de commandes. */
export const HOOK_TYPES: HookType[] = [
  { id: "FP", label: "Faux problème", example: "La majorité des gens pensent qu'ils ont un problème de X. C'est pas du tout le cas." },
  { id: "PX", label: "Paradoxe", example: "Tu peux t'entraîner 5 fois par semaine et ne rien prendre." },
  { id: "VD", label: "Vérité qui dérange", example: "On va pas se mentir : ton cheat meal, c'est pas un repas, c'est un week-end." },
  { id: "MY", label: "Mythe", example: "J'aimerais casser un petit peu un mythe." },
  { id: "CO", label: "Ciblage", example: "Si tu fais attention à ce que tu manges mais que ton ventre part pas, t'es sur la bonne vidéo." },
  { id: "QD", label: "Question directe", example: "C'est une question qui revient extrêmement souvent." },
  { id: "MG", label: "Mise en garde", example: "Ne fais surtout pas ça en début de sèche." },
  { id: "RC", label: "Règle courte", example: "La meilleure diète, c'est celle que tu arriveras à suivre." },
  { id: "CH", label: "Chiffre fermé", example: "Il y a que trois raisons pour lesquelles tu stagnes. Pas dix. Trois." },
  { id: "CV", label: "Comparaison visuelle", example: "Ça, c'est... Ça, c'est... Et ça, c'est..." },
  { id: "PR", label: "Prédiction, choix", example: "Si tu continues comme ça, dans 6 mois t'auras le même physique. Maintenant, tu dois faire un choix." },
  { id: "BC", label: "Boucle, révélation", example: "Je te le montre dans 20 secondes, mais avant, faut que tu comprennes un truc." },
  { id: "HI", label: "Histoire, point commun", example: "Ceux qui tiennent leur diète un an ont un point commun, et c'est pas la motivation." },
  { id: "AN", label: "Analogie", example: "Ton corps, c'est un peu comme un nouveau stagiaire." },
  { id: "AV", label: "Aveu, erreur", example: "Tout le monde s'est fait avoir au moins une fois." },
  { id: "CG", label: "Coup de gueule", example: "J'en ai ras le bol. Donc on va mettre les choses au clair." },
  { id: "SD", label: "Second degré", example: "Hommage à mon partenaire le plus fidèle : les courbatures du lendemain de jambes." },
];

export function getHookType(id: string | null | undefined): HookType | null {
  return HOOK_TYPES.find((h) => h.id === id) ?? null;
}

// ── Titres ───────────────────────────────────────────────────────────────

export type TitleAngle = "curiosite" | "resultat" | "erreur" | "contre_pied" | "chiffre" | "filtre";

export const TITLE_ANGLES: { id: TitleAngle; label: string; why: string }[] = [
  { id: "curiosite", label: "Curiosité", why: "Un manque à combler : le spectateur veut savoir la suite." },
  { id: "resultat", label: "Résultat", why: "Ce que la personne repart avec, concret et tenable." },
  { id: "erreur", label: "Erreur", why: "Ce qu'il faut arrêter de faire, une douleur reconnue." },
  { id: "contre_pied", label: "Contre-pied", why: "On renverse une idée reçue ou un faux problème." },
  { id: "chiffre", label: "Chiffre fermé", why: "Un nombre précis et exclusif, pas 10, non 3." },
  { id: "filtre", label: "Filtre d'audience", why: "Un titre qui parle à une seule personne et la reconnaît." },
];

export interface TitleCriterion {
  id: string;
  label: string;
  ok: boolean;
  points: number;
  hint: string;
}

export interface TitleScore {
  score: number;
  criteria: TitleCriterion[];
}

const TECH_WORDS = /\b(p[ée]riodisation|hypertrophie|catabolisme|anabolisme|m[ée]tabolique|biom[ée]canique|ost[ée]oporose|aminogramme|glycog[èe]ne|thermogen[èe]se|lipolyse|sarcopénie|myofibrill\w*|leucine|mTOR)\b/i;
const CLICKBAIT = /\b(secret|incroyable|choquant|miracle|garanti[es]?|arnaque|gratuit|urgent|illimit[ée]|en 24 ?h|en 7 jours?|sans effort|magique|ultime)\b/i;
const JARGON_BANNED = /\b(mindset|scaler|game[- ]?changer|high ticket|funnel|closer|setter)\b/i;
const CONTRAST = /(\bmais\b|\bpourtant\b|\balors que\b|\bsans\b|\bpas\b|\bjamais\b|\bpersonne\b|\bvrai(?:e|s)?\b|\bfaux\b|\bvérité\b|\bpourquoi\b|\bpire\b|…|\.\.\.|\bet si\b|\bque\b.*\bne\b)/i;

function chars(s: string): number {
  return Array.from(s.trim()).length;
}

/** Note un titre sur 100 selon les critères observés dans les transcripts de référence. */
export function scoreTitle(raw: string): TitleScore {
  const title = (raw ?? "").trim();
  const len = chars(title);
  const criteria: TitleCriterion[] = [];
  const add = (id: string, label: string, ok: boolean, points: number, hint: string) => criteria.push({ id, label, ok, points: ok ? points : 0, hint });

  add("length", `Moins de ${TITLE_MAX_CHARS} caractères`, len > 0 && len <= TITLE_MAX_CHARS, 20, len > TITLE_MAX_CHARS ? `Trop long (${len} caractères) : il sera coupé sur mobile.` : len === 0 ? "Titre vide." : "");
  add("not_short", "Assez précis (25 caractères ou plus)", len >= 25, 5, "Trop court pour porter une promesse.");
  add("sentence", "Vraie phrase ou vraie question, sans deux-points", !/:/.test(title) && /[a-zéèêàùç]{3,}\s+[a-zéèêàùç]{2,}/i.test(title), 15, "Pas de fragment coupé par deux-points : écris une phrase que tu dirais à voix haute.");
  add("you", "Parle à « tu » ou pose une question", /\b(tu|ton|ta|tes|t'|toi|te)\b/i.test(title) || /\?\s*$/.test(title), 15, "Le titre doit parler à une personne précise.");
  add("curiosity", "Un contraste ou un manque à combler", CONTRAST.test(title) || /\?\s*$/.test(title), 15, "Ajoute une tension : un « mais », un « pourquoi », un « pas X, mais Y ».");
  add("specific", "Un élément concret (chiffre ou objet du quotidien)", /\d/.test(title) || /\b(balance|assiette|ventre|week-end|carnet|séance|séries?|protéines?|créatine|muscle|gras|poids|salle|diète|sèche|pas|repas|soir|matin)\b/i.test(title), 10, "Un chiffre ou un objet du quotidien rend le titre précis.");
  add("simple_words", "Mots simples, aucun mot technique en tête", !TECH_WORDS.test(title) && !JARGON_BANNED.test(title), 10, "Remplace le mot technique par le mot du quotidien.");
  add("no_clickbait", "Aucune promesse mensongère ni mot d'appât", !CLICKBAIT.test(title), 10, "Retire les mots d'appât : le titre doit être tenu dans la vidéo.");
  add("clean", "Pas de tiret cadratin, pas de MAJUSCULES criées", !/[—–]/.test(title) && !/\b[A-ZÉÈÀ]{6,}\b/.test(title), 0, "Pas de tiret cadratin, pas de mot entier en majuscules.");

  let score = criteria.reduce((n, c) => n + c.points, 0);
  const clean = criteria.find((c) => c.id === "clean");
  if (clean && !clean.ok) score = Math.max(0, score - 15);
  return { score: Math.min(100, score), criteria };
}

export interface TitleCandidate {
  text: string;
  angle: TitleAngle;
  score: number;
}

export interface TitleInput {
  /** Le sujet en quelques mots (ex. « perdre du ventre »). */
  subject?: string;
  /** La douleur du spectateur, à la 2e personne (ex. « tu fais des abdos tous les soirs »). */
  pain?: string;
  /** Le résultat visé (ex. « perdre ton ventre »). */
  result?: string;
  /** L'erreur à arrêter, à l'infinitif (ex. « faire des abdos pour perdre du ventre »). */
  mistake?: string;
  /** L'idée reçue (ex. « manger le soir fait grossir »). */
  myth?: string;
  /** La vérité qui la renverse (ex. « ton total de la semaine décide »). */
  truth?: string;
  /** Le nombre de raisons, d'erreurs ou d'étapes. */
  count?: number;
  /** Le public visé pour un titre filtre (ex. « t'as 30 ans et tu commences la muscu »). */
  audience?: string;
}

function cap(s: string): string {
  const t = s.trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
}

function clean(s: string | undefined): string {
  return (s ?? "").trim().replace(/[.!?…]+$/g, "").replace(/\s+/g, " ");
}

/**
 * Candidats de titres par angle, avec leur note. Les gabarits viennent de
 * mécanismes observés dans les références (titres de Yomi Denzel, Marvin
 * Ndiaye, ThePrepDad, Hormozi), jamais de phrases recopiées.
 */
export function generateTitles(input: TitleInput): TitleCandidate[] {
  const subject = clean(input.subject);
  const pain = clean(input.pain);
  const result = clean(input.result);
  const mistake = clean(input.mistake);
  const myth = clean(input.myth);
  const truth = clean(input.truth);
  const audience = clean(input.audience);
  const n = input.count && input.count >= 2 && input.count <= 9 ? Math.round(input.count) : null;
  const out: { text: string; angle: TitleAngle }[] = [];
  const push = (angle: TitleAngle, text: string) => {
    const t = text.replace(/\s+/g, " ").trim();
    if (t) out.push({ angle, text: t });
  };

  // Curiosité
  if (pain) push("curiosite", `${cap(pain)} et rien ne change ? Voilà pourquoi`);
  if (pain && truth) push("curiosite", `${cap(pain)}, et pourtant ${truth}`);
  if (subject) push("curiosite", `Ce qu'on te dit pas sur ${subject}`);
  if (result) push("curiosite", `Pourquoi tu n'arrives pas à ${result.replace(/^(?:à )/, "")}`);

  // Résultat
  if (result) {
    push("resultat", `La méthode la plus simple pour ${result}`);
    push("resultat", `Comment ${result} sans te prendre la tête`);
    push("resultat", `Donne-moi 10 minutes et tu sauras ${result}`);
  }

  // Erreur
  if (mistake) {
    push("erreur", `Arrête de ${mistake}`);
    push("erreur", `Ne fais surtout pas ça : ${mistake}`.replace(" : ", ", "));
  }
  if (n && subject) push("erreur", `Les ${n} erreurs qui bloquent ${subject}`);

  // Contre-pied
  if (myth) {
    push("contre_pied", `${cap(myth)} ? Voilà la vérité`);
    push("contre_pied", `${cap(myth)}, c'est faux (et voilà pourquoi)`);
  }
  if (myth && truth) push("contre_pied", `Tu penses que ${myth}. En vrai, ${truth}`);
  if (pain && result) push("contre_pied", `Tu peux ${pain.replace(/^tu /i, "")}… et ne jamais ${result.replace(/^(?:à )/, "")}`);

  // Chiffre fermé
  if (n && subject) {
    push("chiffre", `Il y a que ${n} raisons pour lesquelles ${subject}`);
    push("chiffre", `${n} choses à savoir sur ${subject} (pas plus)`);
  }

  // Filtre d'audience
  if (audience) {
    push("filtre", `${cap(audience)} ? Regarde ça`);
    push("filtre", `Si ${audience}, cette vidéo est pour toi`);
  }

  const seen = new Set<string>();
  const scored: TitleCandidate[] = [];
  for (const c of out) {
    const key = c.text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    scored.push({ ...c, score: scoreTitle(c.text).score });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, 10);
}

// ── Miniatures ───────────────────────────────────────────────────────────

export interface ThumbnailConcept {
  id: "face_objet" | "avant_apres_idee" | "objet_seul";
  label: string;
  composition: string;
  emotion: string;
  contrast: string;
  /** Texte court optionnel, 2 à 4 mots, qui crée une tension avec le titre. */
  textOptions: string[];
}

export interface ThumbnailIdeas {
  concepts: ThumbnailConcept[];
  abTest: string[];
  rules: string[];
}

const OBJECTS: [RegExp, string][] = [
  [/balance|poids|kilo/i, "une balance de salle de bain, grosse, au premier plan"],
  [/ventre|taille|abdos/i, "un mètre ruban autour de la taille, en gros plan"],
  [/prot[ée]ine|whey|assiette|manger|repas|diète|calorie|week-end|écart/i, "une assiette vue de dessus, avec un seul aliment bien lisible"],
  [/cr[ée]atine|compl[ée]ment|shaker/i, "un pot de poudre et un shaker, sans marque visible"],
  [/carnet|s[ée]rie|s[ée]ance|charge|force|stagn/i, "un carnet d'entraînement ouvert avec les chiffres qui se répètent"],
  [/sommeil|fatigue|motivation|craque|soir/i, "un frigo ou un placard ouvert dans la pénombre"],
];

export function thumbnailObject(subject: string): string {
  for (const [re, obj] of OBJECTS) if (re.test(subject)) return obj;
  return "un seul objet du quotidien lié au sujet, très gros, sans marque visible";
}

/** Texte de miniature : 2 à 4 mots maximum, une tension plutôt qu'une répétition du titre. */
export function thumbnailTextOptions(title: string): string[] {
  const t = title.trim();
  const opts: string[] = [];
  const num = t.match(/\b(\d+)\s+([a-zéèêàùç]+)/i);
  if (num) opts.push(`${num[1]} ${num[2]} ?`.toUpperCase());
  const neg = t.match(/\bpas\s+([a-zéèêàùç']+)/i);
  if (neg) opts.push(`PAS ${neg[1]}`.toUpperCase().replace(/'$/, ""));
  if (/pourquoi|\?/.test(t)) opts.push("LA VRAIE RAISON");
  if (/erreur|arrête|ne fais/i.test(t)) opts.push("STOP");
  if (/mythe|faux|vérité|vrai/i.test(t)) opts.push("FAUX ?");
  const uniq = Array.from(new Set(opts.map((o) => o.trim()))).filter((o) => o.split(/\s+/).length <= 4);
  return uniq.slice(0, 3);
}

export function thumbnailIdeas(input: { title: string; subject?: string }): ThumbnailIdeas {
  const subject = `${input.subject ?? ""} ${input.title}`;
  const obj = thumbnailObject(subject);
  const textOptions = thumbnailTextOptions(input.title);
  const concepts: ThumbnailConcept[] = [
    {
      id: "face_objet",
      label: "Visage et objet",
      composition: `Emmanuel à gauche, buste cadré serré, regard caméra ; à droite ${obj}. Un seul sujet par côté, rien d'autre dans le cadre.`,
      emotion: "Doute ou agacement franc, sourcil levé : il sait quelque chose que le spectateur ignore.",
      contrast: "Fond sombre uni, une seule couleur d'accent sur l'objet, visage bien éclairé.",
      textOptions,
    },
    {
      id: "avant_apres_idee",
      label: "Deux côtés, l'idée reçue contre la réalité",
      composition: "Cadre coupé en deux : à gauche ce que le spectateur croit, à droite ce qui est vrai, avec le même objet photographié des deux côtés.",
      emotion: "Calme et sûr à droite, scepticisme à gauche.",
      contrast: "Côté idée reçue désaturé, côté vérité plus clair avec l'accent de couleur.",
      textOptions,
    },
    {
      id: "objet_seul",
      label: "Objet seul, très gros plan",
      composition: `Sans visage : ${obj}, remplissant les deux tiers du cadre, avec une zone vide pour respirer.`,
      emotion: "La tension vient de l'objet seul : on se demande pourquoi il est là.",
      contrast: "Fond uni très différent de la couleur de l'objet.",
      textOptions: [],
    },
  ];
  return {
    concepts,
    abTest: [
      "Garde le même titre et ne change qu'une variable à la fois entre la miniature A et la miniature B (soit l'expression du visage, soit l'objet, soit le texte).",
      "Si ta chaîne propose le test de miniatures dans YouTube Studio, lance A contre B pendant la première semaine. Sinon, garde A et remplace par B au bout de 7 jours si la vidéo est sous ta moyenne.",
      "Décide sur les clics par affichage, pas sur les vues du premier jour.",
    ],
    rules: [
      "Lisible en 1 seconde à la taille d'un timbre : un sujet principal, un contraste fort.",
      "Principalement visuelle. Si tu ajoutes un texte : 2 à 4 mots maximum, qui ajoute une tension au titre au lieu de le répéter.",
      "Garde les vraies proportions du visage et du corps. Aucun logo, aucun chiffre ni élément de preuve qui ne figure pas dans la vidéo.",
      "Les 10 premières secondes de la vidéo doivent tenir la promesse du titre et de la miniature.",
    ],
  };
}

// ── Plan de la vidéo (chronologie, relances) ─────────────────────────────

export interface BlueprintSegment {
  id: string;
  label: string;
  startSec: number;
  endSec: number;
  words: number;
  note: string;
}

export interface RetentionBeat {
  atSec: number;
  kind: "relance" | "boucle" | "rappel_ressource" | "recap";
  idea: string;
}

export interface VideoBlueprint {
  durationSec: number;
  totalWords: number;
  segments: BlueprintSegment[];
  beats: RetentionBeat[];
  chapters: Chapter[];
}

export function fmtTime(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

const RELANCE_IDEAS = [
  "Regarde bien ce calcul.",
  "Retiens bien ça, c'est là que la plupart des gens décrochent.",
  "Et là, tu dois te dire : pourquoi ? Je m'explique.",
  "Mets pause et fais-le maintenant, je t'attends.",
  "Jusqu'ici on a parlé de A. Maintenant, le nerf de la guerre : B.",
  "Et ça, ça change tout.",
  "Dernière pièce du puzzle.",
];

/**
 * Chronologie d'une vidéo longue : hook 0-30 s, promesse, plan, N parties,
 * récap, demandes de fin ; avec une relance toutes les 2 à 3 minutes, la
 * boucle ouverte posée dans la promesse et refermée sur le dernier point, et
 * le rappel de la ressource vers le milieu.
 */
export function buildVideoBlueprint(input: { durationMin?: number; parts?: number }): VideoBlueprint {
  const durationMin = Math.min(16, Math.max(8, input.durationMin ?? 12));
  const parts = Math.min(6, Math.max(3, Math.round(input.parts ?? 4)));
  const durationSec = Math.round(durationMin * 60);
  const totalWords = Math.round(durationSec * WORDS_PER_SECOND);
  const hookEnd = 30;
  const promiseEnd = 75;
  const recapLen = 60;
  const endLen = 45;
  const bodyStart = promiseEnd;
  const bodyEnd = durationSec - recapLen - endLen;
  const partLen = (bodyEnd - bodyStart) / parts;
  const w = (a: number, b: number) => Math.round((b - a) * WORDS_PER_SECOND);

  const segments: BlueprintSegment[] = [
    { id: "hook", label: "Hook", startSec: 0, endSec: hookEnd, words: w(0, hookEnd), note: "Une douleur précise ou une question, avec les mots du spectateur. Jamais « aujourd'hui on va parler de », jamais « salut c'est » en première phrase. La promesse du titre est tenue dans les 10 premières secondes." },
    { id: "promesse", label: "Présentation, promesse et plan", startSec: hookEnd, endSec: promiseEnd, words: w(hookEnd, promiseEnd), note: "Une phrase de présentation, ce que la personne repart avec, le nombre de parties annoncées, la ressource gratuite en description, et la boucle ouverte (« reste jusqu'au dernier point »). Une nuance si besoin." },
  ];
  for (let i = 0; i < parts; i++) {
    const a = Math.round(bodyStart + i * partLen);
    const b = Math.round(bodyStart + (i + 1) * partLen);
    segments.push({
      id: `partie_${i + 1}`,
      label: i === parts - 1 ? `Partie ${i + 1} (la plus forte, celle de la boucle)` : `Partie ${i + 1}`,
      startSec: a,
      endSec: b,
      words: w(a, b),
      note: "Le problème, ce qui se passe vraiment, que faire. Un exemple chiffré vérifiable, une transition qui donne envie de la suite.",
    });
  }
  segments.push({ id: "recap", label: "Récapitulatif", startSec: bodyEnd, endSec: bodyEnd + recapLen, words: w(bodyEnd, bodyEnd + recapLen), note: "« Donc si je devais récapituler » : une phrase par partie, puis la phrase règle." });
  segments.push({ id: "fin", label: "Demandes de fin", startSec: bodyEnd + recapLen, endSec: durationSec, words: w(bodyEnd + recapLen, durationSec), note: "2 ou 3 demandes : s'abonner, le guide gratuit en description, l'appel ou l'accompagnement en description. Une sortie simple." });

  const beats: RetentionBeat[] = [
    { atSec: 20, kind: "boucle", idea: "Boucle ouverte posée dans la promesse : le point que tu révèles à la fin." },
  ];
  let ri = 0;
  for (let t = bodyStart + 100; t < bodyEnd; t += 130) {
    beats.push({ atSec: t, kind: "relance", idea: RELANCE_IDEAS[ri % RELANCE_IDEAS.length] });
    ri++;
  }
  beats.push({ atSec: Math.round(durationSec * 0.5), kind: "rappel_ressource", idea: "Juste après un moment de forte valeur : « petite parenthèse, le guide est dans la description », une raison d'y aller maintenant, puis « on reprend »." });
  beats.push({ atSec: bodyEnd - 5, kind: "boucle", idea: "Tu refermes la boucle : « le point que je t'avais annoncé »." });
  beats.push({ atSec: bodyEnd, kind: "recap", idea: "Récap et phrase règle." });
  beats.sort((a, b) => a.atSec - b.atSec);

  const chapters: Chapter[] = [
    { startSec: 0, label: "Intro" },
    ...segments.filter((s) => s.id.startsWith("partie_")).map((s, i) => ({ startSec: s.startSec, label: `Partie ${i + 1}` })),
    { startSec: bodyEnd, label: "Récap" },
  ];
  return { durationSec, totalWords, segments, beats, chapters };
}

// ── Chapitres horodatés (plan de production) ─────────────────────────────

export interface Chapter {
  startSec: number;
  label: string;
}

const ORDINAL = "(?:premi(?:er|ère)|deuxi[èe]me|troisi[èe]me|quatri[èe]me|cinqui[èe]me|sixi[èe]me|septi[èe]me|dernier|dernière)";
const PART_NOUN = "(?:point|chose|erreur|raison|partie|truc|croyance|mythe|levier|étape)";
const MARKER_RE = new RegExp(`^(?:maintenant(?:,| que [^,]+,)?\\s*(?:on\\s+)?(?:passons|passe|on passe)\\s+(?:au|à la|à l')\\s*)?${ORDINAL}\\s+${PART_NOUN}\\b`, "i");
const RECAP_RE = /r[ée]capitul/i;

function paragraphs(content: string): string[] {
  return content.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
}

function wordCount(s: string): number {
  return (s.match(/[\p{L}\p{N}'’-]+/gu) ?? []).length;
}

function chapterLabel(p: string): string {
  // « Premier point : ton objectif n'est pas précis. » → « ton objectif n'est pas précis »
  const afterColon = p.split(/\n/)[0].match(/:\s*([^.?!]{6,80})/);
  let label = afterColon ? afterColon[1] : p.split(/[.?!]/)[0];
  label = label.replace(/^(?:et |mais |donc )/i, "").trim();
  if (label.length > 60) label = label.slice(0, 57).replace(/\s+\S*$/, "") + "...";
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * Chapitres estimés d'un script : l'intro à 00:00, une entrée par partie
 * annoncée à l'oral et le récap. Horodatage proportionnel au nombre de mots.
 * Plan de production, jamais écrit dans le texte parlé.
 */
export function extractChapters(content: string | null | undefined, durationSec?: number | null): Chapter[] {
  const text = (content ?? "").trim();
  if (!text) return [];
  const paras = paragraphs(text);
  const total = paras.reduce((n, p) => n + wordCount(p), 0);
  if (total < 200) return [];
  const duration = durationSec && durationSec > 60 ? durationSec : Math.round(total / WORDS_PER_SECOND);
  const found: Chapter[] = [];
  let acc = 0;
  let recapDone = false;
  for (const p of paras) {
    const at = Math.round((acc / total) * duration);
    if (!recapDone && RECAP_RE.test(p.slice(0, 120))) {
      found.push({ startSec: at, label: "Récap" });
      recapDone = true;
    } else if (!recapDone && MARKER_RE.test(p)) {
      found.push({ startSec: at, label: chapterLabel(p) });
    }
    acc += wordCount(p);
  }
  const chapters: Chapter[] = [{ startSec: 0, label: "Intro" }, ...found];
  // Garde-fous YouTube : 3 chapitres minimum, 10 secondes minimum chacun.
  const filtered = chapters.filter((c, i) => i === 0 || c.startSec - chapters[i - 1].startSec >= 10);
  return filtered.length >= 3 ? filtered : [];
}

export function formatChapters(chapters: Chapter[]): string {
  return chapters.map((c) => `${fmtTime(c.startSec)} ${c.label}`).join("\n");
}

// ── Description YouTube (modèle d'Emmanuel, Centre de commandes A4) ──────

export const YT_LINKS = {
  app: "https://ep-coaching.vercel.app/auth/client",
  call: "https://ep-coaching-formulaires.vercel.app/prequalification",
  site: "https://santamariasanchez.github.io/EPCoaching/",
  instagram: "https://www.instagram.com/santamariasanchezep_/",
};

export const YT_WHO =
  "Je suis Emmanuel Santamaria Sanchéz, coach en bodybuilding natural et fondateur d'EP Coaching. J'accompagne des gens qui veulent transformer leur physique avec un vrai suivi dans la durée, et je suis aussi coach pour les coachs qui veulent développer leur activité. Progresser plus vite, avec quelqu'un qui bosse avec toi.";

export interface DescriptionInput {
  /** Slug réel du guide qui prolonge la vidéo (lead_magnets). */
  guideSlug: string;
  /** Phrase qui donne envie, avant le lien. */
  firstLine?: string;
  falseProblem: string;
  trueProblem: string;
  /** « Dans cette vidéo, je te montre... » (la fin de la phrase). */
  promise: string;
  /** Phrase règle courte qui claque. */
  rule: string;
  /** Question simple pour les commentaires. */
  question: string;
  themes: string;
  hashtags: string[];
  /** Ajoute le bloc de chapitres (désactivé par défaut : Emmanuel n'en veut pas en description publique). */
  chapters?: Chapter[];
}

export function buildYoutubeDescription(d: DescriptionInput): string {
  const first = d.firstLine?.trim() || "Je t'ai préparé un guide gratuit que tu peux appliquer dès maintenant, clique ici pour y accéder :";
  const lines: string[] = [
    `${first}\nhttps://ep-coaching.vercel.app/ressources/${d.guideSlug}`,
    `Tu penses que ${d.falseProblem.replace(/^tu penses que /i, "")}. En réalité, ${d.trueProblem} Dans cette vidéo, je te montre ${d.promise.replace(/^je te montre /i, "")}`,
    d.rule,
    d.question,
    `Abonne-toi si tu veux plus de vidéos sur ${d.themes}. Bon visionnage !`,
  ];
  if (d.chapters && d.chapters.length >= 3) lines.push(formatChapters(d.chapters));
  lines.push(
    `Mon application, avec essai gratuit :\n${YT_LINKS.app}`,
    `Réserver un appel :\n${YT_LINKS.call}`,
    `Mon site :\n${YT_LINKS.site}`,
    `Mon Instagram :\n${YT_LINKS.instagram}`,
    YT_WHO,
    d.hashtags.slice(0, 5).map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" "),
  );
  return lines.join("\n\n");
}

export interface DescriptionIssue {
  id: string;
  ok: boolean;
  text: string;
}

/** Contrôle d'une description YouTube contre le modèle d'Emmanuel. */
export function checkDescription(desc: string | null | undefined): DescriptionIssue[] {
  const d = (desc ?? "").trim();
  const firstLines = d.split("\n").slice(0, 3).join("\n");
  const links = d.match(/https?:\/\/\S+/g) ?? [];
  const checks: DescriptionIssue[] = [
    { id: "empty", ok: d.length > 0, text: "La description est écrite." },
    { id: "guide_first", ok: /ep-coaching\.vercel\.app\/ressources\//.test(firstLines), text: "La première ligne renvoie vers le guide qui prolonge la vidéo." },
    { id: "clean_links", ok: links.every((l) => !/[?&](utm_|ref=)/.test(l)), text: "Les liens sont nus, sans paramètre." },
    { id: "subscribe", ok: /abonne/i.test(d), text: "Une phrase d'abonnement." },
    { id: "question", ok: /\?/.test(d), text: "Une question pour les commentaires." },
    { id: "links_block", ok: ["ep-coaching.vercel.app/auth/client", "prequalification", "santamariasanchez.github.io/EPCoaching", "instagram.com/santamariasanchezep_"].every((l) => d.includes(l)), text: "Le bloc de liens est complet (appli, appel, site, Instagram)." },
    { id: "who", ok: /Emmanuel Santamaria Sanchéz/.test(d), text: "Le « qui je suis » avec le nom public." },
    { id: "hashtags", ok: (d.match(/#[\p{L}\p{N}_]+/gu) ?? []).length >= 3 && (d.match(/#[\p{L}\p{N}_]+/gu) ?? []).length <= 5, text: "3 à 5 hashtags." },
    { id: "forbidden", ok: !/[—–]/.test(d) && !/lien en bio/i.test(d) && !/commente\s+\d{3}/i.test(d), text: "Pas de tiret cadratin, de « lien en bio » ni de « commente un numéro »." },
  ];
  return checks;
}

// ── Analyse d'un script (rétention, structure, règles de marque) ─────────

export interface ScriptCheck {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
  weight: number;
}

export interface ScriptAnalysis {
  score: number;
  words: number;
  minutes: number;
  checks: ScriptCheck[];
  chapters: Chapter[];
  longestGapSec: number;
}

const BANNED_OPENINGS = /^(?:salut|bonjour|hello|hey|aujourd'hui|dans cette vidéo|je suis|c'est (?:emmanuel|santamaria)|bienvenue)/i;
const LOOP_OPEN = /reste (?:bien )?jusqu'au bout|reste bien|je te r[ée]v[èe]le|je te le montre|dans quelques (?:secondes|minutes)|dans (?:vingt|20) secondes|plus tard dans cette vid[ée]o|je t'en dis pas plus|le dernier point|celui que je t'annonce|à la fin de cette vid[ée]o|c'est pas celui que tu crois/i;
const LOOP_CLOSE = /celui que je t'ai annonc[ée]|que je t'avais annonc[ée]|comme promis|je t'avais dit|celui que je t'ai parl[ée]|le dernier point, celui/i;
const RELANCE = /regarde bien|retiens bien|mets pause|note-le|note ça|ça change tout|dernière pièce|nerf de la guerre|tu dois te dire|je m'explique|on change de|maintenant,? (?:passons|on passe)|jusqu'ici on a parl[ée]|avant ça|hyper important|ce passage est important|tu sais ce que je fais/i;

interface Para {
  text: string;
  startWord: number;
  words: number;
}

function toParas(content: string): Para[] {
  let acc = 0;
  return paragraphs(content).map((text) => {
    const words = wordCount(text);
    const p = { text, startWord: acc, words };
    acc += words;
    return p;
  });
}

/** Audit complet d'un script YouTube : rétention, structure, règles de marque. */
export function analyzeYoutubeScript(input: { content: string | null | undefined; durationSec?: number | null }): ScriptAnalysis {
  const content = (input.content ?? "").trim();
  const paras = toParas(content);
  const words = paras.reduce((n, p) => n + p.words, 0);
  const duration = input.durationSec && input.durationSec > 60 ? input.durationSec : Math.round(words / WORDS_PER_SECOND);
  const minutes = Math.round((duration / 60) * 10) / 10;
  const checks: ScriptCheck[] = [];
  const add = (id: string, label: string, ok: boolean, detail: string, weight: number) => checks.push({ id, label, ok, detail, weight });

  if (!words) return { score: 0, words: 0, minutes: 0, checks: [], chapters: [], longestGapSec: 0 };

  const wordsAt = (pct: number) => Math.round(words * pct);
  const textBetween = (fromW: number, toW: number) => paras.filter((p) => p.startWord + p.words > fromW && p.startWord < toW).map((p) => p.text).join("\n\n");
  const first30Words = Math.round(30 * WORDS_PER_SECOND); // 69 mots
  const openingPara = paras[0]?.text ?? "";

  // 1. Hook
  add("hook_open", "Ouverture sur une douleur ou une question, pas sur une formule d'accueil", !BANNED_OPENINGS.test(openingPara), BANNED_OPENINGS.test(openingPara) ? "Ouvre sur la douleur du spectateur, jamais « salut », « aujourd'hui » ou ta présentation." : "", 12);
  add("hook_short", "Le hook tient dans les 30 premières secondes", paras[0] ? paras[0].words <= first30Words : false, paras[0] && paras[0].words > first30Words ? `Le premier paragraphe fait ${paras[0].words} mots (${Math.round(paras[0].words / WORDS_PER_SECOND)} s) : coupe à ${first30Words} mots maximum.` : "", 8);

  // 2. Promesse + plan dans les 90 premières secondes
  const early = textBetween(0, Math.round(90 * WORDS_PER_SECOND));
  add("promise", "Promesse claire (« dans cette vidéo, je te montre... ») dans les 90 premières secondes", /dans cette vid[ée]o/i.test(early), "Dis concrètement ce que la personne repart avec.", 10);
  add("plan", "Plan annoncé (nombre de parties) dans les 90 premières secondes", /\b(?:deux|trois|quatre|cinq|six|sept|2|3|4|5|6|7)\s+(?:points?|choses?|raisons?|erreurs?|parties|étapes|croyances|leviers|idées)/i.test(early), "Annonce le nombre de parties : on reste quand on sait où on va.", 8);

  // 3. Boucle ouverte, refermée
  const openLoop = LOOP_OPEN.test(textBetween(0, wordsAt(0.3)));
  const closeLoop = LOOP_CLOSE.test(textBetween(wordsAt(0.45), words));
  add("loop_open", "Une boucle ouverte dans le premier tiers", openLoop, "Annonce un point que tu révèles plus tard (« reste jusqu'au dernier point »).", 8);
  add("loop_close", "La boucle est refermée avant la fin", !openLoop || closeLoop, openLoop && !closeLoop ? "Tu as ouvert une boucle : referme-la (« le point que je t'avais annoncé »)." : "", 6);

  // 4. Ressource gratuite annoncée tôt, rappelée au milieu
  const resourceEarly = /description/i.test(textBetween(0, wordsAt(0.25)));
  add("resource_early", "La ressource gratuite est annoncée dans le premier quart", resourceEarly, "Annonce le guide gratuit dès la promesse : « le lien est dans la description ».", 5);
  const mid = textBetween(wordsAt(0.3), wordsAt(0.7));
  add("resource_mid", "Rappel de la description vers le milieu", /description/i.test(mid), "Place une courte parenthèse juste après un moment de forte valeur, puis « on reprend ».", 8);

  // 5. Relances : pas plus de 3 minutes sans relance
  const markers: number[] = [0];
  for (const p of paras) if (RELANCE.test(p.text) || MARKER_RE.test(p.text) || LOOP_OPEN.test(p.text) || /petite parenth[èe]se|description/i.test(p.text)) markers.push(p.startWord);
  markers.push(words);
  let longest = 0;
  for (let i = 1; i < markers.length; i++) longest = Math.max(longest, markers[i] - markers[i - 1]);
  const longestSec = Math.round(longest / WORDS_PER_SECOND);
  add("relances", "Une relance au moins toutes les 3 minutes", longestSec <= 180, longestSec > 180 ? `Plus longue stretch sans relance : ${fmtTime(longestSec)}. Ajoute un « regarde bien », un « retiens ça » ou une transition qui donne envie.` : "", 14);
  const benefit = (content.match(/\b(?:ça va te|tu vas pouvoir|tu vas comprendre|c'est ce qui|c'est là que|ça change tout|c'est pour ça que)\b/gi) ?? []).length;
  add("benefit", "Le bénéfice est rappelé au fil de la vidéo", benefit >= Math.floor(minutes / 3), "Rappelle toutes les 2 à 3 minutes pourquoi continuer à regarder.", 4);

  // 6. Récap et fin
  add("recap", "Récapitulatif (« donc si je devais récapituler »)", /r[ée]capitul/i.test(textBetween(wordsAt(0.7), words)), "Une phrase par partie, puis la phrase règle.", 6);
  const end = textBetween(wordsAt(0.88), words);
  add("end_asks", "2 ou 3 demandes en fin de vidéo (abonnement, guide en description, appel en description)", /abonne/i.test(end) && /description/i.test(end), "Termine par l'abonnement et le renvoi vers la description.", 6);

  // 7. Exemples chiffrés
  const digits = (content.match(/\d/g) ?? []).length;
  add("examples", "Au moins un exemple chiffré vérifiable", digits >= 6, "Un cas type chiffré : calories, séries, pas, grammes. Jamais un résultat inventé.", 4);

  // 8. Durée
  add("length", "Entre 10 et 14 minutes parlées", minutes >= 9.5 && minutes <= 15, `${minutes} minutes pour ${words} mots (environ ${Math.round(WORDS_PER_SECOND * 60 * 10)} à ${Math.round(WORDS_PER_SECOND * 60 * 14)} mots visés).`, 4);

  // 9. Règles de marque
  const issues = checkVocabulary(content);
  const brand: string[] = issues.map((i) => i.why);
  if (usesVous(content)) brand.push("Vouvoiement : tutoie partout");
  if (/\[CHAPITRE|\b\d{1,2}:\d{2}\b/.test(content)) brand.push("Chapitre ou timecode écrit dans le texte parlé (le plan de chapitres vit à part)");
  if (/\bSantamaria Sanchéz\b/.test(content) && !/Emmanuel Santamaria Sanchéz/.test(content)) brand.push("Nom public : « Emmanuel Santamaria Sanchéz »");
  if (/commente\s+(?:le\s+)?(?:num[ée]ro\s+)?\d{3,4}\b/i.test(content)) brand.push("Pas de « commente un numéro » sur YouTube");
  const uniq = Array.from(new Set(brand));
  add("brand", "Règles de marque et vocabulaire respectés", uniq.length === 0, uniq.join(" ; "), 9);

  const total = checks.reduce((n, c) => n + c.weight, 0);
  const got = checks.reduce((n, c) => n + (c.ok ? c.weight : 0), 0);
  return { score: Math.round((got / total) * 100), words, minutes, checks, chapters: extractChapters(content, duration), longestGapSec: longestSec };
}

// ── Clips (reels dérivés d'une vidéo longue) ─────────────────────────────

export const CLIP_CTA = "Commente « VIDEO » pour recevoir la vidéo complète";

export interface ClipPlan {
  n: number;
  /** Position approximative dans la vidéo, en secondes. */
  atSec: number;
  words: number;
  seconds: number;
  text: string;
  /** 4 titres hook (texte à l'écran), 3 à 7 mots, sans ponctuation. */
  hooks: string[];
  description: string;
}

function sentences(text: string): string[] {
  return text.replace(/\n+/g, " ").split(/(?<=[.?!])\s+/).map((s) => s.trim()).filter(Boolean);
}

function punch(s: string): number {
  let n = 0;
  if (/\bpas\b|\bjamais\b|\bpersonne\b|\bfaux\b|\ben réalité\b|\ben vrai\b|\bmais\b|\bsauf que\b/i.test(s)) n += 2;
  if (/\d/.test(s)) n += 1;
  if (/\?/.test(s)) n += 1;
  if (/\btu\b|\bton\b|\bta\b|\btes\b/i.test(s)) n += 1;
  return n;
}

function stripPunct(s: string): string {
  return s.replace(/["«»“”()[\]]/g, "").replace(/[.,:;!?…]+/g, " ").replace(/\s+/g, " ").trim();
}

/** 4 titres hook à partir des seuls mots du passage. */
export function clipHooks(text: string): string[] {
  const clauses: { t: string; sc: number }[] = [];
  for (const s of sentences(text)) {
    const parts = s.split(/[,:;]\s+|\s+(?:mais|et que|parce que)\s+/i).concat([s]);
    for (const part of parts) {
      const t = stripPunct(part).replace(/^(?:et|mais|donc|alors|ou|puis|car|sauf que)\s+/i, "");
      const n = t.split(/\s+/).length;
      if (n >= 3 && n <= 7) clauses.push({ t, sc: punch(part) + (n >= 4 ? 1 : 0) });
    }
  }
  const out: string[] = [];
  const seen = new Set<string>();
  for (const c of clauses.sort((a, b) => b.sc - a.sc)) {
    const key = c.t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c.t.charAt(0).toUpperCase() + c.t.slice(1));
    if (out.length === 4) break;
  }
  return out;
}

function clipDescription(text: string): string {
  const short = sentences(text).map(stripPunct).filter((s) => { const n = s.split(/\s+/).length; return n >= 4 && n <= 12; });
  const body = short.slice(0, 2).join("\n");
  return ["Abonne toi", body, CLIP_CTA].filter(Boolean).join("\n");
}

/** Passages de 30 à 60 secondes à sortir en reels, avec 4 titres hook et la description. */
export function deriveClips(content: string | null | undefined, durationSec?: number | null, max = 6): ClipPlan[] {
  const paras = toParas((content ?? "").trim());
  const total = paras.reduce((n, p) => n + p.words, 0);
  if (total < 400) return [];
  const duration = durationSec && durationSec > 60 ? durationSec : Math.round(total / WORDS_PER_SECOND);
  const candidates: { start: number; end: number; score: number }[] = [];
  for (let i = 0; i < paras.length; i++) {
    const p = paras[i];
    if (i === 0 || i >= paras.length - 3) continue; // l'intro et la fin portent les demandes
    if (/description|abonne|r[ée]capitul/i.test(p.text)) continue;
    let words = 0;
    let end = i;
    while (end < paras.length && words < 90) {
      if (/description|abonne|r[ée]capitul/i.test(paras[end].text)) break;
      words += paras[end].words;
      end++;
    }
    if (words < 60 || words > 170) continue;
    const text = paras.slice(i, end).map((q) => q.text).join(" ");
    const sc = sentences(text).reduce((n, s) => n + punch(s), 0) + (MARKER_RE.test(p.text) ? 3 : 0);
    candidates.push({ start: i, end, score: sc });
  }
  const chosen: { start: number; end: number }[] = [];
  for (const c of candidates.sort((a, b) => b.score - a.score)) {
    if (chosen.some((x) => c.start < x.end && c.end > x.start)) continue;
    chosen.push(c);
    if (chosen.length === max) break;
  }
  chosen.sort((a, b) => a.start - b.start);
  return chosen.map((c, idx) => {
    const text = paras.slice(c.start, c.end).map((q) => q.text).join("\n\n");
    const w = wordCount(text);
    return {
      n: idx + 1,
      atSec: Math.round((paras[c.start].startWord / total) * duration),
      words: w,
      seconds: Math.round(w / 2.6),
      text,
      hooks: clipHooks(text),
      description: clipDescription(text),
    };
  });
}

// ── Checklist de publication et de recyclage ─────────────────────────────

export interface ChecklistItem {
  id: string;
  group: "avant" | "tournage" | "publication" | "apres" | "recyclage";
  label: string;
}

export const CHECKLIST_GROUPS: { id: ChecklistItem["group"]; label: string }[] = [
  { id: "avant", label: "Avant de tourner" },
  { id: "tournage", label: "Tournage et montage" },
  { id: "publication", label: "Publication" },
  { id: "apres", label: "48 heures après" },
  { id: "recyclage", label: "Recyclage" },
];

export const PUBLISH_CHECKLIST: ChecklistItem[] = [
  { id: "titre_choisi", group: "avant", label: "Titre choisi parmi plusieurs candidats (moins de 60 caractères, score 70 ou plus)" },
  { id: "hooks_testes", group: "avant", label: "3 hooks écrits de 3 types différents, le plus fort gardé" },
  { id: "structure_choisie", group: "avant", label: "Structure Y choisie, différente des dernières vidéos (Journal de rotation)" },
  { id: "guide_existe", group: "avant", label: "Le guide gratuit existe et prolonge exactement la vidéo" },
  { id: "miniature_ab", group: "avant", label: "Deux miniatures A et B pensées (une seule variable qui change)" },
  { id: "relances_filmees", group: "tournage", label: "Les relances sont dites (une toutes les 2 à 3 minutes) et la boucle est refermée" },
  { id: "montage_rythme", group: "tournage", label: "Respirations coupées, un changement visuel à chaque relance" },
  { id: "dix_secondes", group: "tournage", label: "Les 10 premières secondes tiennent la promesse du titre et de la miniature" },
  { id: "description_collee", group: "publication", label: "Description collée : lien du guide en première ligne, liens nus, 3 à 5 hashtags" },
  { id: "miniature_posee", group: "publication", label: "Miniature A posée" },
  { id: "commentaire_epingle", group: "publication", label: "Commentaire épinglé avec la ressource gratuite" },
  { id: "playlist_fin", group: "publication", label: "Playlist, écran de fin et carte vers la vidéo suivante" },
  { id: "journal_rotation", group: "publication", label: "Ligne ajoutée au Journal de rotation" },
  { id: "retention_lue", group: "apres", label: "Courbe de rétention regardée : à quel moment ça décroche, et pourquoi" },
  { id: "ctr_lu", group: "apres", label: "Taux de clic lu : sous ta moyenne, remplace par la miniature B" },
  { id: "commentaires_repondus", group: "apres", label: "Commentaires répondus, les vraies questions notées pour de prochains contenus" },
  { id: "clips_poses", group: "recyclage", label: "3 clips sortis en reels avec « Commente VIDEO pour recevoir la vidéo complète »" },
  { id: "post_ecrit", group: "recyclage", label: "Un post LinkedIn et un post Threads tirés de la vidéo" },
  { id: "carrousel", group: "recyclage", label: "Un carrousel avec les points clés" },
  { id: "mailing", group: "recyclage", label: "Mentionnée dans le prochain mailing" },
];

// ── Plan vidéo enregistré (colonne coach_scripts.video_plan) ─────────────

export interface VideoPlan {
  structure?: string;
  hookType?: string;
  hookId?: string;
  /** Titres candidats gardés par le coach (le titre retenu est coach_scripts.title). */
  titles?: string[];
  thumbA?: string;
  thumbB?: string;
  checklist?: Record<string, boolean>;
}

function str(v: unknown, max: number): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined;
}

export function cleanVideoPlan(raw: unknown): VideoPlan {
  if (!raw || typeof raw !== "object") return {};
  const r = raw as Record<string, unknown>;
  const plan: VideoPlan = {};
  const structure = str(r.structure, 4);
  if (structure && getYtStructure(structure)) plan.structure = structure;
  const hookType = str(r.hookType, 3);
  if (hookType && getHookType(hookType)) plan.hookType = hookType;
  const hookId = str(r.hookId, 4);
  if (hookId && /^H\d{2}$/.test(hookId)) plan.hookId = hookId;
  if (Array.isArray(r.titles)) plan.titles = r.titles.filter((t): t is string => typeof t === "string").map((t) => t.trim().slice(0, 120)).filter(Boolean).slice(0, 10);
  const thumbA = str(r.thumbA, 400);
  if (thumbA) plan.thumbA = thumbA;
  const thumbB = str(r.thumbB, 400);
  if (thumbB) plan.thumbB = thumbB;
  if (r.checklist && typeof r.checklist === "object") {
    const known = new Set(PUBLISH_CHECKLIST.map((c) => c.id));
    const list: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(r.checklist as Record<string, unknown>)) if (known.has(k) && v === true) list[k] = true;
    plan.checklist = list;
  }
  return plan;
}

/** Cases cochées automatiquement à partir de ce que le Studio sait déjà. */
export function autoChecklist(input: { title: string; description: string | null | undefined; content: string | null | undefined; plan: VideoPlan }): Record<string, boolean> {
  const auto: Record<string, boolean> = {};
  if (scoreTitle(input.title).score >= 70) auto.titre_choisi = true;
  if (input.plan.structure) auto.structure_choisie = true;
  if (input.plan.thumbA && input.plan.thumbB) auto.miniature_ab = true;
  const desc = checkDescription(input.description);
  if (desc.filter((d) => d.id !== "hashtags").every((d) => d.ok)) auto.description_collee = true;
  const a = analyzeYoutubeScript({ content: input.content });
  if (a.checks.find((c) => c.id === "loop_close")?.ok && a.checks.find((c) => c.id === "relances")?.ok) auto.relances_filmees = true;
  return auto;
}

// ── Journal de rotation ──────────────────────────────────────────────────

export interface JournalRow {
  Sujet: string;
  Plateforme: string;
  Format: string;
  Structure: string;
  "Type de hook": string;
  "ID hook": string;
  Pilier: string;
  "Source d'inspiration": string;
  Appel: string;
  "Script id": string;
}

export function journalRow(input: { id: string; title: string; pillar?: string | null; contentFormat?: string | null; sourceReference?: string | null; plan: VideoPlan }): JournalRow {
  const ref = input.sourceReference ?? "";
  const m = ref.match(/lead_magnets:(\d{3,4})/);
  return {
    Sujet: input.title,
    Plateforme: "youtube",
    Format: input.contentFormat || "face_cam",
    Structure: input.plan.structure ?? "",
    "Type de hook": input.plan.hookType ?? "",
    "ID hook": input.plan.hookId ?? "",
    Pilier: input.pillar ?? "",
    "Source d'inspiration": "",
    Appel: m ? m[1] : "description",
    "Script id": input.id,
  };
}

// ── Blueprint en texte (connecteur Claude, prompts) ──────────────────────

export function blueprintToText(bp: VideoBlueprint): string {
  const lines = [`Vidéo de ${fmtTime(bp.durationSec)} (environ ${bp.totalWords} mots à 2,3 mots par seconde).`, "", "CHRONOLOGIE"];
  for (const s of bp.segments) lines.push(`- ${fmtTime(s.startSec)} à ${fmtTime(s.endSec)} · ${s.label} (~${s.words} mots) : ${s.note}`);
  lines.push("", "RELANCES ET BOUCLES");
  for (const b of bp.beats) lines.push(`- ${fmtTime(b.atSec)} · ${b.kind.replace("_", " ")} : ${b.idea}`);
  lines.push("", "PLAN DE CHAPITRES (production, jamais écrit dans le texte parlé)", formatChapters(bp.chapters));
  return lines.join("\n");
}
