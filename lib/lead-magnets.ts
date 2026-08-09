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
