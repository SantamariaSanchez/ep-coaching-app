// Contenu des lead magnets publics (page /ressources) — même logique que
// lib/mindset-content.ts : le contenu vit en dur ici (pas de CMS, pas de
// table à administrer), seule la capture email/téléphone est en base
// (voir la table leads et app/ressources/actions.ts). Chaque lead magnet
// résout un vrai problème de coaching (entraînement, nutrition, mental,
// récupération), délivre une vraie réponse, puis pousse vers la création
// de compte.

import type { ResourceCategory } from "@/lib/resource-categories";

export type LeadMagnetFormat = "guide" | "checklist" | "quiz";

interface LeadMagnetBase {
  slug: string;
  title: string;
  hook: string;
  category: ResourceCategory;
  format: LeadMagnetFormat;
  readTime: string;
  icon: string;
}

export interface GuideSection {
  heading: string;
  paragraphs: string[];
}

export interface GuideMagnet extends LeadMagnetBase {
  format: "guide";
  intro: string;
  sections: GuideSection[];
  conclusion: string;
}

export interface ChecklistGroup {
  heading?: string;
  items: string[];
}

export interface ChecklistMagnet extends LeadMagnetBase {
  format: "checklist";
  intro: string;
  groups: ChecklistGroup[];
  conclusion: string;
}

export interface QuizOption {
  label: string;
  resultKey: string;
}

export interface QuizQuestion {
  question: string;
  options: QuizOption[];
}

export interface QuizOutcome {
  key: string;
  title: string;
  description: string;
}

export interface QuizMagnet extends LeadMagnetBase {
  format: "quiz";
  intro: string;
  questions: QuizQuestion[];
  outcomes: QuizOutcome[];
}

export type LeadMagnet = GuideMagnet | ChecklistMagnet | QuizMagnet;

