// Contenu du centre d'aide et de la visite d'accueil (2026-09-30).
// Fichier pur, sans accès serveur : importable partout. Textes simples,
// tutoiement, pas de tiret long.

export type HelpSpace = "coach" | "client" | "staff";

export interface TourStep {
  title: string;
  body: string;
  href?: string;
  cta?: string;
}

export interface Guide {
  id: string;
  title: string;
  for: HelpSpace[];
  steps: string[];
  href?: string;
  cta?: string;
}

export function tourFor(space: HelpSpace): TourStep[] {
  if (space === "staff") {
    return [
      { title: "Bienvenue dans ton espace", body: "Tout ce qu'il te faut pour ton poste, au même endroit : tes tâches, tes outils, tes documents et la messagerie de l'équipe." },
      { title: "Ta journée", body: "L'accueil te montre quoi faire en priorité, tes rendez-vous du jour et ce qui est en retard. Chaque matin, un briefing t'arrive aussi par email.", href: "/equipe", cta: "Voir" },
      { title: "Tes outils de poste", body: "Le menu est adapté à ton métier (prospects, rendez-vous, livrables, campagnes...). Chaque fiche se met à jour en un geste." },
      { title: "Messages et documents", body: "Échange avec ton responsable et l'équipe, retrouve ta fiche de poste, ton contrat et tes documents." },
      { title: "Ta formation", body: "Ton parcours de formation te guide pas à pas les premières semaines. Avance à ton rythme, tout est suivi." },
    ];
  }
  if (space === "coach") {
    return [
      { title: "Bienvenue sur EP Coaching", body: "Tout ton business de coach au même endroit : tes clients, ton contenu, tes ventes, ton équipe et ton propre suivi. Voici l'essentiel en 5 écrans." },
      { title: "Aujourd'hui", body: "Ton point de départ chaque matin : alertes clients, ta journée, tes messages non lus et tes raccourcis selon tes objectifs.", href: "/dashboard/coach", cta: "Voir" },
      { title: "Clients", body: "Chaque client avec ses bilans, son programme, sa nutrition et vos échanges. Les priorités te disent qui a besoin de toi en premier.", href: "/dashboard/coach/clients", cta: "Ouvrir" },
      { title: "Business", body: "Studio pour écrire et tourner tes contenus, stats réseaux, formations à vendre, appels de vente, équipe et pilotage.", href: "/dashboard/coach/studio", cta: "Ouvrir" },
      { title: "Moi et Plus", body: "Moi : ton propre suivi (bilan, nutrition, agenda, programme). Plus : notes, bibliothèque, communauté et réglages. Et la loupe trouve tout : tape « poids », « leads » ou le nom d'un client.", href: "/dashboard/coach/mon-appli", cta: "Personnaliser mon appli" },
    ];
  }
  return [
    { title: "Bienvenue sur EP Coaching", body: "Ton entraînement, ta nutrition, ton suivi et ton coach au même endroit. Voici l'essentiel en 5 écrans." },
    { title: "Aujourd'hui", body: "Ce que tu as à faire aujourd'hui : bilan, repas, séance. Coche au fur et à mesure.", href: "/dashboard/client", cta: "Voir" },
    { title: "Training", body: "Ton programme et ton logbook : lance ta séance, note tes charges, bats tes records.", href: "/dashboard/client/program", cta: "Ouvrir" },
    { title: "Suivi", body: "Ton bilan du jour en 30 secondes, ta nutrition, ta semaine, tes photos et ta progression.", href: "/dashboard/client/bilan", cta: "Ouvrir" },
    { title: "Coach et Plus", body: "Coach : tes messages et tes check-ins. Plus : notes, formations, communauté et réglages. La loupe trouve tout : tape « poids » ou « calories ».", href: "/dashboard/client/mon-appli", cta: "Personnaliser mon appli" },
  ];
}

