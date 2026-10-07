// Demandes toutes prêtes pour Claude (2026-10-07), par rôle. Elles
// s'appuient sur les outils du connecteur EP Coaching (lib/mcp-tools.ts et
// app/api/mcp/route.ts) : la personne n'a besoin que de son compte Claude,
// jamais d'une clé d'API ni de code. Fichier pur.

export type ClaudeRole = "coach" | "client" | "staff";

export interface PromptCard {
  title: string;
  hint: string;
  prompt: string;
}

export interface PromptGroup {
  title: string;
  cards: PromptCard[];
}

const EVERYONE: PromptGroup = {
  title: "Mon suivi au quotidien",
  cards: [
    {
      title: "Noter ma journée en une phrase",
      hint: "Dicte ou tape tes chiffres, Claude les range dans ton bilan du jour.",
      prompt: "Note dans EP Coaching pour aujourd'hui : 82,4 kg ce matin, 7 h 30 de sommeil, 9 000 pas, énergie 4 sur 5.",
    },
    {
      title: "Photo de mon assiette, ajoutée au journal",
      hint: "Envoie la photo à Claude avec cette demande.",
      prompt: "Je t'envoie la photo de mon assiette. Liste chaque aliment avec son poids estimé en grammes, montre-moi la liste et attends que je la valide ou la corrige. Ensuite ajoute-la à mon déjeuner dans EP Coaching avec l'outil ajouter_repas.",
    },
    {
      title: "Le point sur ma journée",
      hint: "Ce qui va bien et quoi ajuster ce soir.",
      prompt: "Regarde ma journée dans EP Coaching (outil ma_journee) et dis-moi en 5 lignes maximum ce qui va bien et ce que je peux ajuster d'ici ce soir (repas, pas, coucher). Sois concret et bienveillant.",
    },
    {
      title: "Analyser ma semaine",
      hint: "Poids, calories, sommeil, pas et séances en un coup d'œil.",
      prompt: "Récupère mes chiffres de la semaine dans EP Coaching (outil chiffres_de_la_semaine) et fais-moi un bilan simple : 3 points positifs, 1 point à améliorer, et 1 action précise pour la semaine prochaine.",
    },
    {
      title: "Mes records et mon prochain objectif",
      hint: "Course, Hyrox, force, CrossFit ou musculation.",
      prompt: "Regarde mes records dans EP Coaching (outil mes_records). Dis-moi où j'ai le plus progressé et propose-moi un objectif réaliste pour les 8 prochaines semaines, avec la façon de le suivre dans l'appli.",
    },
  ],
};

const NOTES: PromptGroup = {
  title: "Notes et Notion",
  cards: [
    {
      title: "Ranger une idée dans mes notes",
      hint: "Depuis n'importe quelle conversation.",
      prompt: "Range cette idée dans mes notes EP Coaching avec le tag #idée : ",
    },
    {
      title: "Importer une page Notion",
      hint: "Active Notion et EP Coaching dans la conversation.",
      prompt: "Lis ma page Notion « Idées de contenu » et importe chaque idée comme une note séparée dans EP Coaching, avec le tag #notion et le lien de la page source.",
    },
    {
      title: "Créer mon tableau de bord Notion",
      hint: "Une page Notion qui reprend tes chiffres EP Coaching.",
      prompt: "Avec EP Coaching, récupère mes chiffres de la semaine et mes records. Puis, avec Notion, crée une page « Mon suivi EP Coaching » avec un tableau de la semaine, mes records et 3 objectifs. Ajoute en bas une section « Semaine prochaine » vide que je remplirai.",
    },
  ],
};

