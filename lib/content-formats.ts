// Formats de contenu du Studio créatif (2026-10-21, demande du fondateur :
// « on a du facecam ok, mais ajoute plus de formats : du B-roll texte donc
// voix off, du yap, des tier lists, le clone donc 2 personnes, le
// question-réponse, le cas client, plein de formats »).
//
// Le FORMAT DE CONTENU (comment la vidéo est construite : face caméra,
// dialogue avec son clone, tier list...) est distinct de la PLATEFORME (où
// elle est postée : reel, YouTube, LinkedIn, Threads) et de la DURÉE
// (court/long, colonne `format` historique). Colonne `content_format` de
// coach_scripts (migration 20261021_coach_scripts_content_format.sql),
// 'face_cam' par défaut : tout script existant reste un face caméra.
//
// Chaque format décrit la FORME du texte attendue dans `content` (répliques
// « A : / B : » pour le clone, blocs « Plan / Écran / Voix off » pour le
// B-roll, lignes « S : élément | pourquoi » pour la tier list...). Une seule
// colonne texte, lisible et modifiable à la main comme avant : le Studio la
// relit (parseScript) pour un affichage adapté, et retombe sur le texte brut
// si elle ne suit pas la forme (aucun ancien script ne casse).
//
// Fichier partagé client/serveur (Studio, connecteur Claude, générateur de
// prompts), sans aucun import serveur.

import type { LucideIcon } from "lucide-react";
import {
  Video, Film, Mic, Trophy, Users, MessageCircleQuestion, UserCheck, MonitorPlay,
  Scale, BookOpen, GalleryHorizontal, MessageSquareReply, ListOrdered, Sun, Dumbbell, Clapperboard,
  AlignLeft, Image as ImageIcon, Smartphone,
} from "lucide-react";
import { VOCABULARY_PROMPT_BLOCK } from "@/lib/content-vocabulary";

export type ScriptShape = "texte" | "points" | "dialogue" | "broll" | "tier" | "paires" | "sections" | "etapes" | "slides" | "frames";

export interface ContentFormat {
  id: string;
  label: string;
  /** Libellé court pour le badge des cartes (libellé complet sinon). */
  short?: string;
  icon: LucideIcon;
  /** Couleur du badge, toujours une variable de thème. */
  color: string;
  /** Une phrase : ce que c'est, quand l'utiliser. */
  description: string;
  /** Structure type, dans l'ordre. */
  structure: string[];
  /** Conseils de tournage concrets. */
  tips: string[];
  /** Forme du texte attendue dans le script (affichage et prompts). */
  shape: ScriptShape;
  /** La forme en une ligne, pour l'éditeur et les outils du connecteur. */
  shapeHint: string;
  /** Modèle prérempli à la création. */
  template: string;
  /** false = rien à filmer (carrousel) : pas de prompteur, « À poster ». */
  filmed: boolean;
  /** Libellés de paires (forme « paires »). */
  pairLabels?: [string, string];
  /** Libellés de sections (forme « sections »). */
  sectionLabels?: string[];
  /** Règle à respecter absolument (rappelée à l'écran et dans les prompts). */
  rule?: string;
  /**
   * Réservé à ces plateformes écrites (voir lib/written-content.ts) : le
   * format n'est pas proposé pour un reel ou une vidéo YouTube. Absent =
   * format vidéo, proposé partout sauf sur les plateformes écrites.
   */
  onlyFor?: string[];
}

export const DEFAULT_CONTENT_FORMAT = "face_cam";