export const LEAD_MAGNETS: LeadMagnet[] = [
  // ── Entraînement ──────────────────────────────────────────────────────
  {
    slug: "guide-rir",
    title: "Le guide RIR : arrête de deviner ton intensité",
    hook: "Comprends enfin le RIR pour savoir exactement quand pousser et quand t'arrêter.",
    category: "Entraînement",
    format: "guide",
    readTime: "6 min",
    icon: "Dumbbell",
    intro:
      "Combien de fois tu t'es demandé si t'avais assez poussé sur une série ? Le RIR (répétitions en réserve) répond exactement à cette question. C'est l'outil le plus simple et le plus fiable pour piloter ton intensité, série après série, sans jamais aller à l'échec pour rien.",
    sections: [
      {
        heading: "Qu'est ce que le RIR, concrètement",
        paragraphs: [
          "Le RIR mesure combien de répétitions il te restait en réserve au moment où tu as arrêté une série. RIR 2 veut dire que tu aurais pu faire 2 répétitions de plus avant l'échec technique. RIR 0 veut dire que la dernière répétition était la dernière possible, forme correcte comprise.",
          "C'est une échelle de ressenti, pas un chiffre scientifique absolu. Elle s'affine avec l'expérience : les débutants surestiment souvent leur marge (ils pensent avoir RIR 3 alors qu'ils sont à RIR 1), les pratiquants confirmés deviennent précis à une répétition près.",
        ],
      },
      {
        heading: "Pourquoi c'est plus utile que le pourcentage de charge",
        paragraphs: [
          "Le 1RM (charge maximale sur une répétition) fluctue tous les jours selon ton sommeil, ton stress, ta digestion. Un objectif en pourcentage de 1RM ignore complètement ces variations. Le RIR, lui, s'adapte automatiquement : les jours où tu es moins en forme, la même sensation de RIR 2 correspondra à une charge plus légère, et c'est très bien comme ça.",
          "Concrètement, ça veut dire que tu peux suivre une prescription RIR toute l'année, sans jamais retester ton max, et rester toujours dans la bonne zone d'intensité.",
        ],
      },
      {
        heading: "Comment calibrer ton ressenti",
        paragraphs: [
          "Sur un exercice que tu maîtrises, pousse volontairement une série jusqu'à l'échec technique réel un jour où t'es en forme. Note combien de répétitions t'as faites. La séance suivante, vise cette même série mais arrête toi 2 répétitions avant : c'est ton nouveau RIR 2 de référence pour cet exercice.",
          "Répète l'exercice une fois par mois pour recalibrer. Ton ressenti va devenir de plus en plus précis avec la pratique, c'est une compétence qui s'entraîne comme le reste.",
        ],
      },
      {
        heading: "Les erreurs les plus fréquentes",
        paragraphs: [
          "Confondre fatigue musculaire locale et échec réel : les dernières répétitions difficiles ne sont pas forcément les dernières possibles.",
          "Aller systématiquement à RIR 0 sur tout, tout le temps : ça épuise le système nerveux plus vite que ça ne construit du muscle. La majorité de ton volume doit se faire entre RIR 1 et RIR 3.",
          "Ne jamais réévaluer : ton RIR de référence sur un exercice change avec les progrès, l'ignorer te fait sous entraîner avec le temps.",
        ],
      },
    ],
    conclusion:
      "Le RIR n'est pas une science exacte, c'est un outil de pilotage. Utilisé sérieusement, il te fait progresser sans jamais avoir besoin de deviner si t'as fait assez, ou trop.",
  },
  {
    slug: "checklist-seance-efficace",
    title: "Ta séance est elle vraiment efficace ?",
    hook: "12 points à vérifier pour savoir si ta séance construit vraiment du muscle, ou si tu perds ton temps.",
    category: "Entraînement",
    format: "checklist",
    readTime: "4 min",
    icon: "ClipboardCheck",
    intro:
      "Une séance peut te vider complètement et pourtant ne rien construire. Voici les points concrets qui séparent une vraie séance productive d'une séance qui fatigue pour rien.",
    groups: [
      {
        heading: "Avant la séance",
        items: [
          "T'as un objectif précis pour chaque exercice (charge, reps, RIR visé), pas juste faire du sport.",
          "Ton échauffement cible spécifiquement les muscles et mouvements du jour, pas un tapis de course générique de 10 minutes.",
          "Tu sais quel exercice tu vas faire en premier, celui qui demande le plus de fraîcheur nerveuse (généralement un poly articulaire lourd).",
        ],
      },
      {
        heading: "Pendant la séance",
        items: [
          "Chaque série proche de l'échec est réellement proche de l'échec (RIR 0 à 2), pas arrêtée par confort.",
          "Ton temps de repos entre les séries lourdes est suffisant (2 à 4 minutes sur les mouvements poly articulaires) pour récupérer la force nécessaire.",
          "Tu contrôles la phase excentrique (la descente) au lieu de la laisser tomber, c'est souvent là que se construit le muscle.",
          "Ton amplitude de mouvement est complète, pas raccourcie pour soulever plus lourd.",
          "Tu notes tes charges et reps quelque part, sinon tu ne sauras jamais si tu progresses réellement.",
        ],
      },
      {
        heading: "Après la séance",
        items: [
          "Tu ressens une fatigue musculaire précise sur les groupes ciblés, pas juste un épuisement général.",
          "Ta technique était identique sur la dernière série que sur la première, pas dégradée par la fatigue.",
          "Tu peux dire honnêtement quel muscle a le plus travaillé aujourd'hui.",
          "Tu sors de la séance avec une idée claire de ce que tu ajusteras la prochaine fois.",
        ],
      },
    ],
    conclusion:
      "Si tu coches moins de 8 points sur 12, ce n'est pas une question de volonté, c'est une question de structure. Un programme et un suivi qui matchent réellement ton niveau font toute la différence.",
  },
  {
    slug: "quiz-profil-pratiquant",
    title: "Quel type de pratiquant es tu ?",
    hook: "6 questions pour savoir exactement quel style d'entraînement et de suivi te correspond.",
    category: "Entraînement",
    format: "quiz",
    readTime: "3 min",
    icon: "Target",
    intro:
      "Il n'y a pas un seul bon programme, il y a le programme qui correspond à ta réalité. Réponds honnêtement, pas à ce que tu voudrais être.",
    questions: [
      {
        question: "Quand tu rates une séance prévue, tu...",
        options: [
          { label: "Culpabilise et j'ai du mal à m'y remettre", resultKey: "accompagnement" },
          { label: "La replace dans la semaine sans problème", resultKey: "liberte" },
          { label: "Je ne rate presque jamais, c'est non négociable", resultKey: "structure" },
        ],
      },
      {
        question: "Ton rapport à la nutrition aujourd'hui...",
        options: [
          { label: "Je pèse et je suis mes macros au gramme près", resultKey: "structure" },
          { label: "Je mange plutôt intuitivement, sans compter", resultKey: "liberte" },
          { label: "J'aimerais qu'on me dise clairement quoi manger", resultKey: "accompagnement" },
        ],
      },
      {
        question: "Face à un plateau de progression...",
        options: [
          { label: "J'analyse mes données et j'ajuste moi même", resultKey: "structure" },
          { label: "Je change instinctivement de méthode", resultKey: "liberte" },
          { label: "Je me sens perdu(e) et j'ai besoin d'un regard extérieur", resultKey: "accompagnement" },
        ],
      },
      {
        question: "Ton programme idéal ressemble à...",
        options: [
          { label: "Un plan précis, séance par séance, sur plusieurs mois", resultKey: "structure" },
          { label: "Une trame que j'adapte selon mon énergie du jour", resultKey: "liberte" },
          { label: "Peu importe le plan, tant que quelqu'un suit mes résultats avec moi", resultKey: "accompagnement" },
        ],
      },
      {
        question: "Ce qui te motive le plus...",
        options: [
          { label: "Voir les chiffres progresser (charges, mensurations, poids)", resultKey: "structure" },
          { label: "Le plaisir de bouger, sans pression de résultat", resultKey: "liberte" },
          { label: "Sentir qu'on ne me laisse pas seul(e) dans mes efforts", resultKey: "accompagnement" },
        ],
      },
      {
        question: "Si on te donne un programme tout fait sans explication...",
        options: [
          { label: "Je le suis à la lettre, ça me va très bien", resultKey: "structure" },
          { label: "Je vais probablement le modifier à ma sauce", resultKey: "liberte" },
          { label: "Je vais avoir besoin qu'on m'explique le pourquoi de chaque choix", resultKey: "accompagnement" },
        ],
      },
    ],
    outcomes: [
      {
        key: "structure",
        title: "Le Stratège",
        description:
          "Tu avances par la donnée et la précision. Un programme structuré avec des objectifs de charge clairs, un suivi RIR et des points de contrôle réguliers va te faire progresser vite. Ce qu'il te faut, c'est un cadre solide, pas plus de liberté.",
      },
      {
        key: "liberte",
        title: "L'Explorateur",
        description:
          "Tu as besoin d'autonomie pour rester motivé sur la durée. Un cadre trop rigide va t'étouffer. Ce qu'il te faut, c'est une trame flexible avec des principes clairs, que tu peux adapter à ta vie, pas un plan figé au jour près.",
      },
      {
        key: "accompagnement",
        title: "Le Bâtisseur accompagné",
        description:
          "Tu progresses vraiment quand quelqu'un suit tes résultats avec toi et ajuste en temps réel. Ce n'est pas un manque de volonté, c'est juste ta façon de fonctionner. Un vrai suivi coach fait toute la différence pour toi.",
      },
    ],
  },

  // ── Nutrition ─────────────────────────────────────────────────────────
  {
    slug: "guide-macros",
    title: "Le guide des macros sans prise de tête",
    hook: "Comprends enfin comment fonctionnent les calories et les macros, sans calculatrice compliquée.",
    category: "Nutrition",
    format: "guide",
    readTime: "7 min",
    icon: "Apple",
    intro:
      "Compter ses macros fait peur à beaucoup de monde alors que le principe est simple une fois qu'on l'a compris. Ce guide t'explique le strict nécessaire pour piloter ta nutrition sans y passer ta vie.",
    sections: [
      {
        heading: "Calories : la base de tout",
        paragraphs: [
          "Ton poids évolue selon un seul principe : l'équilibre entre ce que tu manges et ce que ton corps dépense. Manger plus que ta dépense fait prendre du poids, manger moins en fait perdre, peu importe la source des calories. Les macronutriments déterminent ensuite quoi tu construis ou perds avec ce surplus ou ce déficit.",
          "Une estimation simple pour démarrer : multiplie ton poids en kg par 30 à 33 pour une maintenance approximative, ajuste ensuite selon tes résultats réels sur 2 à 3 semaines plutôt que de te fier uniquement au calcul théorique.",
        ],
      },
      {
        heading: "Les protéines, la priorité numéro un",
        paragraphs: [
          "Vise entre 1,6 et 2,2g de protéines par kg de poids de corps par jour. C'est le macronutriment qui protège le plus ta masse musculaire, que tu sois en prise de masse ou en perte de gras.",
          "Répartis les sur 3 à 5 prises dans la journée plutôt que tout en un seul repas, ça optimise la synthèse protéique musculaire.",
        ],
      },
      {
        heading: "Lipides et glucides, l'ajustement",
        paragraphs: [
          "Les lipides ont un minimum à respecter (environ 0,6 à 1g par kg de poids de corps) pour la production hormonale, ne descends jamais trop bas durablement.",
          "Les glucides comblent le reste de tes calories. Plus t'en as, plus t'as d'énergie pour t'entraîner intensément, c'est souvent la variable qu'on ajuste en premier selon les résultats sur la balance.",
        ],
      },
      {
        heading: "Comment ajuster sans te prendre la tête",
        paragraphs: [
          "Ne change rien avant 2 à 3 semaines de suivi régulier. Le poids fluctue au jour le jour (eau, digestion, cycle), seule la moyenne hebdomadaire compte.",
          "Si ton poids stagne alors que l'objectif est de le faire bouger, ajuste par petits paliers de 100 à 150 kcal plutôt que par grands changements brutaux.",
        ],
      },
    ],
    conclusion:
      "Les macros ne sont pas une prison, c'est un langage. Une fois que tu le parles, t'as beaucoup plus de liberté dans tes choix alimentaires, pas moins.",
  },
  {
    slug: "checklist-signaux-abandon-diete",
    title: "10 signes que ta diète va te faire abandonner",
    hook: "Repère les signaux d'alerte avant qu'ils te fassent tout lâcher.",
    category: "Nutrition",
    format: "checklist",
    readTime: "4 min",
    icon: "AlertTriangle",
    intro:
      "La plupart des abandons ne sont pas un problème de volonté, ce sont des signaux ignorés trop longtemps. Voici ceux à surveiller.",
    groups: [
      {
        items: [
          "Tu penses à la nourriture en dehors des repas, presque en continu.",
          "Tu évites les repas sociaux par peur de ne plus contrôler ce que tu manges.",
          "Ton énergie à l'entraînement a nettement baissé depuis plusieurs semaines.",
          "Tu culpabilises après chaque écart, même minime.",
          "Tu classes les aliments en bons et mauvais plutôt qu'en fonction de leur place dans ta journée.",
          "Ton sommeil s'est dégradé depuis le début de la diète.",
          "Tu as arrêté de te peser ou tu te pèses plusieurs fois par jour, les deux extrêmes sont un signal.",
          "Tes règles alimentaires sont devenues plus strictes que ce que ton objectif exige réellement.",
          "Tu ressens de l'irritabilité inhabituelle sur des sujets sans rapport avec la nourriture.",
          "Tu as déjà eu une phase de perte de contrôle alimentaire (manger beaucoup, vite, en cachette) ce mois ci.",
        ],
      },
    ],
    conclusion:
      "3 signaux ou plus, c'est le moment d'alléger la structure, pas de serrer davantage. Une diète qui tient sur la durée est toujours plus efficace qu'une diète parfaite pendant 2 semaines puis abandonnée.",
  },
  {
    slug: "quiz-mode-diete",
    title: "Flexible, fixe, ou fixe flexible : quel mode de diète te correspond ?",
    hook: "Découvre en 5 questions le format de plan alimentaire qui a le plus de chances de tenir dans ta vie réelle.",
    category: "Nutrition",
    format: "quiz",
    readTime: "3 min",
    icon: "Utensils",
    intro:
      "Un plan alimentaire ne marche que si tu peux le suivre dans ta vraie vie, pas dans une vie idéale. Réponds selon ta réalité actuelle.",
    questions: [
      {
        question: "Ton emploi du temps quotidien est...",
        options: [
          { label: "Très régulier, presque les mêmes horaires chaque jour", resultKey: "fixe" },
          { label: "Complètement différent d'un jour à l'autre", resultKey: "flexible" },
          { label: "Régulier en semaine, différent le week-end", resultKey: "fixe_flexible" },
        ],
      },
      {
        question: "Face à un menu tout prêt (aliments et quantités précises)...",
        options: [
          { label: "Je me sens rassuré(e), je n'ai pas à réfléchir", resultKey: "fixe" },
          { label: "Je me sens enfermé(e), j'ai besoin de choisir", resultKey: "flexible" },
          { label: "Ça dépend des jours", resultKey: "fixe_flexible" },
        ],
      },
      {
        question: "Cuisiner et préparer tes repas...",
        options: [
          { label: "J'aime ça et j'ai le temps", resultKey: "fixe" },
          { label: "J'improvise selon ce que j'ai sous la main", resultKey: "flexible" },
          { label: "Je prépare certains repas à l'avance, j'improvise le reste", resultKey: "fixe_flexible" },
        ],
      },
      {
        question: "Ta plus grande peur avec une diète...",
        options: [
          { label: "Ne pas savoir quoi manger et mal faire", resultKey: "fixe" },
          { label: "Me sentir enfermé(e) dans des règles trop strictes", resultKey: "flexible" },
          { label: "Manquer de constance sur la durée", resultKey: "fixe_flexible" },
        ],
      },
      {
        question: "Le week-end, comparé à la semaine...",
        options: [
          { label: "Je garde exactement la même routine", resultKey: "fixe" },
          { label: "Tout est différent, resto, sorties, imprévu", resultKey: "flexible" },
          { label: "Un peu plus libre mais toujours dans un cadre", resultKey: "fixe_flexible" },
        ],
      },
    ],
    outcomes: [
      {
        key: "fixe",
        title: "Mode Fixe",
        description:
          "Tu avances mieux avec un menu précis, mêmes aliments, mêmes quantités, jour après jour. Moins de décisions à prendre égale moins de risques d'écarts. C'est un mode redoutablement efficace pour toi, pas une contrainte.",
      },
      {
        key: "flexible",
        title: "Mode Flexible",
        description:
          "Tu as besoin de choisir tes aliments toi même dans un cadre de macros à respecter. Un menu imposé te ferait sauter dans la semaine. La liberté dans les choix, avec des cibles claires, c'est ce qui va tenir dans le temps pour toi.",
      },
      {
        key: "fixe_flexible",
        title: "Mode Fixe Flexible",
        description:
          "Tu as besoin d'un socle stable (souvent en semaine) et de marge de manœuvre sur les moments moins prévisibles (week-end, sorties). Un plan hybride qui combine les deux approches est probablement ce qui te correspond le mieux.",
      },
    ],
  },

  // ── Mental ────────────────────────────────────────────────────────────
  {
    slug: "guide-motivation",
    title: "Les 5 leviers pour ne jamais perdre la motivation",
    hook: "La motivation n'est pas un trait de caractère, c'est un système. Voici comment le construire.",
    category: "Mental",
    format: "guide",
    readTime: "6 min",
    icon: "Flame",
    intro:
      "Attendre d'être motivé pour agir est le piège numéro un. Ce guide te donne 5 leviers concrets pour construire une motivation qui tient, même les jours où t'en as pas envie.",
    sections: [
      {
        heading: "Agis avant de te sentir prêt",
        paragraphs: [
          "La motivation suit l'action dans la grande majorité des cas, pas l'inverse. Démarrer une version minimale de la séance (les 5 premières minutes) suffit presque toujours à débloquer l'envie de continuer.",
        ],
      },
      {
        heading: "Vise la présence, pas la performance",
        paragraphs: [
          "Les jours de motivation basse, l'objectif devient simplement d'être présent à la salle, pas de battre un record. Ça suffit à garder ta série intacte, et une série intacte est le meilleur carburant de motivation à long terme.",
        ],
      },
      {
        heading: "Réduis la friction plutôt que d'augmenter la volonté",
        paragraphs: [
          "Sac de sport prêt la veille, repas préparés à l'avance, séance planifiée dans ton agenda à heure fixe. La discipline tient plus à l'environnement qu'à un effort de volonté permanent, réduis chaque petit obstacle entre toi et l'action.",
        ],
      },
      {
        heading: "Reconnecte toi à ton pourquoi",
        paragraphs: [
          "Note en une phrase pourquoi tu t'entraînes réellement (santé, confiance, performance, transformation). Relis cette phrase les jours de doute, elle te ramène à l'essentiel plus vite qu'une nouvelle dose de motivation externe.",
        ],
      },
      {
        heading: "Vise 80 à 90%, pas 100%",
        paragraphs: [
          "Les séries de jamais raté sont fragiles, elles cassent au premier imprévu et démoralisent complètement. Une constance de 80 à 90% sur le mois est largement suffisante pour progresser, et beaucoup plus soutenable sur la durée.",
        ],
      },
    ],
    conclusion:
      "La motivation qui dure n'est pas plus intense, elle est mieux structurée. Ces 5 leviers, appliqués ensemble, construisent une discipline qui ne dépend plus de ton humeur du jour.",
  },
  {
    slug: "checklist-routine-soir",
    title: "Routine du soir pour un mental d'athlète",
    hook: "9 habitudes simples à installer le soir pour préparer un mental solide dès le lendemain.",
    category: "Mental",
    format: "checklist",
    readTime: "3 min",
    icon: "Moon",
    intro:
      "Ce que tu fais le soir détermine en grande partie ton énergie mentale du lendemain. Voici une routine simple, pas besoin de tout appliquer d'un coup.",
    groups: [
      {
        items: [
          "Coucher à heure fixe, à plus ou moins 30 minutes près, week-end compris.",
          "Écrans coupés 30 minutes avant de dormir, remplacés par lecture ou étirements.",
          "3 choses positives de la journée notées quelque part, liées ou non au sport.",
          "5 minutes de respiration ou de calme avant de fermer les yeux.",
          "Bilan express de la journée : ce qui a marché, ce qui doit changer demain.",
          "Sac de sport ou affaires du lendemain préparés, une friction en moins au réveil.",
          "Aucune décision importante prise en état de fatigue mentale avancée.",
          "Un seul objectif non négociable identifié pour le lendemain, pas dix.",
          "Écran de chambre à distance du lit, hors de portée de main.",
        ],
      },
    ],
    conclusion:
      "Choisis 2 ou 3 habitudes de cette liste pour commencer, pas les 9 en même temps. Une routine du soir qui tient sur la durée vaut infiniment mieux qu'une routine parfaite abandonnée après une semaine.",
  },
  {
    slug: "quiz-obstacle-mental",
    title: "Quel est ton principal obstacle mental ?",
    hook: "6 questions pour identifier ce qui te freine vraiment, et pas ce que tu crois te freiner.",
    category: "Mental",
    format: "quiz",
    readTime: "3 min",
    icon: "Brain",
    intro:
      "Motivation, stress, image corporelle, discipline : on se trompe souvent sur ce qui nous freine réellement. Ce quiz t'aide à y voir plus clair.",
    questions: [
      {
        question: "Ce qui te fait le plus souvent sauter une séance...",
        options: [
          { label: "Je n'ai juste pas envie ce jour là", resultKey: "motivation" },
          { label: "Je suis débordé(e) ou stressé(e) par autre chose", resultKey: "stress" },
          { label: "Je remets à demain, encore et encore", resultKey: "discipline" },
          { label: "Je n'ai pas envie qu'on me voie dans cet état physique", resultKey: "image" },
        ],
      },
      {
        question: "Après une semaine chargée...",
        options: [
          { label: "Ma motivation retombe complètement", resultKey: "motivation" },
          { label: "Mon anxiété prend toute la place", resultKey: "stress" },
          { label: "Je perds le fil de ma routine", resultKey: "discipline" },
          { label: "Je me juge plus durement sur mon physique", resultKey: "image" },
        ],
      },
      {
        question: "Face à ton reflet dans le miroir...",
        options: [
          { label: "Ça ne m'affecte pas particulièrement", resultKey: "motivation" },
          { label: "Ça dépend beaucoup de mon état émotionnel du jour", resultKey: "stress" },
          { label: "Je n'y pense pas vraiment, je suis sur mes objectifs", resultKey: "discipline" },
          { label: "Je suis souvent critique envers moi même", resultKey: "image" },
        ],
      },
      {
        question: "Ce qui te ferait le plus progresser aujourd'hui...",
        options: [
          { label: "Retrouver l'envie", resultKey: "motivation" },
          { label: "Apprendre à gérer la pression", resultKey: "stress" },
          { label: "Une routine plus simple à tenir", resultKey: "discipline" },
          { label: "Faire la paix avec mon reflet", resultKey: "image" },
        ],
      },
      {
        question: "Tes engagements sur plusieurs semaines...",
        options: [
          { label: "Je tiens bien tant que je suis motivé(e)", resultKey: "motivation" },
          { label: "Je tiens sauf quand tout s'accumule", resultKey: "stress" },
          { label: "Je recommence souvent à zéro", resultKey: "discipline" },
          { label: "Je tiens, mais sans vraiment en profiter", resultKey: "image" },
        ],
      },
      {
        question: "Ce que tu redoutes le plus en ce moment...",
        options: [
          { label: "Perdre l'envie complètement", resultKey: "motivation" },
          { label: "Craquer sous la pression", resultKey: "stress" },
          { label: "Ne jamais devenir vraiment régulier(e)", resultKey: "discipline" },
          { label: "Ne jamais être satisfait(e) de mon reflet", resultKey: "image" },
        ],
      },
    ],
    outcomes: [
      {
        key: "motivation",
        title: "Ton obstacle : la motivation",
        description:
          "Ton énergie de départ retombe vite. Ce qu'il te faut, ce n'est pas plus de volonté, c'est un système qui ne dépend pas de ton envie du jour : objectifs courts, victoires visibles, routine qui réduit la friction.",
      },
      {
        key: "stress",
        title: "Ton obstacle : le stress",
        description:
          "La charge mentale extérieure déborde sur ton entraînement et ta nutrition. Ce qu'il te faut, c'est un plan qui absorbe les semaines difficiles sans tout faire s'écrouler (mode survie prévu à l'avance, pas tout ou rien).",
      },
      {
        key: "discipline",
        title: "Ton obstacle : la discipline",
        description:
          "Ce n'est pas l'envie qui manque, c'est la constance. Ce qu'il te faut, c'est réduire les frictions du quotidien (préparation, planification) plutôt que compter sur un effort de volonté permanent.",
      },
      {
        key: "image",
        title: "Ton obstacle : l'image corporelle",
        description:
          "Ton rapport à ton reflet pèse plus lourd que tes résultats réels. Ce qu'il te faut, c'est mesurer ta progression avec des données factuelles (photos, mensurations moyennées) plutôt qu'avec un miroir un matin difficile, et probablement en parler à quelqu'un.",
      },
    ],
  },

  // ── Récupération ──────────────────────────────────────────────────────
  {
    slug: "guide-sommeil-muscle",
    title: "Sommeil et prise de muscle : ce que ça change vraiment",
    hook: "Le sommeil est le seul anabolisant gratuit et légal. Voici pourquoi tu ne peux pas t'en passer.",
    category: "Récupération",
    format: "guide",
    readTime: "5 min",
    icon: "BedDouble",
    intro:
      "On optimise les macros, le volume d'entraînement, le RIR, et on néglige complètement le sommeil, alors que c'est souvent le levier le plus sous exploité de tous.",
    sections: [
      {
        heading: "Ce qui se passe pendant que tu dors",
        paragraphs: [
          "La sécrétion d'hormone de croissance atteint son pic pendant le sommeil profond. C'est aussi pendant la nuit que se fait l'essentiel de la réparation et de la synthèse des tissus musculaires sollicités pendant l'entraînement.",
          "Un manque de sommeil chronique augmente le cortisol (hormone du stress) et réduit la testostérone, un cocktail hormonal qui va directement à l'encontre de la prise de muscle et de la perte de gras.",
        ],
      },
      {
        heading: "Combien d'heures, réellement",
        paragraphs: [
          "7 à 9 heures par nuit pour la grande majorité des adultes actifs. En dessous de 6 heures de façon répétée, les études montrent une baisse mesurable de la force et de la récupération, peu importe la qualité de l'entraînement.",
        ],
      },
      {
        heading: "La qualité compte autant que la quantité",
        paragraphs: [
          "Une chambre fraîche, sombre, sans écran dans la dernière demi heure avant de dormir, et un horaire de coucher régulier (week-end compris) améliorent significativement la qualité du sommeil profond, indépendamment du nombre d'heures total.",
        ],
      },
      {
        heading: "Le piège de la compensation le week-end",
        paragraphs: [
          "Dormir 5 heures en semaine et rattraper le week-end ne compense pas la dette accumulée sur les hormones et la récupération musculaire. La régularité prime sur la moyenne.",
        ],
      },
    ],
    conclusion:
      "Si ta progression stagne malgré un entraînement et une nutrition solides, le sommeil est souvent le premier endroit à regarder, avant de changer quoi que ce soit d'autre.",
  },
  {
    slug: "checklist-surentrainement",
    title: "Es tu en surentraînement ?",
    hook: "8 signaux à surveiller avant que la fatigue accumulée ne te force à tout arrêter.",
    category: "Récupération",
    format: "checklist",
    readTime: "3 min",
    icon: "Activity",
    intro:
      "Le surentraînement ne se voit pas du jour au lendemain, il s'accumule. Voici les signaux à prendre au sérieux.",
    groups: [
      {
        items: [
          "Ta force chute sur des charges que tu maîtrisais facilement il y a 2 semaines.",
          "Ta motivation à l'entraînement s'effondre malgré un repos suffisant.",
          "Ton sommeil s'est dégradé alors que rien d'autre n'a changé dans ta vie.",
          "Ta fréquence cardiaque au repos est plus élevée que d'habitude le matin.",
          "Tu ressens une irritabilité ou une fatigue inhabituelle en dehors de la salle.",
          "Tes courbatures mettent nettement plus de temps à disparaître qu'avant.",
          "Tu es plus souvent malade ou légèrement blessé(e) ces dernières semaines.",
          "Ton appétit a changé de façon marquée, à la hausse ou à la baisse, sans raison claire.",
        ],
      },
    ],
    conclusion:
      "2 signaux ou plus sur plusieurs jours consécutifs, c'est le moment de programmer une semaine de deload (volume et intensité réduits), pas de pousser davantage. Le repos fait partie de l'entraînement, pas son contraire.",
  },

  // ── Général ───────────────────────────────────────────────────────────
  {
    slug: "guide-7-erreurs-transformation",
    title: "Les 7 erreurs qui ruinent une transformation physique",
    hook: "Les erreurs qui expliquent pourquoi tant de gens travaillent dur sans jamais voir de vrais résultats.",
    category: "Général",
    format: "guide",
    readTime: "7 min",
    icon: "Flag",
    intro:
      "La plupart des transformations ratées ne le sont pas par manque d'effort, mais à cause de quelques erreurs structurelles qui reviennent tout le temps. Les voici, avec comment les corriger.",
    sections: [
      {
        heading: "1. Changer de programme trop souvent",
        paragraphs: [
          "Sauter d'une méthode à l'autre toutes les 2 ou 3 semaines empêche de mesurer le vrai effet de chaque approche. La progression demande de la constance sur un programme cohérent pendant au moins 6 à 8 semaines avant de juger s'il fonctionne.",
        ],
      },
      {
        heading: "2. Ignorer la progression de charge",
        paragraphs: [
          "S'entraîner dur sans jamais chercher à faire un peu plus qu'avant (charge, reps, ou qualité d'exécution) revient à demander au corps de s'adapter à un stimulus qu'il connaît déjà. Sans surcharge progressive, pas de progression, même avec un effort maximal à chaque séance.",
        ],
      },
      {
        heading: "3. Sous estimer la nutrition",
        paragraphs: [
          "Aucun programme d'entraînement, aussi parfait soit il, ne compense un déficit ou un excès calorique mal géré. La nutrition représente une part au moins aussi importante que l'entraînement dans le résultat final.",
        ],
      },
      {
        heading: "4. Se fier uniquement à la balance",
        paragraphs: [
          "Le poids fluctue chaque jour avec l'eau, la digestion, le sommeil. Juger sa progression uniquement sur ce chiffre du jour mène à des décisions émotionnelles et souvent mauvaises. Les mensurations, les photos et la moyenne hebdomadaire du poids racontent une histoire beaucoup plus fiable.",
        ],
      },
      {
        heading: "5. Négliger la récupération",
        paragraphs: [
          "Le muscle ne se construit pas pendant la séance, il se construit pendant la récupération qui suit. Sommeil insuffisant et absence de semaines de repos programmées finissent toujours par plafonner la progression, peu importe l'intensité à l'entraînement.",
        ],
      },
      {
        heading: "6. Viser la perfection plutôt que la constance",
        paragraphs: [
          "Attendre le moment parfait pour commencer, ou abandonner après un seul écart, tue plus de transformations que n'importe quel mauvais choix alimentaire ponctuel. 80% de constance sur un an bat 100% de perfection pendant 3 semaines.",
        ],
      },
      {
        heading: "7. Ne rien mesurer",
        paragraphs: [
          "Sans suivi (charges, poids, mensurations, photos), impossible de savoir objectivement si une méthode fonctionne. La plupart des ajustements se font au feeling, alors qu'ils devraient se faire sur des données réelles accumulées sur plusieurs semaines.",
        ],
      },
    ],
    conclusion:
      "Corriger ne serait ce que 2 ou 3 de ces erreurs change radicalement la trajectoire d'une transformation. Ce n'est presque jamais une question d'effort, c'est une question de structure.",
  },
  {
    slug: "checklist-pret-coaching",
    title: "Es tu prêt(e) à te faire coacher ?",
    hook: "10 questions honnêtes pour savoir si un accompagnement va vraiment t'aider maintenant.",
    category: "Général",
    format: "checklist",
    readTime: "3 min",
    icon: "Users",
    intro:
      "Le coaching n'est pas la solution à tout, ni pour tout le monde, ni à tout moment. Cette checklist t'aide à savoir honnêtement où tu en es.",
    groups: [
      {
        items: [
          "Tu as déjà essayé de progresser seul(e) pendant plusieurs mois sans résultat satisfaisant.",
          "Tu passes plus de temps à chercher des informations contradictoires qu'à réellement t'entraîner.",
          "Tu ne sais pas si ton programme actuel est adapté à ton niveau et ton objectif.",
          "Tu manques de régularité, pas par manque d'envie, mais par manque de structure claire.",
          "Tu as déjà ressenti le besoin que quelqu'un vérifie et ajuste ce que tu fais.",
          "Tu es prêt(e) à suivre des consignes précises, même quand elles bousculent tes habitudes.",
          "Tu as un objectif concret, pas juste l'envie vague de faire du sport.",
          "Tu peux consacrer un minimum de temps chaque semaine à ton suivi (nutrition, entraînement, bilans).",
          "Tu cherches un accompagnement dans la durée, pas une solution miracle en 2 semaines.",
          "Tu es prêt(e) à être honnête sur tes résultats, même quand ils ne sont pas ceux espérés.",
        ],
      },
    ],
    conclusion:
      "6 réponses positives ou plus, un accompagnement structuré a de très fortes chances de faire une vraie différence pour toi. En dessous, ce n'est pas grave, ce guide et les autres ressources gratuites restent là pour t'aider à avancer en autonomie.",
  },
  {
    slug: "quiz-phase-actuelle",
    title: "Quelle phase te correspond maintenant ?",
    hook: "Prise de masse, sèche, maintenance : découvre dans quelle phase tu devrais réellement être en ce moment.",
    category: "Général",
    format: "quiz",
    readTime: "3 min",
    icon: "TrendingUp",
    intro:
      "Beaucoup de monde choisit sa phase (masse ou sèche) par envie du moment plutôt que par logique. Ce quiz t'aide à voir plus clair sur où tu en es réellement.",
    questions: [
      {
        question: "Ton niveau de masse grasse actuel te semble...",
        options: [
          { label: "Confortable, je peux prendre du muscle sans problème", resultKey: "masse" },
          { label: "Trop élevé, je veux d'abord m'affiner", resultKey: "deficit" },
          { label: "Je suis satisfait(e), je veux juste maintenir", resultKey: "maintenance" },
        ],
      },
      {
        question: "Ton énergie et ta force à l'entraînement en ce moment...",
        options: [
          { label: "Très bonnes, je progresse bien", resultKey: "masse" },
          { label: "Correctes mais je sens que je stagne", resultKey: "deficit" },
          { label: "Stables depuis un moment", resultKey: "maintenance" },
        ],
      },
      {
        question: "Ton appétit et ta relation à la nourriture...",
        options: [
          { label: "Facile de manger plus, pas de restriction", resultKey: "masse" },
          { label: "Je suis prêt(e) à accepter une restriction calorique", resultKey: "deficit" },
          { label: "Je préfère ne pas trop bouger mes habitudes", resultKey: "maintenance" },
        ],
      },
      {
        question: "Ton objectif principal des 3 prochains mois...",
        options: [
          { label: "Construire du muscle et de la force", resultKey: "masse" },
          { label: "Perdre du gras en gardant un maximum de muscle", resultKey: "deficit" },
          { label: "Stabiliser mes résultats actuels", resultKey: "maintenance" },
        ],
      },
      {
        question: "Ta dernière phase de progression date de...",
        options: [
          { label: "Longtemps, je stagne en maintenance depuis un moment", resultKey: "masse" },
          { label: "Une longue période de prise de masse", resultKey: "deficit" },
          { label: "Je sors justement d'une sèche ou d'une masse", resultKey: "maintenance" },
        ],
      },
    ],
    outcomes: [
      {
        key: "masse",
        title: "Phase recommandée : Prise de masse",
        description:
          "Ton énergie, ta relation à la nourriture et ton objectif pointent tous vers un surplus calorique contrôlé. C'est le bon moment pour construire du muscle, avec un suivi qui limite la prise de gras excessive.",
      },
      {
        key: "deficit",
        title: "Phase recommandée : Déficit / Sèche",
        description:
          "Tu sembles prêt(e) mentalement et physiquement pour une phase de perte de gras. Un déficit calorique structuré, avec un maintien des protéines et de l'intensité à l'entraînement, va préserver ton muscle pendant que le gras diminue.",
      },
      {
        key: "maintenance",
        title: "Phase recommandée : Maintenance",
        description:
          "Tu es probablement au bon moment pour stabiliser tes résultats actuels avant de repartir dans une nouvelle phase. La maintenance n'est pas une pause dans la progression, c'est le moment où le corps consolide ce qu'il a construit.",
      },
    ],
  },
  {
    slug: "guide-lire-progression",
    title: "Comment lire tes vraies statistiques de progression",
    hook: "La balance ne raconte qu'une petite partie de l'histoire. Voici comment suivre ta progression pour de vrai.",
    category: "Général",
    format: "guide",
    readTime: "5 min",
    icon: "ClipboardList",
    intro:
      "Se fier uniquement au chiffre du matin sur la balance est la première cause de découragement inutile. Voici les indicateurs qui donnent une vision beaucoup plus fidèle de ta progression réelle.",
    sections: [
      {
        heading: "Le poids : utile, mais seulement en moyenne",
        paragraphs: [
          "Le poids fluctue de 1 à 2 kg d'un jour à l'autre selon l'eau, la digestion, le sommeil et le cycle hormonal. Seule la moyenne sur 7 jours, comparée à la moyenne de la semaine précédente, a une vraie valeur pour juger d'une tendance.",
        ],
      },
      {
        heading: "Les mensurations, la donnée la plus sous utilisée",
        paragraphs: [
          "Tour de taille, de hanches, de bras, de cuisses : ces mesures, prises une fois par semaine ou toutes les deux semaines, révèlent des changements de composition corporelle que le poids seul ne montre jamais, surtout en début de programme.",
        ],
      },
      {
        heading: "Les photos, prises dans les mêmes conditions",
        paragraphs: [
          "Même lumière, même heure de la journée, même pose, toutes les 2 à 4 semaines. Les changements visuels sont souvent visibles sur photo bien avant d'apparaître sur la balance ou même dans le miroir au quotidien.",
        ],
      },
      {
        heading: "La performance à l'entraînement",
        paragraphs: [
          "Charges soulevées, répétitions réalisées à un RIR donné, sensation générale en séance : une progression de force à volume constant est un signe fiable de progrès, même quand le poids ne bouge pas.",
        ],
      },
      {
        heading: "Comment tout combiner",
        paragraphs: [
          "Aucun indicateur seul ne suffit. C'est le croisement entre moyenne de poids, mensurations, photos et performance qui donne une image fidèle de la progression réelle, semaine après semaine.",
        ],
      },
    ],
    conclusion:
      "Arrête de juger 12 semaines de travail sur un seul chiffre vu un seul matin. La vraie progression se lit sur plusieurs indicateurs, sur la durée.",
  },

  // ── Entraînement (2) ─────────────────────────────────────────────────
  {
    slug: "guide-hypertrophie-force",
    title: "Hypertrophie ou force : comment vraiment choisir",
    hook: "Les deux objectifs ne se travaillent pas pareil. Voici comment structurer tes séances selon ce que tu veux vraiment développer.",
    category: "Entraînement",
    format: "guide",
    readTime: "6 min",
    icon: "Zap",
    intro:
      "Prendre du muscle et devenir plus fort ne sont pas le même objectif, même si les deux se travaillent en salle avec les mêmes barres. Confondre les deux mène à des séances bâtardes qui ne progressent nulle part vraiment. Voici comment distinguer les deux logiques et structurer ton entraînement selon ce que tu veux vraiment développer.",
    sections: [
      {
        heading: "Deux adaptations, deux stimulus",
        paragraphs: [
          "La force pure vise à améliorer ta capacité nerveuse à recruter du muscle sur un mouvement précis : charges lourdes (souvent 1 à 5 répétitions), repos longs (3 à 5 minutes), peu d'exercices travaillés en profondeur. L'hypertrophie vise à faire grossir le muscle lui même : charges modérées (6 à 15 répétitions), fatigue métabolique recherchée, volume plus élevé.",
          "Un pratiquant qui ne fait que du 1 à 3 répétitions toute l'année progresse en force sur ces mouvements précis, mais construit relativement peu de masse musculaire. À l'inverse, un pratiquant qui reste toujours entre 12 et 20 répétitions développe du volume musculaire mais plafonne vite en charge maximale, faute d'avoir jamais entraîné le système nerveux à des intensités élevées.",
        ],
      },
      {
        heading: "Comment structurer un bloc force",
        paragraphs: [
          "Un bloc force dure généralement 4 à 6 semaines. Les mouvements polyarticulaires (squat, développé, tirage, soulevé de terre) passent en 3 à 6 répétitions, RIR 1 à 2, avec 3 à 5 minutes de repos entre les séries. Le volume total baisse par rapport à un bloc hypertrophie, mais l'intensité relative monte.",
          "Garde 1 à 2 exercices d'isolation en fin de séance pour continuer à entretenir un minimum de volume musculaire pendant le bloc, sans quoi tu risques de perdre un peu de masse pendant que tu te concentres sur la force pure.",
        ],
      },
      {
        heading: "Comment structurer un bloc hypertrophie",
        paragraphs: [
          "Le volume prime sur l'intensité relative. Vise 8 à 15 répétitions sur la majorité des exercices, RIR 0 à 2 selon la fraîcheur, 60 à 120 secondes de repos. Le nombre de séries hebdomadaires par groupe musculaire compte plus que la charge absolue soulevée.",
          "C'est aussi le bloc où varier les angles et les exercices apporte le plus, parce que chaque variante stimule le muscle un peu différemment et permet d'accumuler plus de volume total sans épuiser les mêmes articulations.",
        ],
      },
      {
        heading: "Alterner plutôt que choisir une fois pour toutes",
        paragraphs: [
          "La plupart des pratiquants progressent mieux en alternant des blocs : quelques semaines de force pour faire monter les charges de référence, puis un bloc hypertrophie plus long pour transformer cette force en volume musculaire. Les charges plus lourdes acquises en bloc force permettent ensuite de travailler l'hypertrophie avec des poids relativement plus élevés, ce qui accélère la progression globale.",
        ],
      },
    ],
    conclusion:
      "Il n'y a pas un objectif supérieur à l'autre : la force construit la base, l'hypertrophie construit le volume dessus. Alterner les deux sur l'année donne de bien meilleurs résultats que de rester bloqué sur une seule logique toute l'année.",
  },
  {
    slug: "checklist-echauffement",
    title: "Ton échauffement rate peut être ta séance",
    hook: "8 points pour un échauffement qui prépare vraiment le corps, sans perdre 20 minutes ni sauter directement aux charges lourdes.",
    category: "Entraînement",
    format: "checklist",
    readTime: "3 min",
    icon: "Timer",
    intro:
      "Un échauffement mal fait laisse le corps froid sur les premières séries lourdes, ou au contraire vide toute l'énergie avant même de commencer. Voici les points qui font qu'un échauffement prépare vraiment la séance.",
    groups: [
      {
        heading: "Avant les barres",
        items: [
          "5 à 8 minutes d'activation cardio légère (vélo, rameur, corde à sauter) pour faire monter la température corporelle",
          "Mobilité articulaire ciblée sur les articulations sollicitées dans la séance du jour, pas une routine générique identique tous les jours",
          "Activation musculaire légère des groupes principaux de la séance avec des charges très faibles, pour réveiller le pattern moteur",
        ],
      },
      {
        heading: "Montée en charge sur le premier exercice",
        items: [
          "Série d'échauffement à environ 50% de la charge de travail, 8 à 10 répétitions faciles",
          "Série à environ 70% de la charge de travail, 4 à 5 répétitions",
          "Série à environ 85 à 90% de la charge de travail, 2 à 3 répétitions",
          "Une série d'approche supplémentaire si la charge de travail est particulièrement lourde ce jour là",
        ],
      },
      {
        heading: "Signes que l'échauffement est suffisant",
        items: [
          "Légère transpiration, respiration élevée mais pas essoufflée",
          "Amplitude articulaire complète et confortable sur les mouvements du jour",
          "Aucune sensation de raideur ou de gêne résiduelle sur les zones travaillées",
        ],
      },
    ],
    conclusion:
      "Un bon échauffement dure rarement plus de 10 à 15 minutes. L'objectif n'est pas de fatiguer, c'est de préparer le corps à exprimer sa force en sécurité dès la première vraie série.",
  },
  {
    slug: "quiz-niveau-pratiquant",
    title: "Débutant, intermédiaire ou avancé : où tu en es vraiment",
    hook: "Réponds à ces questions pour situer honnêtement ton niveau, et comprendre ce qui va vraiment te faire progresser à partir de maintenant.",
    category: "Entraînement",
    format: "quiz",
    readTime: "3 min",
    icon: "Gauge",
    intro:
      "L'ancienneté en salle ne dit pas grand chose du niveau réel. Ce quiz se base sur des critères concrets de progression pour te situer plus justement.",
    questions: [
      {
        question: "Depuis combien de temps t'entraînes tu avec une vraie régularité (au moins 3 séances par semaine) ?",
        options: [
          { label: "Moins de 6 mois", resultKey: "debutant" },
          { label: "Entre 6 mois et 2 ans", resultKey: "intermediaire" },
          { label: "Plus de 2 ans", resultKey: "avance" },
        ],
      },
      {
        question: "Comment évoluent tes charges sur les mouvements de base en ce moment ?",
        options: [
          { label: "Ça monte pratiquement à chaque séance", resultKey: "debutant" },
          { label: "Ça monte, mais plus lentement, sur plusieurs semaines", resultKey: "intermediaire" },
          { label: "Ça stagne souvent, il faut des cycles précis pour progresser", resultKey: "avance" },
        ],
      },
      {
        question: "Sais tu ajuster une séance en temps réel selon ta fatigue du jour ?",
        options: [
          { label: "Pas vraiment, je suis le programme tel quel", resultKey: "debutant" },
          { label: "Un peu, j'ajuste parfois la charge", resultKey: "intermediaire" },
          { label: "Oui, je pilote systématiquement selon mon RIR et ma forme du jour", resultKey: "avance" },
        ],
      },
      {
        question: "As tu déjà géré toi même un bloc de surcharge progressive complet, du début à la fin ?",
        options: [
          { label: "Non, je ne sais pas trop ce que c'est", resultKey: "debutant" },
          { label: "Une ou deux fois, avec l'aide d'un programme", resultKey: "intermediaire" },
          { label: "Oui, plusieurs fois, je sais quand arrêter et décharger", resultKey: "avance" },
        ],
      },
    ],
    outcomes: [
      {
        key: "debutant",
        title: "Débutant : ta priorité, c'est la régularité et la technique",
        description:
          "À ce stade, la technique et la régularité comptent plus que n'importe quel détail de programme. Les charges vont monter vite, presque quelle que soit la structure choisie, tant que tu es présent et que tu apprends les mouvements correctement. Ne complique pas encore les choses avec des cycles compliqués.",
      },
      {
        key: "intermediaire",
        title: "Intermédiaire : ta priorité, c'est la structure",
        description:
          "Les progrès faciles sont derrière toi. C'est le moment où la structure du programme, le suivi des charges et la gestion de la fatigue commencent à faire une vraie différence. Un plan qui varie l'intensité sur plusieurs semaines devient nécessaire pour continuer à avancer.",
      },
      {
        key: "avance",
        title: "Avancé : ta priorité, c'est la précision",
        description:
          "À ce niveau, chaque détail compte : gestion du volume, cycles de décharge, précision du RIR, variation des stimulus. Les gains sont plus lents et demandent un pilotage fin plutôt qu'un simple programme générique.",
      },
    ],
  },
  {
    slug: "guide-deload",
    title: "La semaine de décharge : quand et pourquoi la placer",
    hook: "Baisser l'intensité une semaine n'est pas une perte de temps. C'est ce qui permet d'encaisser le bloc suivant et de continuer à progresser sur la durée.",
    category: "Entraînement",
    format: "guide",
    readTime: "5 min",
    icon: "Repeat",
    intro:
      "Beaucoup de pratiquants évitent la semaine de décharge par peur de perdre leurs acquis. C'est l'inverse qui se produit sur la durée : sans décharge, la fatigue s'accumule jusqu'à forcer un arrêt, souvent via une blessure ou un vrai coup de fatigue générale.",
    sections: [
      {
        heading: "Pourquoi la fatigue s'accumule plus vite que ce qu'on ressent",
        paragraphs: [
          "La fatigue nerveuse et articulaire s'accumule plus lentement et de façon moins visible que la fatigue musculaire ressentie séance après séance. Tu peux te sentir bien sur chaque séance individuelle tout en accumulant une dette de fatigue systémique qui finit par se payer d'un coup, souvent 6 à 10 semaines après le début d'un bloc intense.",
        ],
      },
      {
        heading: "Les signes qu'une décharge devient nécessaire",
        paragraphs: [
          "Charges qui stagnent ou reculent sur plusieurs séances d'affilée malgré une bonne récupération apparente, sommeil qui se dégrade sans raison externe, motivation à l'entraînement qui baisse, petites douleurs articulaires qui traînent sans blessure identifiable. Un seul de ces signes isolé n'est pas alarmant, mais leur cumul est un signal clair.",
        ],
      },
      {
        heading: "Comment structurer une semaine de décharge",
        paragraphs: [
          "Deux approches fonctionnent bien : réduire le volume de 40 à 50% en gardant l'intensité proche de la normale, ou réduire l'intensité de 20 à 30% en gardant à peu près le même nombre de séances. Dans les deux cas, l'objectif est de continuer à bouger et à stimuler légèrement le corps, pas de s'arrêter complètement.",
          "Une semaine complètement off n'est utile qu'en cas de fatigue vraiment sévère ou de petite douleur qui a besoin de repos total. Pour une décharge classique de routine, continuer à s'entraîner léger reste préférable à l'arrêt complet.",
        ],
      },
      {
        heading: "À quelle fréquence la placer",
        paragraphs: [
          "Pour un pratiquant intermédiaire à avancé qui s'entraîne intensément, une décharge toutes les 5 à 8 semaines est un rythme raisonnable. Pour un débutant qui progresse encore rapidement sur des charges modérées, une décharge toutes les 8 à 12 semaines suffit généralement.",
        ],
      },
    ],
    conclusion:
      "La décharge n'est pas un aveu de faiblesse, c'est un outil de planification. Les pratiquants qui progressent le plus sur plusieurs années sont ceux qui l'intègrent avant d'y être forcés par la fatigue ou la blessure.",
  },

  // ── Nutrition (2) ────────────────────────────────────────────────────
  {
    slug: "guide-timing-repas",
    title: "Le timing des repas compte-t-il vraiment ?",
    hook: "Entre les mythes sur la fenêtre anabolique et le jeûne intermittent, voici ce qui compte réellement dans le moment où tu manges.",
    category: "Nutrition",
    format: "guide",
    readTime: "5 min",
    icon: "CalendarClock",
    intro:
      "Le timing des repas fait couler beaucoup d'encre, souvent plus qu'il ne le mérite comparé au total calorique et à la répartition des macros sur la journée. Voici ce qui a un impact réel, et ce qui relève surtout du confort personnel.",
    sections: [
      {
        heading: "La fenêtre anabolique, un mythe largement exagéré",
        paragraphs: [
          "L'idée qu'il faut absolument manger des protéines dans les 30 minutes après l'entraînement pour ne pas perdre le bénéfice de la séance est largement exagérée. La fenêtre réelle de synthèse protéique augmentée dure plusieurs heures après l'effort, pas 30 minutes. Ce qui compte vraiment, c'est l'apport total en protéines sur la journée, réparti en 3 à 5 prises.",
        ],
      },
      {
        heading: "Ce que le timing change réellement",
        paragraphs: [
          "Manger un repas riche en glucides et protéines dans les 2 à 3 heures autour de la séance améliore la disponibilité énergétique pendant l'effort et facilite un peu la récupération. C'est une optimisation utile, pas une obligation absolue si ton total journalier est déjà correct.",
          "Répartir les protéines en plusieurs prises réparties sur la journée, plutôt que tout concentrer sur un ou deux repas, permet de maintenir la synthèse protéique musculaire stimulée plus régulièrement, ce qui a un impact réel sur la construction musculaire à long terme.",
        ],
      },
      {
        heading: "Jeûne intermittent : ni magique, ni problématique",
        paragraphs: [
          "Le jeûne intermittent ne booste pas la perte de graisse au delà de ce que permet le déficit calorique total. Son seul vrai avantage est parfois pratique : certaines personnes trouvent plus simple de gérer leur appétit sur une fenêtre alimentaire réduite. Si ça ne te convient pas, ou complique ta gestion de l'entraînement, rien ne t'oblige à l'adopter.",
        ],
      },
      {
        heading: "Ce qu'il faut vraiment prioriser",
        paragraphs: [
          "Dans l'ordre d'importance réelle : le total calorique sur la journée, l'apport total en protéines, la répartition des protéines sur 3 à 5 prises, puis seulement ensuite le timing précis autour de l'entraînement. Optimiser le dernier point sans avoir réglé les trois premiers n'apporte quasiment rien.",
        ],
      },
    ],
    conclusion:
      "Le timing des repas a un effet réel mais secondaire. Avant de te soucier de la minute exacte où manger, assure toi que ton total calorique et ta répartition protéique sur la journée sont déjà cohérents avec ton objectif.",
  },
  {
    slug: "checklist-repas-exterieur",
    title: "Manger dehors sans sortir de ton objectif",
    hook: "7 réflexes simples pour composer un repas au restaurant ou chez des amis sans culpabiliser ni tout faire dérailler.",
    category: "Nutrition",
    format: "checklist",
    readTime: "3 min",
    icon: "Coffee",
    intro:
      "Un repas à l'extérieur ne doit pas être vécu comme un piège ou une exception à cacher. Voici comment le gérer simplement, sans stress ni calcul obsessionnel.",
    groups: [
      {
        heading: "Avant d'arriver",
        items: [
          "Si possible, regarde la carte à l'avance pour repérer 1 ou 2 options qui contiennent une source de protéines claire",
          "Mange normalement dans la journée, ne te prive pas volontairement en prévision du repas, ça mène souvent à trop manger le soir venu",
          "Si tu connais l'heure du repas à l'avance, ajuste légèrement tes apports du jour plutôt que de tout bloquer sur ce seul repas",
        ],
      },
      {
        heading: "Au moment de commander",
        items: [
          "Priorise une source de protéines identifiable en plat principal (viande, poisson, œufs, légumineuses)",
          "Demande les sauces et assaisonnements à part si tu veux garder le contrôle sur la quantité",
          "Un féculent et des légumes en accompagnement plutôt que de la friture systématique si tu as le choix",
        ],
      },
      {
        heading: "Sur l'état d'esprit",
        items: [
          "Un repas ne fait ni gagner ni perdre du poids en une fois, c'est la moyenne sur la semaine qui compte",
          "Profiter du moment social fait aussi partie d'une hygiène de vie durable, ce n'est pas un échec",
        ],
      },
    ],
    conclusion:
      "Un repas géré avec ces quelques réflexes simples s'intègre parfaitement dans une progression normale. C'est l'accumulation de ce genre de repas plusieurs fois par semaine, sans aucun réflexe, qui pose problème sur la durée, pas un repas isolé.",
  },
  {
    slug: "guide-complements-alimentaires",
    title: "Compléments alimentaires : ce qui marche vraiment",
    hook: "Entre le marketing et la vraie science, voici les seuls compléments qui ont un intérêt démontré pour la majorité des pratiquants.",
    category: "Nutrition",
    format: "guide",
    readTime: "5 min",
    icon: "ShieldCheck",
    intro:
      "Le marché des compléments alimentaires vend énormément de promesses pour un impact réel souvent minime. Voici ce qui a vraiment un intérêt démontré, et ce qui reste secondaire ou inutile pour la plupart des pratiquants.",
    sections: [
      {
        heading: "Ce qui a un intérêt démontré",
        paragraphs: [
          "La whey (ou toute protéine en poudre) sert uniquement à atteindre plus facilement ton total protéique journalier si l'alimentation seule ne suffit pas. Ce n'est ni magique ni indispensable si tu manges assez de protéines par ailleurs.",
          "La créatine monohydrate est un des compléments les mieux étudiés, avec un effet réel et mesuré sur la force et le volume d'entraînement possible, à raison de 3 à 5 grammes par jour, pris régulièrement.",
          "La vitamine D est utile en complément pour la majorité des personnes qui manquent d'exposition au soleil, particulièrement en hiver, indépendamment de tout objectif sportif.",
          "La caféine améliore la performance et la sensation d'énergie à l'entraînement pour la plupart des gens, à condition de ne pas en abuser en fin de journée au risque d'impacter le sommeil.",
        ],
      },
      {
        heading: "Ce qui reste secondaire",
        paragraphs: [
          "Les BCAA n'apportent rien de plus si ton apport total en protéines est déjà suffisant sur la journée. Les brûleurs de graisse n'ont quasiment aucun effet mesurable indépendant d'un déficit calorique réel. Les compléments multi ingrédients aux promesses vagues (boost testostérone, détox, etc.) manquent presque tous de preuves solides.",
        ],
      },
      {
        heading: "Comment prioriser un budget compléments limité",
        paragraphs: [
          "Dans l'ordre : d'abord une alimentation qui couvre les besoins de base, puis la créatine si le budget le permet, puis une protéine en poudre si atteindre le total protéique par l'alimentation seule est compliqué, puis la vitamine D si l'exposition au soleil est faible. Tout le reste est optionnel et n'a un intérêt réel que dans des cas très spécifiques.",
        ],
      },
    ],
    conclusion:
      "Les compléments complètent une alimentation déjà correcte, ils ne la remplacent jamais. Avant de dépenser sur un complément quelconque, vérifie que les bases (calories, protéines, sommeil) sont déjà en place.",
  },
  {
    slug: "quiz-besoin-deficit",
    title: "As tu vraiment besoin d'un déficit calorique ?",
    hook: "Avant de te lancer dans une phase de sèche, réponds à ces questions pour savoir si c'est vraiment ce dont ton corps et tes objectifs ont besoin maintenant.",
    category: "Nutrition",
    format: "quiz",
    readTime: "3 min",
    icon: "Scale",
    intro:
      "Se mettre en déficit calorique par réflexe, sans se demander si c'est le bon moment, mène souvent à une sèche mal vécue ou inutile. Ce quiz t'aide à clarifier où tu en es vraiment.",
    questions: [
      {
        question: "Comment décrirais tu ton niveau d'énergie et ta motivation à l'entraînement en ce moment ?",
        options: [
          { label: "Très bon, je progresse bien", resultKey: "pret" },
          { label: "Correct mais pas exceptionnel", resultKey: "bientot" },
          { label: "Fatigué, motivation en baisse", resultKey: "attendre" },
        ],
      },
      {
        question: "Depuis combien de temps es tu en surplus ou en maintenance ?",
        options: [
          { label: "Moins de 3 mois", resultKey: "attendre" },
          { label: "Entre 3 et 8 mois", resultKey: "bientot" },
          { label: "Plus de 8 mois", resultKey: "pret" },
        ],
      },
      {
        question: "Comment est ta relation actuelle avec la nourriture et le comptage des calories ?",
        options: [
          { label: "Sereine, je gère facilement", resultKey: "pret" },
          { label: "Correcte mais je sais que ça demande de la rigueur", resultKey: "bientot" },
          { label: "Tendue, je redoute de me restreindre", resultKey: "attendre" },
        ],
      },
      {
        question: "Qu'est ce qui motive l'envie de sèche en ce moment ?",
        options: [
          { label: "Un objectif précis et planifié (photo, échéance, phase du plan)", resultKey: "pret" },
          { label: "L'envie générale de perdre du gras", resultKey: "bientot" },
          { label: "La comparaison avec d'autres ou une pression extérieure", resultKey: "attendre" },
        ],
      },
    ],
    outcomes: [
      {
        key: "pret",
        title: "Prêt pour un déficit",
        description:
          "Ton énergie, ton ancienneté en surplus ou maintenance et ta relation à la nourriture sont favorables. Un déficit modéré et planifié a de bonnes chances de bien se passer maintenant.",
      },
      {
        key: "bientot",
        title: "Presque prêt, mais pas encore optimal",
        description:
          "Rien n'empêche de commencer, mais quelques semaines de plus en maintenance pourraient stabiliser ta motivation et tes repères alimentaires avant de te mettre en déficit dans de meilleures conditions.",
      },
      {
        key: "attendre",
        title: "Pas le bon moment pour l'instant",
        description:
          "Se mettre en déficit maintenant, avec une énergie basse et une relation tendue à la nourriture, risque surtout de mal se passer. Stabiliser d'abord le sommeil, le stress et la motivation donnera de bien meilleurs résultats une fois le déficit lancé.",
      },
    ],
  },
  {
    slug: "checklist-collations-proteinees",
    title: "10 collations riches en protéines faciles à préparer",
    hook: "Des idées simples pour combler ton apport en protéines entre les repas, sans y passer des heures en cuisine.",
    category: "Nutrition",
    format: "checklist",
    readTime: "3 min",
    icon: "Salad",
    intro:
      "Atteindre son total protéique journalier est souvent plus facile avec 1 ou 2 collations bien choisies plutôt qu'en essayant de tout caser sur les repas principaux. Voici des options simples et rapides.",
    groups: [
      {
        heading: "Sans préparation",
        items: [
          "Skyr ou fromage blanc nature avec un fruit",
          "Œufs durs préparés à l'avance pour la semaine",
          "Thon ou saumon en conserve, égoutté",
          "Une poignée de fromage type comté ou emmental",
        ],
      },
      {
        heading: "Avec un peu de préparation",
        items: [
          "Shake protéiné maison (whey, lait, banane)",
          "Blancs de poulet cuits en avance en début de semaine, à réchauffer",
          "Yaourt grec avec des flocons d'avoine et du miel",
        ],
      },
      {
        heading: "En déplacement",
        items: [
          "Barres protéinées avec un profil macro correct (à vérifier au dos, beaucoup sont surtout sucrées)",
          "Mélange de noix et fruits secs pour un apport mixte protéines et bonnes graisses",
          "Lait ou boisson protéinée prête à boire",
        ],
      },
    ],
    conclusion:
      "Pas besoin de sophistication pour bien manger entre les repas. Le plus important, c'est d'avoir toujours une option simple et accessible sous la main pour éviter de sauter les collations par manque de temps.",
  },

  // ── Mental (2) ───────────────────────────────────────────────────────
  {
    slug: "guide-comparaison-reseaux",
    title: "Arrêter de se comparer aux physiques sur les réseaux",
    hook: "La comparaison permanente avec des physiques irréalistes ou trafiqués sabote la motivation plus qu'elle ne la nourrit. Voici comment reprendre le contrôle.",
    category: "Mental",
    format: "guide",
    readTime: "5 min",
    icon: "Smartphone",
    intro:
      "Scroller des photos de physiques impressionnants peut sembler motivant sur le moment, mais finit souvent par nourrir un sentiment de retard permanent, même quand la progression réelle est bonne. Voici pourquoi, et comment changer cette dynamique.",
    sections: [
      {
        heading: "Ce que les réseaux ne montrent jamais",
        paragraphs: [
          "La plupart des physiques mis en avant sur les réseaux sociaux sont le résultat d'années d'entraînement, parfois de pratiques non déclarées, souvent d'un éclairage et d'une pompe musculaire optimisés juste pour la photo. Comparer ta progression du quotidien à ce résultat final soigneusement mis en scène biaise complètement la perception.",
        ],
      },
      {
        heading: "Pourquoi la comparaison sabote la motivation",
        paragraphs: [
          "Le cerveau compare naturellement, mais quand la référence est irréaliste ou hors de portée à court terme, cette comparaison génère plus de découragement que d'élan. À force, certains finissent par sous estimer une vraie progression simplement parce qu'elle ne ressemble pas à l'image vue en ligne.",
        ],
      },
      {
        heading: "Comment changer de référence",
        paragraphs: [
          "La seule comparaison vraiment utile est celle avec toi même, quelques semaines ou mois plus tôt : tes charges, tes photos, tes mensurations, ton énergie au quotidien. C'est la seule donnée qui reflète vraiment ton propre travail.",
          "Réduire volontairement le temps passé à scroller du contenu physique comparatif, ou nettoyer les comptes suivis pour privilégier du contenu éducatif plutôt qu'esthétique, change concrètement le rapport à l'entraînement sur la durée.",
        ],
      },
    ],
    conclusion:
      "Ta progression se mesure par rapport à toi même, pas par rapport à un fil d'actualité soigneusement sélectionné. Reprendre le contrôle de ce que tu regardes change directement ta motivation au quotidien.",
  },
  {
    slug: "checklist-accountability",
    title: "Créer un système qui te tient vraiment engagé",
    hook: "La motivation seule ne suffit jamais sur la durée. Voici comment construire un système d'engagement qui tient même les jours sans envie.",
    category: "Mental",
    format: "checklist",
    readTime: "4 min",
    icon: "ThumbsUp",
    intro:
      "Compter uniquement sur la motivation pour rester régulier fonctionne les premières semaines, puis s'effondre dès que la vie se complique. Voici les éléments d'un système d'engagement qui tient sur la durée.",
    groups: [
      {
        heading: "Rendre l'engagement visible",
        items: [
          "Noter chaque séance réalisée, même brièvement, pour visualiser la régularité réelle sur plusieurs semaines",
          "Partager ton objectif à au moins une personne de confiance qui peut te demander des nouvelles régulièrement",
          "Fixer des points d'étape réguliers (toutes les 2 à 4 semaines) plutôt qu'un seul objectif final lointain",
        ],
      },
      {
        heading: "Réduire la friction",
        items: [
          "Préparer les affaires de sport la veille pour supprimer une excuse facile le matin",
          "Bloquer les créneaux d'entraînement dans l'agenda comme un rendez vous non négociable",
          "Avoir un plan B court (15 à 20 minutes) pour les jours vraiment chargés plutôt que de sauter complètement la séance",
        ],
      },
      {
        heading: "S'entourer plutôt que compter seul sur sa volonté",
        items: [
          "Un coach ou un partenaire d'entraînement qui attend ta présence change fortement le taux de régularité réel",
          "Rejoindre une communauté ou un groupe qui partage le même objectif aide à tenir dans les périodes de creux",
        ],
      },
    ],
    conclusion:
      "Un bon système rend la régularité presque automatique, sans dépendre de ta motivation du jour. C'est ce qui distingue les progressions qui tiennent sur plusieurs années de celles qui s'arrêtent après quelques mois.",
  },
  {
    slug: "guide-syndrome-imposteur",
    title: "Le syndrome de l'imposteur du pratiquant : pourquoi tu doutes encore",
    hook: "Se sentir illégitime malgré de vrais progrès est plus courant qu'il n'y paraît. Voici pourquoi ça arrive, et comment le désamorcer.",
    category: "Mental",
    format: "guide",
    readTime: "5 min",
    icon: "Sparkles",
    intro:
      "Beaucoup de pratiquants qui progressent réellement continuent de se sentir illégitimes, comme s'ils n'avaient pas vraiment leur place en salle ou pas le droit de se considérer comme sérieux. Ce sentiment a des causes précises, et des façons concrètes de le désamorcer.",
    sections: [
      {
        heading: "Pourquoi le sentiment persiste malgré les progrès",
        paragraphs: [
          "Le cerveau s'habitue vite à ce qui est devenu normal pour lui. Une charge qui paraissait impressionnante il y a 6 mois devient banale une fois atteinte, ce qui donne l'impression trompeuse de n'avoir jamais vraiment progressé. C'est un biais d'adaptation, pas un reflet de la réalité.",
        ],
      },
      {
        heading: "La comparaison comme carburant du doute",
        paragraphs: [
          "Se situer par rapport aux pratiquants les plus avancés de la salle, plutôt que par rapport à soi même quelques mois plus tôt, entretient artificiellement le sentiment de ne jamais être à la hauteur. Ce sentiment ne disparaît jamais par la seule progression, il faut changer le point de comparaison.",
        ],
      },
      {
        heading: "Reconstruire une légitimité basée sur des faits",
        paragraphs: [
          "Tenir un suivi concret (charges, séances réalisées, photos) donne une preuve tangible de la progression, indépendante du ressenti du jour. Relire ce suivi dans les moments de doute rappelle des faits que la mémoire ou l'humeur du moment déforme facilement.",
          "La légitimité ne se décrète pas d'un coup, elle se construit avec la régularité. Chaque séance honorée, même moyenne, est une preuve de plus, pas une exception qui ne compterait pas.",
        ],
      },
    ],
    conclusion:
      "Le doute sur sa légitimité touche autant les débutants que des pratiquants très avancés. Ce n'est pas un signe que tu n'as pas ta place, c'est un biais courant du cerveau qui se corrige avec des repères concrets, pas avec plus de performance.",
  },

  // ── Récupération (2) ─────────────────────────────────────────────────
  {
    slug: "checklist-mobilite-quotidienne",
    title: "10 minutes de mobilité à faire chaque jour",
    hook: "Une routine courte et simple pour garder des articulations qui bougent bien, sans y consacrer une séance entière.",
    category: "Récupération",
    format: "checklist",
    readTime: "3 min",
    icon: "PersonStanding",
    intro:
      "La mobilité n'a pas besoin d'être une séance à part entière pour avoir un vrai impact. Quelques minutes ciblées chaque jour suffisent à entretenir l'amplitude articulaire sur la durée.",
    groups: [
      {
        heading: "Hanches et bas du dos",
        items: [
          "Cercles de hanches, 10 répétitions de chaque côté",
          "Étirement du fléchisseur de hanche en fente, 30 secondes de chaque côté",
          "Rotation du bassin en position assise ou debout, quelques répétitions lentes",
        ],
      },
      {
        heading: "Épaules et haut du dos",
        items: [
          "Cercles de bras, lents et amples, 10 dans chaque sens",
          "Étirement des pectoraux dans l'encadrement d'une porte, 30 secondes",
          "Rotation externe des épaules avec une bande légère si disponible",
        ],
      },
      {
        heading: "Chevilles et genoux",
        items: [
          "Flexion de cheville contre un mur pour évaluer et améliorer l'amplitude",
          "Squat profond tenu quelques secondes, sans charge, juste pour maintenir l'amplitude",
        ],
      },
    ],
    conclusion:
      "10 minutes par jour suffisent largement à entretenir une bonne mobilité générale. La régularité compte bien plus que la durée d'une session isolée.",
  },
  {
    slug: "checklist-gestion-stress",
    title: "Gérer le stress qui sabote ta récupération",
    hook: "Le stress chronique impacte directement le sommeil, la récupération et la progression. Voici des leviers concrets pour le faire baisser.",
    category: "Récupération",
    format: "checklist",
    readTime: "4 min",
    icon: "HeartPulse",
    intro:
      "Le stress ne se limite pas à un ressenti désagréable, il a un impact mesurable sur le sommeil, la récupération musculaire et la gestion de l'appétit. Voici des leviers concrets, pas juste l'idée générale de se détendre.",
    groups: [
      {
        heading: "Leviers quotidiens rapides",
        items: [
          "5 à 10 minutes de respiration lente et profonde, particulièrement efficace le soir avant de dormir",
          "Une marche courte, idéalement en extérieur, pour couper avec les écrans et l'activité mentale",
          "Réduire la caféine en fin de journée, elle amplifie souvent la sensation de tension nerveuse",
        ],
      },
      {
        heading: "Structurer la journée pour limiter l'accumulation",
        items: [
          "Identifier un créneau fixe, même court, entièrement dédié à une activité sans obligation ni écran",
          "Éviter d'enchaîner les notifications et sollicitations en continu, particulièrement en fin de journée",
          "Prioriser 3 tâches réellement importantes par jour plutôt qu'une liste interminable qui génère une pression constante",
        ],
      },
      {
        heading: "Signes que le stress commence à impacter l'entraînement",
        items: [
          "Sommeil qui se dégrade sans changement d'horaire particulier",
          "Motivation à l'entraînement en baisse sans raison physique identifiable",
          "Tension musculaire diffuse, notamment au niveau des épaules et de la mâchoire",
        ],
      },
    ],
    conclusion:
      "Le stress fait partie de la vie, l'objectif n'est pas de l'éliminer complètement mais d'éviter qu'il s'accumule sans limite. Quelques leviers simples, appliqués régulièrement, suffisent à en limiter l'impact sur la récupération.",
  },

  // ── Général (2) ──────────────────────────────────────────────────────
  {
    slug: "guide-red-flags-coach",
    title: "Les signaux qui doivent t'alerter chez un coach",
    hook: "Avant de t'engager avec un coach, voici les signaux concrets qui distinguent un accompagnement sérieux d'un accompagnement à éviter.",
    category: "Général",
    format: "guide",
    readTime: "5 min",
    icon: "MessageCircleWarning",
    intro:
      "Le coaching sportif n'est pas un métier réglementé de façon uniforme, ce qui laisse la porte ouverte à des pratiques très inégales. Voici les signaux concrets à surveiller avant de t'engager, et pendant l'accompagnement.",
    sections: [
      {
        heading: "Avant de t'engager",
        paragraphs: [
          "Un coach sérieux te pose des questions précises sur ton historique, tes objectifs, tes contraintes et ta santé avant de proposer quoi que ce soit. Une proposition de programme générique envoyée sans aucune vraie prise d'information est un signal clair de manque de sérieux.",
          "Méfie toi des promesses de résultats chiffrés et rapides garantis (perte de X kilos en X semaines) : la réponse individuelle varie trop pour qu'une telle promesse soit honnête.",
        ],
      },
      {
        heading: "Pendant l'accompagnement",
        paragraphs: [
          "Un suivi sérieux inclut des ajustements réguliers du programme et de la nutrition selon ta progression réelle, pas un plan figé envoyé une fois puis jamais retouché. L'absence totale de retour ou de disponibilité pour répondre à tes questions sur plusieurs semaines est un signal d'alerte.",
          "Un coach qui pousse systématiquement vers des compléments ou produits qu'il vend lui même, au delà de ce qui est réellement nécessaire, mélange son intérêt commercial avec ton intérêt réel. Ce n'est pas automatiquement malhonnête, mais ça mérite d'être questionné.",
        ],
      },
      {
        heading: "Sur la posture générale",
        paragraphs: [
          "Un coach compétent reconnaît les limites de ce qu'il peut affirmer, notamment sur les sujets médicaux, et t'oriente vers un professionnel de santé quand c'est nécessaire plutôt que de tout vouloir gérer lui même. À l'inverse, quelqu'un qui prétend avoir réponse à tout, y compris sur des sujets médicaux qui dépassent son rôle, est un signal à prendre au sérieux.",
        ],
      },
    ],
    conclusion:
      "Un bon accompagnement se reconnaît à la qualité du questionnement initial, à la régularité du suivi et à l'honnêteté sur ce qui est réaliste. Ces critères comptent davantage que les promesses affichées ou le nombre d'abonnés sur les réseaux.",
  },
  {
    slug: "checklist-40-ans",
    title: "S'entraîner après 40 ans : ce qui change vraiment",
    hook: "Le corps ne réagit plus tout à fait pareil après 40 ans. Voici les ajustements concrets qui permettent de continuer à progresser sereinement.",
    category: "Général",
    format: "checklist",
    readTime: "4 min",
    icon: "Activity",
    intro:
      "S'entraîner après 40 ans ne veut pas dire ralentir ou abandonner la progression, mais ça demande quelques ajustements concrets pour rester efficace et éviter les blessures évitables.",
    groups: [
      {
        heading: "Sur l'échauffement et la récupération",
        items: [
          "Allonger légèrement le temps d'échauffement, les articulations et tendons ont besoin de plus de préparation",
          "Espacer un peu plus les séances très intenses sur un même groupe musculaire, la récupération est généralement plus lente",
          "Prioriser le sommeil encore plus qu'avant, c'est le levier de récupération le plus impactant à cet âge",
        ],
      },
      {
        heading: "Sur la structure d'entraînement",
        items: [
          "Garder une part de travail en force, la masse musculaire et la densité osseuse se maintiennent mieux avec du travail sous charge régulier",
          "Ne pas négliger le travail de mobilité et d'équilibre, souvent plus utile à long terme que l'ajout d'un exercice de plus",
          "Progresser les charges de façon plus graduelle, sans que ça veuille dire renoncer à progresser sur la durée",
        ],
      },
      {
        heading: "Sur le suivi médical",
        items: [
          "Un bilan de santé général reste une bonne base avant d'intensifier un programme, particulièrement en reprise après une longue pause",
          "Ne pas ignorer une douleur qui persiste au delà de quelques jours, la marge d'erreur est plus faible qu'à 20 ans",
        ],
      },
    ],
    conclusion:
      "Après 40 ans, la progression reste tout à fait possible et réelle. Elle demande simplement un peu plus d'attention à la récupération et à la régularité qu'à l'intensité brute.",
  },
  {
    slug: "guide-30-premiers-jours",
    title: "Tes 30 premiers jours de coaching : à quoi t'attendre",
    hook: "Le premier mois d'accompagnement pose les bases de tout ce qui suit. Voici ce qui se joue vraiment pendant cette période, et pourquoi certains résultats ne sont pas encore visibles.",
    category: "Général",
    format: "guide",
    readTime: "5 min",
    icon: "Home",
    intro:
      "Les 30 premiers jours d'un accompagnement génèrent souvent de l'impatience : on veut déjà voir des résultats visibles sur le physique. Voici ce qui se construit réellement pendant cette période, même quand ce n'est pas encore visible dans le miroir.",
    sections: [
      {
        heading: "Ce qui se joue vraiment ce premier mois",
        paragraphs: [
          "Le premier mois sert avant tout à installer des habitudes solides : régularité d'entraînement, structuration des repas, sommeil, suivi des données. Ce sont ces habitudes qui déterminent la vitesse de progression des mois suivants, bien plus que l'intensité du premier mois lui même.",
        ],
      },
      {
        heading: "Pourquoi les résultats visibles prennent du temps",
        paragraphs: [
          "Les changements de composition corporelle mesurables prennent généralement 4 à 8 semaines pour devenir clairement visibles, même avec un plan parfaitement suivi. Les premières semaines apportent surtout des changements internes (technique, force, énergie, digestion) qui ne se voient pas encore à l'œil nu.",
        ],
      },
      {
        heading: "Les signaux positifs à chercher, au delà du miroir",
        paragraphs: [
          "Charges qui montent régulièrement sur les mouvements de base, énergie plus stable sur la journée, sommeil qui s'améliore, sensation de contrôle sur l'alimentation qui augmente. Ces signaux précèdent presque toujours les changements visibles sur le physique, et sont plus fiables à court terme.",
        ],
      },
      {
        heading: "Ce qui peut légitimement ralentir ce premier mois",
        paragraphs: [
          "Une phase d'adaptation à un nouveau volume d'entraînement, un ajustement des calories qui prend quelques semaines à se stabiliser, ou simplement le temps d'apprentissage des nouveaux mouvements techniques. Rien d'anormal dans tout ça, c'est le prix normal d'un vrai changement durable plutôt que d'un résultat éphémère.",
        ],
      },
    ],
    conclusion:
      "Le premier mois construit les fondations, pas le résultat final. Rester régulier pendant cette période, même sans changement visible immédiat, est ce qui rend les mois suivants réellement efficaces.",
  },
  {
    slug: "quiz-salle-ou-maison",
    title: "Salle de sport ou entraînement à la maison : quel setup te correspond",
    hook: "Réponds à ces questions pour savoir quel environnement d'entraînement colle vraiment à ta situation et à ta personnalité, sans céder aux idées reçues.",
    category: "Général",
    format: "quiz",
    readTime: "3 min",
    icon: "Building2",
    intro:
      "Ni la salle ni la maison ne sont supérieures dans l'absolu, tout dépend de ta situation, de ton budget et de ce qui te maintient réellement régulier. Ce quiz t'aide à trancher selon tes propres critères.",
    questions: [
      {
        question: "Qu'est ce qui te motive le plus à rester régulier ?",
        options: [
          { label: "Un environnement dédié, où je sors de chez moi", resultKey: "salle" },
          { label: "Le confort et la flexibilité horaire totale", resultKey: "maison" },
          { label: "Un mix des deux selon les jours", resultKey: "hybride" },
        ],
      },
      {
        question: "Quel est ton budget matériel disponible pour t'équiper ?",
        options: [
          { label: "Peu ou pas de budget matériel, je préfère payer un abonnement", resultKey: "salle" },
          { label: "Un budget confortable pour investir progressivement dans du matériel", resultKey: "maison" },
          { label: "Un budget limité mais je suis prêt à investir un minimum", resultKey: "hybride" },
        ],
      },
      {
        question: "Quel type d'objectif principal poursuis tu ?",
        options: [
          { label: "Progression en force avec des charges lourdes et variées", resultKey: "salle" },
          { label: "Entretien général, silhouette, mobilité", resultKey: "maison" },
          { label: "Un peu des deux, ça dépend des périodes", resultKey: "hybride" },
        ],
      },
      {
        question: "Comment décrirais tu ton rapport à la présence d'autres personnes en t'entraînant ?",
        options: [
          { label: "Ça me motive et me pousse à me dépasser", resultKey: "salle" },
          { label: "Ça me met mal à l'aise ou me distrait", resultKey: "maison" },
          { label: "Neutre, ça ne change pas grand chose pour moi", resultKey: "hybride" },
        ],
      },
    ],
    outcomes: [
      {
        key: "salle",
        title: "La salle te correspond mieux",
        description:
          "L'accès à du matériel varié et lourd, l'environnement dédié et la stimulation de l'entourage sont des leviers de régularité forts pour toi. Un abonnement salle est probablement le meilleur investissement pour ta progression.",
      },
      {
        key: "maison",
        title: "L'entraînement à la maison te correspond mieux",
        description:
          "La flexibilité horaire et le confort priment pour toi. Un investissement progressif dans quelques équipements clés (bandes, haltères ajustables, banc) suffit largement à construire un programme complet à la maison.",
      },
      {
        key: "hybride",
        title: "Un format hybride te correspond le mieux",
        description:
          "Ni la salle seule ni la maison seule ne couvrent parfaitement tes besoins. Un abonnement flexible combiné à un minimum de matériel à la maison pour les jours contraints est probablement le setup le plus durable pour toi.",
      },
    ],
  },
];

export function getLeadMagnet(slug: string): LeadMagnet | undefined {
  return LEAD_MAGNETS.find((m) => m.slug === slug);
}

export function getLeadMagnetsByCategory(): Record<ResourceCategory, LeadMagnet[]> {
  const map = {} as Record<ResourceCategory, LeadMagnet[]>;
  for (const m of LEAD_MAGNETS) {
    if (!map[m.category]) map[m.category] = [];
    map[m.category].push(m);
  }
  return map;
}