export const GUIDES: Guide[] = [
  {
    id: "installer",
    title: "Installer l'appli sur ton téléphone",
    for: ["coach", "client"],
    steps: [
      "iPhone : ouvre le site dans Safari, touche le bouton Partager puis « Sur l'écran d'accueil ».",
      "Android : ouvre le site dans Chrome, menu en haut à droite puis « Installer l'application ».",
      "Ouvre ensuite EP Coaching depuis ton écran d'accueil, comme une appli classique.",
    ],
  },
  {
    id: "notifications",
    title: "Activer les notifications",
    for: ["coach", "client"],
    steps: [
      "Va dans Plus, puis Paramètres.",
      "Active les notifications et accepte la demande de ton téléphone.",
      "Règle tes heures de silence pour ne jamais être dérangé la nuit (les réveils sonnent quand même).",
    ],
    href: "parametres",
    cta: "Ouvrir les paramètres",
  },
  {
    id: "personnaliser",
    title: "Garder seulement ce qui te sert",
    for: ["coach", "client"],
    steps: [
      "Ouvre Mon appli (dans Plus).",
      "Réponds aux questions : ce que tu suis (poids, mensurations, sommeil...), ta façon de travailler si tu es coach.",
      "Le menu, ton bilan et ton accueil ne gardent que ce que tu as choisi. Tu peux changer à tout moment.",
    ],
    href: "mon-appli",
    cta: "Personnaliser",
  },
  {
    id: "recherche",
    title: "Trouver une info en 1 geste",
    for: ["coach", "client"],
    steps: [
      "Touche la loupe (en bas à droite, ou en haut de Plus).",
      "Tape un mot : « poids », « calories », « sommeil », « séances ». Côté coach aussi « clients », « bilans », « leads », « paie ».",
      "Le chiffre s'affiche tout de suite, touche-le pour ouvrir le détail.",
    ],
  },
  {
    id: "agenda",
    title: "Réorganiser ta journée en retard",
    for: ["coach", "client"],
    steps: [
      "Ouvre ton agenda et touche le bloc qui a sauté.",
      "Choisis « Commencer maintenant » ou décale de 15, 30 ou 60 minutes : toute la suite de la journée suit.",
      "« Aujourd'hui seulement » ne touche pas à ta semaine type. Le bouton en haut de la fiche t'emmène directement au bon endroit (repas, séance, scripts).",
    ],
    href: "agenda",
    cta: "Ouvrir l'agenda",
  },
  {
    id: "notes",
    title: "Tout noter et tout retrouver",
    for: ["coach", "client"],
    steps: [
      "Dans Notes, écris ou dicte ton idée, colle un lien ou ajoute une capture d'écran.",
      "Ajoute des #tags (#reel, #client, #idée) : les notes se rangent seules, et une note qui parle d'un tag existant le reçoit automatiquement.",
      "Relie deux notes avec [[Titre de la note]]. La recherche retrouve tout, même depuis la loupe.",
    ],
    href: "notes",
    cta: "Ouvrir mes notes",
  },
  {
    id: "claude-notion",
    title: "Relier Claude et Notion",
    for: ["coach", "client", "staff"],
    steps: [
      "Ouvre Plus, puis « Claude et Notion », et génère ton adresse de connecteur. Pas de clé d'API, pas de code.",
      "Sur claude.ai : Paramètres, Connecteurs, Ajouter un connecteur personnalisé, colle l'adresse. Ajoute aussi le connecteur Notion si tu l'utilises.",
      "Dans une conversation, active EP Coaching (et Notion), puis copie une des demandes toutes prêtes : noter ta journée, ajouter un repas en photo, analyser ta semaine, écrire tes scripts...",
    ],
    href: "claude",
    cta: "Ouvrir Claude et Notion",
  },
  {
    id: "bilan",
    title: "Remplir ton bilan du jour",
    for: ["client"],
    steps: [
      "Le matin : ton poids et ta nuit. Le soir : tes pas, ton ressenti et ta nutrition.",
      "Tes calories viennent toutes seules du tracker nutrition, pas besoin de les retaper.",
      "Tu as oublié un jour ? Choisis la date en haut du bilan pour le rattraper.",
    ],
    href: "bilan",
    cta: "Faire mon bilan",
  },
  {
    id: "stats-reseaux",
    title: "Suivre tes stats Instagram, TikTok, YouTube",
    for: ["coach"],
    steps: [
      "Dans Business, ouvre Mes stats réseaux.",
      "Chaque semaine, note tes chiffres (abonnés, vues, portée) : le bouton « Où trouver ces chiffres ? » t'indique où les lire dans chaque appli.",
      "Ajoute tes publications avec leurs chiffres et relie-les à ton script : l'appli te montre ce qui marche (format, jour, heure).",
    ],
    href: "stats-reseaux",
    cta: "Ouvrir mes stats",
  },
  {
    id: "formation",
    title: "Créer et vendre ta formation",
    for: ["coach"],
    steps: [
      "Dans Business, ouvre Mes formations puis « Nouvelle formation ».",
      "Ajoute tes sections et tes vidéos YouTube (même non répertoriées), puis publie.",
      "Choisis « Incluse pour mes clients » ou « Payante » avec ton lien de paiement. Après un achat, donne l'accès en un clic.",
    ],
    href: "formations",
    cta: "Mes formations",
  },
  {
    id: "equipe",
    title: "Recruter et payer ton équipe",
    for: ["coach"],
    steps: [
      "Dans Business, ouvre Mon équipe et choisis « Mon entreprise, avec une équipe ».",
      "Invite des coachs par email, ou donne un accès métier (setter, closer, monteur...) : chacun a un espace adapté.",
      "La paie du mois se calcule seule à partir des vraies ventes et livraisons. Règle la rémunération de chacun en un geste.",
    ],
    href: "mon-equipe",
    cta: "Mon équipe",
  },
  {
    id: "studio",
    title: "Écrire et tourner tes contenus",
    for: ["coach"],
    steps: [
      "Dans Studio, crée un script (la plateforme se choisit une fois pour toutes).",
      "Lance le prompteur : il enchaîne tes scripts prêts à tourner, du plus ancien au plus récent.",
      "Marque « J'ai tourné » puis « J'ai posté ». Relie la publication dans Mes stats réseaux pour voir ce qu'elle a donné.",
    ],
    href: "studio",
    cta: "Ouvrir le Studio",
  },
];