export const CONTENT_FORMATS: ContentFormat[] = [
  {
    id: "face_cam",
    label: "Face caméra",
    icon: Video,
    color: "var(--ep-accent)",
    description: "Tu parles droit dans l'objectif, texte lu au prompteur. Le format de base, le plus rapide à tourner.",
    structure: ["Accroche (2 premières secondes)", "Le problème ou l'idée reçue", "L'explication simple", "L'appel à l'action"],
    tips: ["Caméra à hauteur des yeux, lumière face à toi (fenêtre).", "Coupe chaque respiration au montage, le rythme fait tout.", "Sous-titres obligatoires : la majorité regarde sans le son."],
    shape: "texte",
    shapeHint: "Le texte lu mot pour mot, en paragraphes courts.",
    template: "[Accroche]\n\n[Le problème]\n\n[L'explication]\n\n[Appel à l'action]",
    filmed: true,
  },
  {
    id: "broll_voix_off",
    short: "B-roll",
    label: "B-roll + voix off",
    icon: Film,
    color: "var(--ep-info)",
    description: "Des plans filmés (toi qui cuisines, t'entraînes, pèses...) avec un texte à l'écran et ta voix enregistrée par-dessus. Zéro face caméra.",
    structure: ["Plan d'accroche + texte choc à l'écran", "Plans d'illustration, une idée par plan", "Plan final + appel à l'action à l'écran"],
    tips: ["Filme tous les plans d'abord (3 à 5 s chacun, stable), la voix ensuite au calme.", "Un plan = une idée : change de plan à chaque phrase de voix off.", "Texte à l'écran court (6 mots max), lisible en 1 seconde."],
    shape: "broll",
    shapeHint: "Un bloc par plan : « Plan : ce qu'on filme », « Écran : texte affiché », « Voix off : ce que tu dis ».",
    template: "Plan : [ce qu'on voit, ex. moi qui pèse mon riz]\nÉcran : [texte court à l'écran]\nVoix off : [ce que tu dis sur ce plan]\n\nPlan : \nÉcran : \nVoix off : \n\nPlan : \nÉcran : \nVoix off : ",
    filmed: true,
  },
  {
    id: "yap",
    short: "Yap",
    label: "Yap (parlé spontané)",
    icon: Mic,
    color: "var(--ep-orange)",
    description: "Tu parles naturellement, comme à un pote, sans lire. Juste une accroche et les points à dérouler : ça sonne vrai.",
    structure: ["Accroche dite telle quelle", "3 à 5 points à aborder, dans l'ordre", "Fin et appel à l'action"],
    tips: ["Ne lis pas : garde les points sous les yeux et parle.", "Filme en continu, plusieurs prises, garde la plus vivante.", "Coupe les blancs au montage, garde les hésitations naturelles."],
    shape: "points",
    shapeHint: "L'accroche sur la 1re ligne, puis un point à aborder par ligne commençant par « - », puis la fin.",
    template: "[Accroche, dite telle quelle]\n\n- [Point 1]\n- [Point 2]\n- [Point 3]\n\n[Fin + appel à l'action]",
    filmed: true,
  },
  {
    id: "tier_list",
    label: "Tier list",
    icon: Trophy,
    color: "var(--ep-yellow)",
    description: "Tu classes des éléments (compléments, aliments, exercices) de S à C en justifiant chaque choix. Ça fait réagir en commentaire.",
    structure: ["Accroche : ce que tu classes", "Les éléments un par un, du plus surprenant au plus attendu", "Récap et question au public"],
    tips: ["Affiche la grille S/A/B/C à l'écran et place chaque élément en direct (montage ou appli).", "Une justification en une phrase par élément, pas plus.", "Mets un classement qui fait débat : c'est lui qui fait commenter."],
    shape: "tier",
    shapeHint: "Une ligne par élément : « S : élément | pourquoi » (tiers S, A, B, C, D), avec l'accroche avant et la fin après.",
    template: "[Accroche : je classe ... de S à C]\n\nS : [élément] | [pourquoi en une phrase]\nA : [élément] | [pourquoi]\nB : [élément] | [pourquoi]\nC : [élément] | [pourquoi]\n\n[Fin + question au public]",
    filmed: true,
  },
  {
    id: "clone",
    short: "Clone",
    label: "Clone (2 personnes)",
    icon: Users,
    color: "var(--ep-violet)",
    description: "Tu joues deux rôles qui se répondent (toi le coach et ton client sceptique, par exemple), filmés séparément puis montés en dialogue.",
    structure: ["Présentation des rôles (A et B)", "B pose l'objection ou l'idée reçue", "A répond, B relance", "Chute et appel à l'action"],
    tips: ["Filme toutes les répliques de A d'un coup, puis toutes celles de B (mode tournage : filtre A ou B).", "Change un détail entre les deux rôles (casquette, t-shirt, côté du cadre).", "Garde le même cadrage et la même lumière pour les deux."],
    shape: "dialogue",
    shapeHint: "Les rôles en tête (« A = moi, le coach » / « B = mon client sceptique »), puis une réplique par ligne : « A : ... » ou « B : ... ».",
    template: "A = [moi, le coach]\nB = [mon client sceptique]\n\nB : [l'objection ou l'idée reçue]\nA : [ta réponse]\nB : [relance]\nA : [réponse + appel à l'action]",
    filmed: true,
  },
  {
    id: "question_reponse",
    short: "Q / R",
    label: "Question / réponse",
    icon: MessageCircleQuestion,
    color: "var(--ep-ok)",
    description: "Tu lis (ou affiches) une vraie question reçue, puis tu y réponds. Simple, utile, et ça montre que tu écoutes ta communauté.",
    structure: ["La question, lue ou affichée", "La réponse courte d'abord", "Le pourquoi", "Appel à l'action"],
    tips: ["Affiche la question à l'écran (capture ou texte) pendant que tu la lis.", "Donne la réponse dans la première phrase, explique après.", "Prends de vraies questions (DM, commentaires, bilans)."],
    shape: "paires",
    pairLabels: ["Question", "Réponse"],
    shapeHint: "« Question : la question lue » puis « Réponse : ta réponse » (plusieurs paires possibles).",
    template: "Question : [la question telle qu'on te l'a posée]\nRéponse : [la réponse, courte d'abord, puis le pourquoi]",
    filmed: true,
  },
  {
    id: "cas_client",
    label: "Cas client",
    icon: UserCheck,
    color: "var(--ep-gold)",
    description: "Le parcours d'un vrai client (avec son accord) ou ton propre parcours : d'où il partait, ce qui a changé, le résultat.",
    structure: ["Avant : la situation de départ", "Le blocage", "Ce qu'on a changé", "Le résultat", "Ce que tu dois retenir"],
    tips: ["Montre une preuve si le client est d'accord (photo, chiffre de bilan).", "Un seul déclic par vidéo, pas toute la prépa.", "Pas de client réel sous la main : raconte ton propre parcours."],
    shape: "sections",
    sectionLabels: ["Avant", "Blocage", "Ce qu'on a changé", "Résultat", "À retenir"],
    rule: "Jamais de client inventé : un vrai cas, avec son accord, ou ton propre parcours.",
    shapeHint: "Des sections « Avant : », « Blocage : », « Ce qu'on a changé : », « Résultat : », « À retenir : ». Jamais de client inventé.",
    template: "Avant : [d'où partait le client, ou toi]\nBlocage : [ce qui coinçait]\nCe qu'on a changé : [le déclic concret]\nRésultat : [le résultat réel]\nÀ retenir : [la leçon pour celui qui regarde]",
    filmed: true,
  },
  {
    id: "reaction",
    short: "Réaction",
    label: "Réaction à une vidéo",
    icon: MonitorPlay,
    color: "var(--ep-pink)",
    description: "Tu réagis à une vidéo d'un autre créateur (fond vert ou écran partagé) : tu valides, tu nuances ou tu corriges.",
    structure: ["La vidéo et pourquoi tu réagis", "Extrait, puis ta réaction (à répéter)", "Ce qu'il faut retenir"],
    tips: ["Fond vert ou écran partagé, la vidéo d'origine en haut.", "Coupe l'extrait court (3 à 5 s), puis réagis.", "Reste respectueux : tu corriges une idée, pas une personne."],
    shape: "paires",
    pairLabels: ["Extrait", "Ma réaction"],
    shapeHint: "La vidéo en 1re ligne, puis « Extrait : ce qui est dit » et « Ma réaction : ce que tu en penses », à répéter.",
    template: "[La vidéo à laquelle tu réagis et pourquoi]\n\nExtrait : [ce qui est dit dans la vidéo]\nMa réaction : [ce que tu en penses]\n\nExtrait : \nMa réaction : ",
    filmed: true,
  },
  {
    id: "mythe_realite",
    label: "Mythe vs réalité",
    icon: Scale,
    color: "var(--ep-bad)",
    description: "Tu casses une idée reçue : le mythe, puis la réalité. Très partagé, parfait pour la perte de gras, la prise de muscle, la nutrition.",
    structure: ["Accroche : « j'aimerais casser un mythe »", "Mythe", "Réalité, expliquée simplement", "Appel à l'action"],
    tips: ["Affiche « MYTHE » puis « RÉALITÉ » en gros à l'écran.", "Un geste ou un changement de cadre entre les deux.", "Un seul mythe par vidéo, ou 3 maximum en série rapide."],
    shape: "paires",
    pairLabels: ["Mythe", "Réalité"],
    shapeHint: "« Mythe : l'idée reçue » puis « Réalité : la vérité expliquée » (une ou plusieurs paires).",
    template: "[Accroche]\n\nMythe : [l'idée reçue]\nRéalité : [ce qui est vrai, expliqué simplement]\n\n[Appel à l'action]",
    filmed: true,
  },
  {
    id: "tuto_ecran",
    label: "Tuto à l'écran",
    icon: Clapperboard,
    color: "var(--ep-info)",
    description: "Tu montres un geste ou un outil étape par étape (calculer ses macros, remplir son bilan, se servir de l'appli) en capture d'écran ou en plan serré.",
    structure: ["Ce qu'on va savoir faire à la fin", "Les étapes numérotées", "Le résultat et l'appel à l'action"],
    tips: ["Enregistre l'écran à part, ta voix ensuite.", "Zoome sur l'endroit où tu cliques.", "Une étape = une action visible."],
    shape: "etapes",
    shapeHint: "L'intro, puis une étape par ligne numérotée « 1. ... », « 2. ... », puis la fin.",
    template: "[Ce que tu sauras faire à la fin]\n\n1. [Première étape]\n2. [Deuxième étape]\n3. [Troisième étape]\n\n[Résultat + appel à l'action]",
    filmed: true,
  },
  {
    id: "liste",
    label: "Top / liste",
    icon: ListOrdered,
    color: "var(--ep-orange)",
    description: "« 3 erreurs qui bloquent ta sèche », « 5 aliments que je mange tous les jours » : une liste numérotée, rythmée.",
    structure: ["Accroche avec le nombre", "Les éléments numérotés, le meilleur à la fin", "Récap et appel à l'action"],
    tips: ["Affiche le numéro en gros à chaque élément.", "Garde le plus fort pour la fin, ça retient jusqu'au bout.", "Une phrase par élément, pas plus."],
    shape: "etapes",
    shapeHint: "L'accroche, puis un élément par ligne numérotée « 1. ... », puis la fin.",
    template: "[Accroche : 3 erreurs qui...]\n\n1. [Élément 1]\n2. [Élément 2]\n3. [Élément 3, le plus fort]\n\n[Appel à l'action]",
    filmed: true,
  },
  {
    id: "storytelling",
    label: "Storytelling",
    icon: BookOpen,
    color: "var(--ep-violet)",
    description: "Une histoire vraie qui t'est arrivée, racontée pour amener une leçon. Ça crée du lien bien plus qu'un conseil sec.",
    structure: ["Situation : où et quand", "Problème", "Déclic", "Résultat", "Leçon pour celui qui regarde"],
    tips: ["Commence au milieu de l'action, pas au début de l'histoire.", "Des détails concrets (lieu, chiffre, phrase entendue).", "Une seule leçon à la fin."],
    shape: "sections",
    sectionLabels: ["Situation", "Problème", "Déclic", "Résultat", "Leçon"],
    rule: "Une histoire vraie, la tienne ou celle d'un client d'accord. Jamais inventée.",
    shapeHint: "Des sections « Situation : », « Problème : », « Déclic : », « Résultat : », « Leçon : ». Histoire vraie uniquement.",
    template: "Situation : [où, quand, avec qui]\nProblème : [ce qui n'allait pas]\nDéclic : [le moment où ça a changé]\nRésultat : [ce qui s'est passé ensuite]\nLeçon : [ce que tu dois en retenir]",
    filmed: true,
  },
  {
    id: "reponse_commentaire",
    short: "Réponse com.",
    label: "Réponse à un commentaire",
    icon: MessageSquareReply,
    color: "var(--ep-ok)",
    description: "Tu réponds en vidéo à un vrai commentaire (bulle affichée à l'écran). Relance l'engagement et nourrit la vidéo d'origine.",
    structure: ["Le commentaire affiché", "Ta réponse directe", "Le détail utile", "Appel à l'action"],
    tips: ["Utilise la fonction « répondre en vidéo » d'Instagram ou de TikTok : la bulle s'affiche toute seule.", "Remercie en une phrase, puis réponds.", "Choisis un commentaire qui revient souvent."],
    shape: "paires",
    pairLabels: ["Commentaire", "Réponse"],
    shapeHint: "« Commentaire : le commentaire tel qu'écrit » puis « Réponse : ta réponse ».",
    template: "Commentaire : [le commentaire, tel qu'écrit]\nRéponse : [ta réponse, directe]",
    filmed: true,
  },
  {
    id: "journee_type",
    short: "Journée type",
    label: "Journée type (vlog)",
    icon: Sun,
    color: "var(--ep-yellow)",
    description: "Ta journée de coach ou de perte de gras en plans courts (repas, séance, bilans clients) avec ta voix off. Montre ta méthode en vrai.",
    structure: ["Accroche : la journée de qui, avec quel objectif", "Les moments clés de la journée, un plan chacun", "Bilan de la journée et appel à l'action"],
    tips: ["Filme au fil de la journée, 3 à 5 s par plan, sans réfléchir au montage.", "Une info chiffrée par plan (calories, heure, charge).", "Voix off enregistrée le soir, au calme."],
    shape: "broll",
    shapeHint: "Un bloc par moment : « Plan : 7h, ce qu'on filme », « Écran : texte affiché », « Voix off : ce que tu dis ».",
    template: "Plan : [7h, petit-déjeuner]\nÉcran : [texte court]\nVoix off : [ce que tu dis]\n\nPlan : [12h, ...]\nÉcran : \nVoix off : \n\nPlan : [18h, séance]\nÉcran : \nVoix off : ",
    filmed: true,
  },
  {
    id: "demo_exercice",
    short: "Démo exo",
    label: "Démo d'exercice",
    icon: Dumbbell,
    color: "var(--ep-accent)",
    description: "Un exercice montré en vrai : l'erreur qu'on voit partout, la bonne exécution, la consigne qui change tout.",
    structure: ["Exercice et pour qui", "Erreur fréquente (montrée)", "Bonne exécution (montrée)", "Consigne clé à retenir"],
    tips: ["Filme de profil, corps entier dans le cadre.", "Montre l'erreur puis la correction, côte à côte au montage.", "Une seule consigne clé, celle qui change tout."],
    shape: "sections",
    sectionLabels: ["Exercice", "Erreur fréquente", "Bonne exécution", "Consigne clé"],
    shapeHint: "Des sections « Exercice : », « Erreur fréquente : », « Bonne exécution : », « Consigne clé : ».",
    template: "Exercice : [nom, pour qui]\nErreur fréquente : [ce qu'on voit partout]\nBonne exécution : [comment le faire]\nConsigne clé : [la phrase à retenir]",
    filmed: true,
  },
  {
    id: "carrousel",
    label: "Carrousel",
    icon: GalleryHorizontal,
    color: "var(--ep-pink)",
    description: "Des slides à faire défiler (Instagram, LinkedIn) : une idée par slide, à créer dans Canva. Rien à filmer.",
    structure: ["Slide 1 : l'accroche", "Slides 2 à 6 : une idée par slide", "Dernière slide : appel à l'action"],
    tips: ["Slide 1 = une promesse claire en gros, pas de logo.", "Maximum 25 mots par slide.", "Même modèle visuel sur toutes les slides."],
    shape: "slides",
    shapeHint: "Une slide par ligne : « Slide 1 : ... », « Slide 2 : ... » (7 slides maximum, la dernière = appel à l'action).",
    template: "Slide 1 : [l'accroche]\nSlide 2 : [idée 1]\nSlide 3 : [idée 2]\nSlide 4 : [idée 3]\nSlide 5 : [appel à l'action]",
    filmed: false,
    onlyFor: ["post_insta", "linkedin"],
  },
  // Formats écrits (2026-11-15, demande d'Emmanuel : « des story insta, des
  // post LinkedIn, des post insta, ne bâcle pas »). Règles tirées de la
  // Bible (D3 structure LinkedIn), du Guide de production des Stories et du
  // framework Stories du Mastermind (une idée par séquence, au moins un
  // élément interactif, CTA au fil du récit et non en conclusion).
  {
    id: "post_texte",
    label: "Post texte",
    icon: AlignLeft,
    color: "var(--ep-info)",
    description: "Un post écrit, sans visuel obligatoire (LinkedIn, Threads). La 1re ligne fait tout : c'est elle qu'on voit avant « voir plus ».",
    structure: [
      "1re ligne : paradoxe, faux problème, phrase de l'avatar ou scène. Jamais une intro",
      "2 à 3 lignes : la scène que la personne reconnaît",
      "Le vrai problème, en une phrase isolée",
      "3 à 5 lignes courtes, sans puces",
      "La nuance",
      "Fin : une question facile OU le lien seul sur la dernière ligne",
    ],
    tips: [
      "Une phrase par ligne, une ligne vide entre les blocs.",
      "Alterner les posts humains, expertise et promotion.",
      "Répondre en message, à la main, aux personnes qui réagissent.",
    ],
    shape: "texte",
    shapeHint: "Le post tel qu'il sera publié : phrases courtes, une ligne vide entre les blocs, jamais de tiret cadratin.",
    template: "[1re ligne : le paradoxe ou la phrase de l'avatar]\n\n[La scène, 2 à 3 lignes]\n\n[Le vrai problème, une phrase]\n\n[3 à 5 lignes courtes]\n\n[La nuance]\n\n[Une question facile, ou le lien seul]",
    filmed: false,
    onlyFor: ["linkedin", "threads"],
  },
  {
    id: "image_unique",
    label: "Image unique",
    short: "Image",
    icon: ImageIcon,
    color: "var(--ep-violet)",
    description: "Un post Instagram d'une seule image : une photo réelle ou un visuel avec une phrase forte, et la légende qui développe.",
    structure: ["Visuel : ce qu'on voit (photo réelle de préférence)", "Texte sur l'image : une phrase, 12 mots maximum", "Légende : l'idée développée et un seul appel à l'action"],
    tips: [
      "Une preuve réelle vaut mieux qu'un beau visuel : séance, assiette, écran de l'appli.",
      "Le texte sur l'image se lit en une seconde, sinon il est trop long.",
      "Jamais de résultat client inventé ni de photo d'un client sans son accord.",
    ],
    shape: "sections",
    sectionLabels: ["Visuel", "Texte sur l'image"],
    shapeHint: "« Visuel : ce qu'on voit » puis « Texte sur l'image : la phrase ». La légende va dans le champ description.",
    template: "Visuel : [photo réelle ou visuel à créer]\nTexte sur l'image : [une phrase, 12 mots maximum]",
    filmed: false,
    onlyFor: ["post_insta"],
    rule: "Aucune fausse preuve : pas de résultat, de témoignage ni de photo de client inventés.",
  },
  {
    id: "sequence_stories",
    label: "Séquence de stories",
    short: "Stories",
    icon: Smartphone,
    color: "var(--ep-orange)",
    description: "Une suite de stories Instagram sur UNE seule idée : le moment fort d'abord, le contexte, la preuve, puis la suite. Chaque story donne envie de voir la suivante.",
    structure: [
      "Story 1 : le moment fort ou la question (pas d'intro)",
      "Stories 2 et 3 : contexte et preuve réelle montrée",
      "Une story interactive : sondage, question ou curseur, avec une consigne claire",
      "Le CTA discret au fil du récit (vers la 4e), jamais en conclusion de vente",
      "Les dernières : la suite et la résolution",
    ],
    tips: [
      "Une seule idée sur toute la séquence, sans changer de sujet.",
      "Montrer avant d'expliquer : écran, séance, préparation.",
      "« Vote pour l'option qui te ressemble » marche mieux qu'un sondage sans consigne.",
      "Publier la séquence d'un coup, pas au compte-gouttes.",
    ],
    shape: "frames",
    shapeHint: "Une story par bloc : « Story 1 : le texte affiché », puis si besoin « Visuel : ce qu'on montre », « Sticker : sondage | Oui / Non » (ou question, curseur, quiz), « Lien : l'adresse ».",
    template: "Story 1 : [le moment fort]\nVisuel : [ce qu'on montre]\n\nStory 2 : [le contexte]\nVisuel : [la preuve réelle]\n\nStory 3 : [la question]\nSticker : sondage | [option 1] / [option 2]\n\nStory 4 : [le CTA discret]\nLien : [lien vers le guide ou l'appli]\n\nStory 5 : [la suite et la résolution]",
    filmed: false,
    onlyFor: ["story_insta"],
    rule: "Une seule idée par séquence, au moins un élément interactif, aucune coulisse ni preuve inventée, aucun DM sortant.",
  },
];