const COACH: PromptGroup[] = [
  {
    title: "Mes clients",
    cards: [
      {
        title: "Qui a besoin de moi aujourd'hui ?",
        hint: "Les bilans en attente et les clients silencieux, triés par urgence.",
        prompt: "Avec EP Coaching (outil mes_clients), dis-moi quels clients ont besoin de moi aujourd'hui, triés par urgence : bilans en attente de ma réponse, clients sans bilan depuis longtemps. Pour chacun, propose un message court à leur envoyer.",
      },
      {
        title: "Préparer ma réponse à un bilan",
        hint: "Remplace le prénom par celui de ton client.",
        prompt: "Ouvre la fiche de Hugo dans EP Coaching (outil fiche_client) et prépare ma réponse à son dernier bilan hebdo : ce qui va bien, ce qu'on ajuste (nutrition, entraînement, pas), et une question pour la semaine. Ton direct et motivant, 120 mots maximum.",
      },
      {
        title: "Ma base clients dans Notion",
        hint: "Une base Notion à jour de tous tes clients.",
        prompt: "Récupère la liste de mes clients dans EP Coaching (outil mes_clients). Avec Notion, crée une base « Clients » avec une ligne par client : statut, dernier bilan, en attente de réponse ou non, dernier poids. Ajoute une vue « À traiter » filtrée sur les bilans en attente.",
      },
    ],
  },
  {
    title: "Mon contenu",
    cards: [
      {
        title: "Ce qui marche sur mes réseaux",
        hint: "Tes vraies stats, pas des généralités.",
        prompt: "Analyse mes stats réseaux des 30 derniers jours dans EP Coaching (outil mes_stats_reseaux). Compare mon top 5 et mon flop 5 : sujets, accroches, formats. Donne-moi 3 choses à refaire cette semaine et 1 chose à arrêter.",
      },
      {
        title: "Écrire 5 scripts dans mon Studio",
        hint: "À partir de ton positionnement et de tes stats.",
        prompt: "Lis mon positionnement (outil mon_positionnement) et mes stats réseaux (outil mes_stats_reseaux) dans EP Coaching. Écris 5 scripts de reels de 30 à 45 secondes pour mon avatar, avec ses mots exacts dans l'accroche. Montre-les-moi, puis quand je valide ajoute-les dans mon Studio (outil ajouter_script).",
      },
      {
        title: "Transformer une idée en script",
        hint: "Colle ton idée à la fin.",
        prompt: "Lis mon positionnement dans EP Coaching, puis transforme cette idée en script de reel de 40 secondes (accroche, développement, appel à l'action) et ajoute-le dans mon Studio : ",
      },
      {
        title: "Mes idées de la semaine",
        hint: "10 idées rangées directement dans ton Studio.",
        prompt: "À partir de mon positionnement et de mes piliers de contenu dans EP Coaching, propose 10 idées de contenu pour cette semaine (une phrase chacune). Quand je valide, ajoute-les dans mon Studio avec l'outil ajouter_idee_contenu.",
      },
    ],
  },
  {
    title: "Mon positionnement",
    cards: [
      {
        title: "Construire ma niche et mon avatar avec Claude",
        hint: "Claude te pose les questions une par une et enregistre tout dans l'appli.",
        prompt: "Aide-moi à construire mon positionnement de coach. Pose-moi les questions une par une : qui j'aide, le résultat que je promets et en combien de temps, ma méthode, mon client idéal (situation, douleurs, désirs, objections, ses mots exacts), mon offre et ma différence. À la fin, résume tout et enregistre-le dans EP Coaching avec l'outil enregistrer_positionnement.",
      },
      {
        title: "Ma page Notion de positionnement",
        hint: "Comme le Notion du fondateur, avec tes infos.",
        prompt: "Lis mon positionnement dans EP Coaching (outil mon_positionnement). Avec Notion, crée une page « Mon positionnement » : phrase de positionnement, avatar détaillé, une réponse à chaque objection, 10 idées de contenu par pilier avec les mots de mon avatar, et ma bio pour Instagram, TikTok et LinkedIn.",
      },
    ],
  },
];

const STAFF: PromptGroup = {
  title: "Mon poste",
  cards: [
    {
      title: "Résumer ma semaine",
      hint: "Tes chiffres et ce qui reste à faire.",
      prompt: "Récupère mes chiffres de la semaine dans EP Coaching (outil chiffres_de_la_semaine) et mes notes récentes (outil notes_recentes). Fais-moi un résumé de ma semaine et une liste des 3 priorités pour la semaine prochaine.",
    },
    {
      title: "Compte rendu de réunion dans mes notes",
      hint: "Colle tes notes en vrac à la fin.",
      prompt: "Transforme ces notes en compte rendu clair (décisions, actions, qui fait quoi, échéances) et range-le dans mes notes EP Coaching avec le tag #réunion : ",
    },
  ],
};

export function promptGroupsFor(role: ClaudeRole): PromptGroup[] {
  if (role === "coach") return [...COACH, EVERYONE, NOTES];
  if (role === "staff") return [STAFF, NOTES];
  return [EVERYONE, NOTES];
}
