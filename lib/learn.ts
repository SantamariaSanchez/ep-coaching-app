// Guides « Comprendre » (2026-10-08) : retour direct du fondateur, « je veux
// comprendre comment perdre du gras, comment ça marche ». Des explications
// courtes, concrètes, sans jargon et sans citer d'études, chacune finie par
// ce qu'on fait concrètement dans l'appli. Fichier pur.

export interface LearnStep {
  title: string;
  body: string;
  /** Intention à ouvrir pour passer à l'action (voir lib/intents.ts). */
  action?: { intent: string; label: string };
}

export interface LearnGuide {
  slug: string;
  title: string;
  intro: string;
  minutes: number;
  steps: LearnStep[];
}

export const LEARN_GUIDES: LearnGuide[] = [
  {
    slug: "perte-de-gras",
    title: "Comment on perd du gras",
    intro: "Tu n'as pas besoin de tout savoir. Il y a un principe, quatre leviers, et une façon de lire tes progrès. Le reste, c'est de la régularité.",
    minutes: 4,
    steps: [
      {
        title: "Le principe : manger un peu moins que ce que tu dépenses",
        body: "Ton corps puise dans ses réserves de gras quand il reçoit un peu moins d'énergie qu'il n'en utilise. Pas besoin de manger très peu : un écart modéré, tenu plusieurs semaines, marche bien mieux qu'un régime strict qu'on lâche au bout de dix jours. Aucun aliment ne fait maigrir ou grossir à lui seul, c'est le total de la journée qui compte.",
        action: { intent: "manger", label: "Voir quoi manger aujourd'hui" },
      },
      {
        title: "Levier 1 : les protéines à chaque repas",
        body: "Viande, poisson, œufs, skyr, fromage blanc, tofu, légumineuses. Les protéines calent, protègent ton muscle pendant que tu perds du gras, et t'évitent de grignoter. Repère simple : une portion de la taille de ta main à chaque repas.",
      },
      {
        title: "Levier 2 : bouger plus dans ta journée",
        body: "Les pas comptent énormément, souvent plus que le sport lui-même. Commence là où tu en es et ajoute environ 1 000 pas par jour chaque semaine, jusqu'à 7 000 à 10 000. Une marche après le repas, un appel en marchant, les escaliers : tout compte.",
        action: { intent: "pas", label: "Suivre mes pas" },
      },
      {
        title: "Levier 3 : la musculation, même légère",
        body: "Deux à trois séances par semaine suffisent. Le but n'est pas de devenir énorme : garder et construire du muscle, c'est ce qui donne une silhouette plus ferme quand le gras part, au lieu de juste « maigrir ».",
        action: { intent: "seance", label: "Voir ma séance" },
      },
      {
        title: "Levier 4 : le sommeil",
        body: "Mal dormir augmente la faim et l'envie de sucré le lendemain. Vise des horaires réguliers et 7 heures quand c'est possible. C'est souvent le levier le plus sous-estimé.",
      },
      {
        title: "Lire tes progrès sans paniquer",
        body: "Ton poids bouge de 1 à 2 kg d'un jour à l'autre à cause de l'eau, du sel et de la digestion : ce n'est pas du gras. Pèse-toi le matin, regarde la moyenne de la semaine, pas le chiffre du jour. Un bon rythme, c'est environ 0,5 à 1 % de ton poids par semaine. Ton tour de taille et tes photos montrent aussi ce que la balance ne voit pas.",
        action: { intent: "bilan", label: "Faire mon bilan du jour" },
      },
      {
        title: "Ta première semaine, concrètement",
        body: "Un bilan chaque matin (poids et sommeil, 30 secondes). Des protéines à chaque repas. Une marche de 20 minutes par jour. Deux séances simples. C'est tout. On ajuste ensuite avec tes vrais chiffres.",
        action: { intent: "agenda", label: "Placer tout ça dans mon agenda" },
      },
    ],
  },
  {
    slug: "prise-de-muscle",
    title: "Comment on prend du muscle",
    intro: "Le muscle se construit avec trois choses : un entraînement qui progresse, assez à manger, et assez de récupération. Voici comment les régler simplement.",
    minutes: 4,
    steps: [
      {
        title: "Progresser un peu à chaque séance",
        body: "Le muscle grossit quand tu lui demandes un peu plus que la fois d'avant : une répétition de plus, un peu plus de charge, une série mieux faite. Note tout dans le logbook, c'est ce qui te dit quoi viser la prochaine fois.",
        action: { intent: "seance", label: "Voir ma séance" },
      },
      {
        title: "S'arrêter près de l'échec, sans y aller à chaque fois",
        body: "Une série utile se termine quand il te reste 1 à 3 répétitions possibles. Si tu pouvais en faire 6 de plus, elle compte beaucoup moins. Le RIR que tu notes à chaque série sert exactement à ça.",
      },
      {
        title: "Assez de séries, pas trop",
        body: "Environ 10 à 20 séries par muscle et par semaine, réparties sur 2 séances, suffisent pour la plupart des gens. Plus n'est pas mieux si tu ne récupères pas.",
      },
      {
        title: "Manger un peu plus, avec des protéines",
        body: "Un léger surplus (un peu plus que ta dépense) et des protéines à chaque repas. Si ton poids ne bouge pas du tout en un mois, mange un peu plus. S'il monte très vite, tu prends surtout du gras : réduis légèrement.",
        action: { intent: "manger", label: "Voir quoi manger aujourd'hui" },
      },
      {
        title: "Dormir et être patient",
        body: "Le muscle se construit pendant la récupération. Compte en mois, pas en semaines : les photos tous les mois et tes charges dans le logbook montrent les vrais progrès.",
        action: { intent: "records", label: "Voir mes records" },
      },
    ],
  },
  {
    slug: "debuter-la-musculation",
    title: "Débuter la musculation sans se perdre",
    intro: "Tu n'as pas besoin d'un programme parfait ni de tout comprendre. Commence simple, sois régulier, et laisse l'appli te guider.",
    minutes: 3,
    steps: [
      {
        title: "Deux à trois séances par semaine",
        body: "Mieux vaut deux séances tenues toutes les semaines que cinq séances une semaine sur trois. Choisis des jours fixes et mets-les dans ton agenda.",
        action: { intent: "agenda", label: "Placer mes séances" },
      },
      {
        title: "Peu d'exercices, bien faits",
        body: "Quatre à six exercices par séance suffisent. Prends une charge que tu contrôles du début à la fin du mouvement. La technique d'abord, la charge ensuite.",
        action: { intent: "seance", label: "Voir ma séance" },
      },
      {
        title: "Noter pour progresser",
        body: "À chaque série, note la charge et les répétitions. La séance suivante, essaie de faire un tout petit peu mieux. C'est ça, progresser.",
      },
      {
        title: "Des courbatures, c'est normal au début",
        body: "Elles diminuent après les premières semaines. Une douleur vive dans une articulation, elle, n'est pas normale : arrête l'exercice et parles-en à ton coach.",
        action: { intent: "message_coach", label: "Écrire à mon coach" },
      },
      {
        title: "Le reste suit",
        body: "Mange des protéines à chaque repas, dors correctement, marche dans ta journée. Fais ton bilan le matin : en quelques semaines, tu verras clairement ce qui change.",
        action: { intent: "bilan", label: "Faire mon bilan du jour" },
      },
    ],
  },
];

export const LEARN_BY_SLUG = Object.fromEntries(LEARN_GUIDES.map((g) => [g.slug, g])) as Record<string, LearnGuide>;