const BY_ID = new Map(CONTENT_FORMATS.map((f) => [f.id, f]));

export const CONTENT_FORMAT_IDS = CONTENT_FORMATS.map((f) => f.id);

export function isContentFormatId(v: unknown): v is string {
  return typeof v === "string" && BY_ID.has(v);
}

/** Format d'un script, face caméra si inconnu ou absent (anciens scripts). */
export function getContentFormat(id: string | null | undefined): ContentFormat {
  return (id && BY_ID.get(id)) || BY_ID.get(DEFAULT_CONTENT_FORMAT)!;
}

/** Formats vidéo (sans plateforme réservée), pour les reels et YouTube. */
export const VIDEO_CONTENT_FORMATS = CONTENT_FORMATS.filter((f) => !f.onlyFor);

/** Résumé « id (libellé) : forme » pour la description des outils du connecteur. */
export function contentFormatsToolHint(): string {
  return CONTENT_FORMATS.map((f) => `${f.id} (${f.label}) : ${f.shapeHint}`).join(" ; ");
}

// ── Lecture du texte selon la forme ─────────────────────────────────────

function norm(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[’']/g, "'").trim();
}

const LABEL_SEP = /^\s*([^:：|]{1,40}?)\s*[:：]\s*(.*)$/;

export type ParsedScript =
  | { shape: "texte"; text: string }
  | { shape: "points"; intro: string; points: string[]; outro: string }
  | { shape: "dialogue"; roles: { A?: string; B?: string }; lines: { who: "A" | "B" | null; text: string }[] }
  | { shape: "broll"; intro: string; rows: { plan: string; ecran: string; voix: string }[]; outro: string }
  | { shape: "tier"; intro: string; items: { tier: string; item: string; why: string }[]; outro: string }
  | { shape: "paires"; labels: [string, string]; intro: string; pairs: { a: string; b: string }[]; outro: string }
  | { shape: "sections"; intro: string; sections: { label: string; text: string }[] }
  | { shape: "etapes"; intro: string; steps: string[]; outro: string }
  | { shape: "slides"; slides: { n: number; text: string }[] }
  | { shape: "frames"; frames: StoryFrame[] };

export type StickerKind = "sondage" | "question" | "curseur" | "quiz" | "lien" | "autre";

export interface StoryFrame {
  n: number;
  text: string;
  visuel: string;
  sticker: { kind: StickerKind; detail: string } | null;
  lien: string;
}

function joinLines(lines: string[]): string {
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

const BROLL_KEYS: { key: "plan" | "ecran" | "voix"; aliases: string[] }[] = [
  { key: "plan", aliases: ["plan", "plan a filmer", "plans", "image", "a filmer", "b-roll", "broll", "visuel"] },
  { key: "ecran", aliases: ["ecran", "texte", "texte a l'ecran", "texte ecran", "texte a l ecran", "sous-titre", "incrustation"] },
  { key: "voix", aliases: ["voix off", "voix", "vo", "voix-off", "ce que je dis"] },
];

function parseBroll(content: string): ParsedScript | null {
  const rows: { plan: string; ecran: string; voix: string }[] = [];
  const intro: string[] = [];
  const outro: string[] = [];
  let cur: { plan: string; ecran: string; voix: string } | null = null;
  let lastKey: "plan" | "ecran" | "voix" | null = null;
  const flush = () => {
    if (cur && (cur.plan || cur.ecran || cur.voix)) rows.push(cur);
    cur = null;
    lastKey = null;
  };
  for (const raw of content.split("\n")) {
    const line = raw.replace(/^\s*(?:\d+\s*[.)-]\s*)/, "");
    // Forme tableau : « texte à l'écran | voix off | plan à filmer ».
    const cells = line.split("|").map((c) => c.trim());
    if (cells.length === 3 && cells.some(Boolean) && !LABEL_SEP.test(cells[0])) {
      flush();
      rows.push({ ecran: cells[0], voix: cells[1], plan: cells[2] });
      continue;
    }
    const m = line.match(LABEL_SEP);
    const label = m ? norm(m[1]).replace(/\s*\d+$/, "") : "";
    const key = m ? BROLL_KEYS.find((k) => k.aliases.includes(label))?.key : undefined;
    if (m && key) {
      if (!cur || cur[key] || (key === "plan" && (cur.ecran || cur.voix))) flush();
      cur = cur ?? { plan: "", ecran: "", voix: "" };
      cur[key] = m[2].trim();
      lastKey = key;
      continue;
    }
    if (!raw.trim()) {
      if (cur) flush();
      else (rows.length ? outro : intro).push("");
      continue;
    }
    if (cur && lastKey) cur[lastKey] = `${cur[lastKey]}\n${raw.trim()}`.trim();
    else (rows.length ? outro : intro).push(raw);
  }
  flush();
  if (rows.length === 0) return null;
  return { shape: "broll", intro: joinLines(intro), rows, outro: joinLines(outro) };
}

function parseDialogue(content: string): ParsedScript | null {
  const roles: { A?: string; B?: string } = {};
  const lines: { who: "A" | "B" | null; text: string }[] = [];
  let count = 0;
  for (const raw of content.split("\n")) {
    const role = raw.match(/^\s*([AB])\s*=\s*(.+)$/i);
    if (role) {
      roles[role[1].toUpperCase() as "A" | "B"] = role[2].trim();
      continue;
    }
    const m = raw.match(/^\s*(?:personne\s+)?([AB])(?:\s*\(([^)]*)\))?\s*[:：]\s*(.*)$/i);
    if (m) {
      const who = m[1].toUpperCase() as "A" | "B";
      if (m[2] && !roles[who]) roles[who] = m[2].trim();
      lines.push({ who, text: m[3].trim() });
      count++;
      continue;
    }
    if (!raw.trim()) continue;
    // Une ligne sans « A : » prolonge la réplique précédente, ou reste une
    // indication de mise en scène si rien ne la précède.
    const last = lines[lines.length - 1];
    if (last && last.who && !/^\s*[\[(]/.test(raw)) last.text = `${last.text}\n${raw.trim()}`;
    else lines.push({ who: null, text: raw.trim() });
  }
  if (count < 2) return null;
  return { shape: "dialogue", roles, lines };
}

function splitItem(rest: string): { item: string; why: string } {
  const pipe = rest.indexOf("|");
  if (pipe >= 0) return { item: rest.slice(0, pipe).trim(), why: rest.slice(pipe + 1).trim() };
  const colon = rest.search(/\s[:：]\s/);
  if (colon >= 0) return { item: rest.slice(0, colon).trim(), why: rest.slice(colon).replace(/^\s*[:：]\s*/, "").trim() };
  const paren = rest.match(/^(.*?)\s*\((.+)\)\s*$/);
  if (paren) return { item: paren[1].trim(), why: paren[2].trim() };
  return { item: rest.trim(), why: "" };
}

function parseTier(content: string): ParsedScript | null {
  const items: { tier: string; item: string; why: string }[] = [];
  const intro: string[] = [];
  const outro: string[] = [];
  for (const raw of content.split("\n")) {
    const m = raw.match(/^\s*(?:tier\s+)?([SABCDF])(?:\s*tier)?\s*[:：|]\s*(.+)$/i);
    if (m && m[1] === m[1].toUpperCase()) {
      items.push({ tier: m[1].toUpperCase(), ...splitItem(m[2]) });
      continue;
    }
    const last = items[items.length - 1];
    if (last && raw.trim() && /^\s{2,}|^\s*[-•]/.test(raw)) {
      last.why = `${last.why} ${raw.replace(/^\s*[-•]\s*/, "").trim()}`.trim();
      continue;
    }
    (items.length ? outro : intro).push(raw);
  }
  if (items.length < 2) return null;
  return { shape: "tier", intro: joinLines(intro), items, outro: joinLines(outro) };
}

const PAIR_ALIASES: Record<string, string[]> = {
  question: ["question", "q"],
  reponse: ["reponse", "r", "ma reponse"],
  mythe: ["mythe", "idee recue", "faux"],
  realite: ["realite", "verite", "vrai", "la realite", "la verite"],
  extrait: ["extrait", "il dit", "elle dit", "dans la video"],
  "ma reaction": ["ma reaction", "reaction", "moi"],
  commentaire: ["commentaire", "le commentaire", "com"],
};

function aliasesFor(label: string): string[] {
  const n = norm(label);
  return PAIR_ALIASES[n] ?? [n];
}

function parsePairs(content: string, labels: [string, string]): ParsedScript | null {
  const aA = aliasesFor(labels[0]);
  const aB = aliasesFor(labels[1]);
  const pairs: { a: string; b: string }[] = [];
  const intro: string[] = [];
  const outro: string[] = [];
  let cur: { a: string; b: string } | null = null;
  let last: "a" | "b" | null = null;
  for (const raw of content.split("\n")) {
    const m = raw.match(LABEL_SEP);
    const n = m ? norm(m[1]) : "";
    if (m && aA.includes(n)) {
      if (cur) pairs.push(cur);
      cur = { a: m[2].trim(), b: "" };
      last = "a";
      continue;
    }
    if (m && aB.includes(n)) {
      if (!cur || cur.b) {
        if (cur) pairs.push(cur);
        cur = { a: "", b: "" };
      }
      cur.b = m[2].trim();
      last = "b";
      continue;
    }
    if (!raw.trim()) {
      if (cur && last === "b") {
        pairs.push(cur);
        cur = null;
        last = null;
      }
      continue;
    }
    if (cur && last) cur[last] = `${cur[last]}\n${raw.trim()}`.trim();
    else (pairs.length ? outro : intro).push(raw);
  }
  if (cur) pairs.push(cur);
  if (pairs.length === 0 || !pairs.some((p) => p.a && p.b)) return null;
  return { shape: "paires", labels, intro: joinLines(intro), pairs, outro: joinLines(outro) };
}

function parseSections(content: string, labels: string[]): ParsedScript | null {
  const known = new Map(labels.map((l) => [norm(l), l]));
  const sections: { label: string; text: string }[] = [];
  const intro: string[] = [];
  for (const raw of content.split("\n")) {
    const m = raw.match(LABEL_SEP);
    const label = m ? known.get(norm(m[1])) : undefined;
    if (m && label) {
      sections.push({ label, text: m[2].trim() });
      continue;
    }
    const last = sections[sections.length - 1];
    if (last) last.text = `${last.text}\n${raw}`.replace(/\n{3,}/g, "\n\n").trim();
    else intro.push(raw);
  }
  if (sections.length < 2) return null;
  return { shape: "sections", intro: joinLines(intro), sections };
}

function parseSteps(content: string): ParsedScript | null {
  const steps: string[] = [];
  const intro: string[] = [];
  const outro: string[] = [];
  let open = false;
  for (const raw of content.split("\n")) {
    const m = raw.match(/^\s*(?:[ée]tape\s*)?(\d{1,2})\s*[.):\-]\s+(.*)$/i);
    if (m) {
      steps.push(m[2].trim());
      open = true;
      continue;
    }
    if (!raw.trim()) {
      open = false;
      (steps.length ? outro : intro).push("");
      continue;
    }
    if (open && steps.length) steps[steps.length - 1] = `${steps[steps.length - 1]}\n${raw.trim()}`;
    else (steps.length ? outro : intro).push(raw);
  }
  if (steps.length < 2) return null;
  return { shape: "etapes", intro: joinLines(intro), steps, outro: joinLines(outro) };
}

function parsePoints(content: string): ParsedScript | null {
  const points: string[] = [];
  const intro: string[] = [];
  const outro: string[] = [];
  for (const raw of content.split("\n")) {
    const m = raw.match(/^\s*[-•*]\s+(.*)$/);
    if (m) {
      points.push(m[1].trim());
      continue;
    }
    (points.length ? outro : intro).push(raw);
  }
  if (points.length < 2) return null;
  return { shape: "points", intro: joinLines(intro), points, outro: joinLines(outro) };
}

function parseSlides(content: string): ParsedScript | null {
  const slides: { n: number; text: string }[] = [];
  for (const raw of content.split("\n")) {
    const m = raw.match(/^\s*slide\s*(\d{1,2})\s*[:：.)\-]?\s*(.*)$/i);
    if (m) {
      slides.push({ n: Number(m[1]), text: m[2].trim() });
      continue;
    }
    const last = slides[slides.length - 1];
    if (last && raw.trim()) last.text = `${last.text}\n${raw.trim()}`.trim();
  }
  if (slides.length < 2) return null;
  return { shape: "slides", slides };
}

const STICKER_KINDS: { kind: StickerKind; aliases: string[] }[] = [
  { kind: "sondage", aliases: ["sondage", "poll", "vote"] },
  { kind: "question", aliases: ["question", "boite a questions", "questions"] },
  { kind: "curseur", aliases: ["curseur", "slider", "emoji slider", "jauge"] },
  { kind: "quiz", aliases: ["quiz", "qcm"] },
  { kind: "lien", aliases: ["lien", "link"] },
];

/** « sondage | Oui / Non » → { kind: "sondage", detail: "Oui / Non" }. */
export function parseSticker(raw: string): { kind: StickerKind; detail: string } | null {
  const v = raw.trim();
  if (!v) return null;
  const sep = v.search(/[|:：]/);
  const head = norm(sep >= 0 ? v.slice(0, sep) : v);
  const detail = sep >= 0 ? v.slice(sep + 1).trim() : "";
  const found = STICKER_KINDS.find((k) => k.aliases.includes(head));
  if (found) return { kind: found.kind, detail };
  // Pas de type reconnu : on garde le texte tel quel, rien ne se perd.
  return { kind: "autre", detail: v };
}

function parseFrames(content: string): ParsedScript | null {
  const frames: StoryFrame[] = [];
  let cur: StoryFrame | null = null;
  let last: "text" | "visuel" | "lien" | null = null;
  for (const raw of content.split("\n")) {
    const head = raw.match(/^\s*story\s*(\d{1,2})\s*[:：.)\-]?\s*(.*)$/i);
    if (head) {
      if (cur) frames.push(cur);
      cur = { n: Number(head[1]), text: head[2].trim(), visuel: "", sticker: null, lien: "" };
      last = "text";
      continue;
    }
    if (!cur) continue;
    const m = raw.match(LABEL_SEP);
    const label = m ? norm(m[1]) : "";
    if (m && ["visuel", "image", "a montrer", "fond", "plan"].includes(label)) {
      cur.visuel = m[2].trim();
      last = "visuel";
      continue;
    }
    if (m && ["sticker", "interaction", "element interactif"].includes(label)) {
      cur.sticker = parseSticker(m[2]);
      last = null;
      continue;
    }
    if (m && ["sondage", "question", "curseur", "quiz"].includes(label)) {
      cur.sticker = parseSticker(`${label} | ${m[2]}`);
      last = null;
      continue;
    }
    if (m && ["lien", "link", "url"].includes(label)) {
      cur.lien = m[2].trim();
      last = "lien";
      continue;
    }
    if (!raw.trim()) {
      last = null;
      continue;
    }
    if (last) cur[last] = `${cur[last]}\n${raw.trim()}`.trim();
    else cur.text = `${cur.text}\n${raw.trim()}`.trim();
  }
  if (cur) frames.push(cur);
  if (frames.length === 0) return null;
  return { shape: "frames", frames };
}

/** Lit le script selon la forme de son format ; texte brut si elle n'est pas suivie. */
export function parseScript(formatId: string | null | undefined, content: string | null | undefined): ParsedScript {
  const text = (content ?? "").replace(/\r\n/g, "\n");
  const f = getContentFormat(formatId);
  let parsed: ParsedScript | null = null;
  if (text.trim()) {
    switch (f.shape) {
      case "broll": parsed = parseBroll(text); break;
      case "dialogue": parsed = parseDialogue(text); break;
      case "tier": parsed = parseTier(text); break;
      case "paires": parsed = parsePairs(text, f.pairLabels ?? ["Question", "Réponse"]); break;
      case "sections": parsed = parseSections(text, f.sectionLabels ?? []); break;
      case "etapes": parsed = parseSteps(text); break;
      case "points": parsed = parsePoints(text); break;
      case "slides": parsed = parseSlides(text); break;
      case "frames": parsed = parseFrames(text); break;
      default: parsed = null;
    }
  }
  return parsed ?? { shape: "texte", text };
}

/**
 * Texte à faire défiler au prompteur : pour le B-roll, seulement la voix off
 * (les plans se filment à part) ; pour le clone, les répliques d'un seul rôle
 * si on le demande ; sinon le script tel quel.
 */
export function prompterText(formatId: string | null | undefined, content: string | null | undefined, role?: "A" | "B"): string {
  const parsed = parseScript(formatId, content);
  if (parsed.shape === "broll") {
    const voice = parsed.rows.map((r) => r.voix).filter(Boolean);
    if (voice.length) return [parsed.intro, ...voice, parsed.outro].filter(Boolean).join("\n\n");
  }
  if (parsed.shape === "dialogue" && role) {
    return parsed.lines.filter((l) => l.who === role).map((l) => l.text).join("\n\n");
  }
  return (content ?? "").trim();
}

// ── Prompts (générateur du Studio, prompts copiés dans Claude) ──────────

/** Bloc de consignes propre à un format, à coller dans un prompt. */
export function formatPromptBlock(formatId: string): string {
  const f = getContentFormat(formatId);
  return [
    `FORMAT : ${f.label} (identifiant ${f.id}). ${f.description}`,
    `Structure : ${f.structure.join(" → ")}.`,
    `Forme EXACTE du script (le Studio le lit ligne par ligne, respecte les libellés) : ${f.shapeHint}`,
    `Modèle à suivre :\n${f.template}`,
    f.rule ? `RÈGLE ABSOLUE : ${f.rule}` : null,
    f.filmed ? null : "Rien à filmer : pas de texte parlé, seulement le texte à publier.",
  ].filter(Boolean).join("\n");
}

export function buildFormatScriptPrompt(input: {
  formatId: string;
  sujet?: string;
  plateforme?: string;
  duree?: string;
  contexte?: string | null;
  /** Règles propres à la plateforme écrite (voir writtenPromptRules). */
  regles?: string | null;
}): string {
  const f = getContentFormat(input.formatId);
  const plateforme = input.plateforme || "reel";
  return `${input.contexte ?? ""}${VOCABULARY_PROMPT_BLOCK}

---

Tu écris un script pour mon Studio créatif EP Coaching (coaching bodybuilding et nutrition), jamais de tiret cadratin ni demi-cadratin.

${formatPromptBlock(f.id)}

Plateforme : ${plateforme}${input.duree ? `, durée visée : ${input.duree}` : ""}.${input.regles ? `\n${input.regles}` : ""}
Sujet : ${input.sujet?.trim() || "(à préciser)"}

Rends-moi, dans cet ordre :
1. Titre (court, pour m'y retrouver)
2. Accroche (la première phrase, ou le premier texte à l'écran)
3. Script complet, dans la forme exacte ci-dessus
4. ${f.filmed ? "Appel à l'action parlé" : "Appel à l'action (un seul)"}
5. ${f.shape === "frames" ? "Rien d'autre : une séquence de stories n'a pas de légende" : `Description du post${f.filmed ? "" : " (la légende publiée sous le visuel)"}`}

Si tu as accès au connecteur EP Coaching, propose-moi le script d'abord, puis quand je valide ajoute-le avec l'outil ajouter_script (format_contenu = "${f.id}", plateforme = "${plateforme}").`;
}
