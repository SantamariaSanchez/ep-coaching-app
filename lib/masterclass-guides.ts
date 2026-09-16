// Masterclass business, côté coach (demande directe du fondateur,
// 2026-09-16) : des tutoriels texte complets de A à Z sur un outil/système
// business, avec de VRAIES étapes concrètes à suivre, pour qu'à la fin le
// coach ait un RÉSULTAT RÉEL produit (pas juste avoir lu). Citation exacte :
// "je veux vraiment que tu prennes l'idée de base et tu la simplifies, parce
// que même un enfant de 5 ans peut la comprendre".
//
// Contenu STATIQUE, même logique que lib/content-library.ts et
// lib/coach-document-templates.ts : partagé par tous les coachs, édité
// uniquement dans le code, pas de table ni de CRUD par coach pour le
// contenu lui-même. Seule la progression (case cochée par étape) vit en
// base, par coach (voir lib/coach-masterclass-progress.ts et la migration
// 20260916d_masterclass_progress.sql).

/**
 * Un bloc de contenu à l'intérieur d'une étape. Format volontairement
 * simple (pas de markdown, pas de dépendance de rendu) : chaque type de
 * bloc a un rendu JSX dédié et fixe dans MasterclassSpace.tsx.
 */
export type MasterclassBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string }
  | { type: "list"; items: string[]; ordered?: boolean }
  | { type: "example"; text: string }
  | { type: "warning"; text: string };

export interface MasterclassStep {
  title: string;
  blocks: MasterclassBlock[];
  /** Ce que le coach doit avoir produit/en main à la fin de cette étape. */
  deliverables?: string[];
}

export type MasterclassCategory = "outils" | "contenu" | "business";

export const MASTERCLASS_CATEGORY_LABELS: Record<MasterclassCategory, string> = {
  outils: "Outils",
  contenu: "Contenu",
  business: "Business",
};

export interface MasterclassGuide {
  slug: string;
  title: string;
  category: MasterclassCategory;
  estimatedMinutes: number;
  summary: string;
  /** Le résultat concret et réel obtenu à la fin du guide, pas "avoir lu". */
  finalOutcome: string;
  steps: MasterclassStep[];
}

export const MASTERCLASS_GUIDES: MasterclassGuide[] = [
  // ── Guide 1 : Notion ──────────────────────────────────────────────────
  {
    slug: "notion-systeme-coach",
    title: "Notion pour un coach en ligne, de zéro à un système qui tourne seul",
    category: "outils",
    estimatedMinutes: 90,
    summary:
      "Construis un Notion qui tourne réellement chaque semaine : ton positionnement, tes piliers de contenu et un suivi hebdomadaire, connecté à Claude pour ne plus jamais tout retaper.",
    finalOutcome:
      "Un Notion Business rempli pour TA propre activité (positionnement, piliers, suivi hebdo) et le connecteur Notion actif dans ton compte Claude.",
    steps: [
      {
        title: "Pourquoi Notion plutôt qu'un tableur ou des notes éparpillées",
        blocks: [
          {
            type: "paragraph",
            text:
              "Un tableur t'oblige à choisir tes colonnes avant même de savoir ce dont tu as besoin. Des notes éparpillées entre ton téléphone, un carnet et des mémos, tu ne les relis jamais. Notion fait les deux à la fois au même endroit : une page qui se lit comme un document pour réfléchir, et un tableau quand tu as besoin de suivre des chiffres, accessible aussi bien depuis ton téléphone que depuis un ordinateur.",
          },
          {
            type: "list",
            items: [
              "Gratuit pour un usage personnel ou une petite structure.",
              "Une seule appli pour ton positionnement, ton contenu et tes chiffres, plutôt que trois outils différents.",
              "Elle se connecte directement à Claude (dernière étape de ce guide), ce qu'un carnet ne fera jamais.",
            ],
          },
        ],
        deliverables: ["Un compte Notion créé (gratuit), si tu n'en as pas déjà un."],
      },
      {
        title: "Crée la page Business et ses 3 sous-pages",
        blocks: [
          {
            type: "paragraph",
            text:
              "Ouvre Notion. Dans la barre latérale gauche, clique sur + Nouvelle page. Nomme-la exactement Business (ajoute une icône si tu veux, par exemple un immeuble). C'est la page mère : tout le reste de ce guide vit dedans.",
          },
          {
            type: "list",
            ordered: true,
            items: [
              "Dans cette page Business, tape /page puis Entrée, trois fois, pour créer trois sous-pages vides.",
              "Renomme la première sous-page : Positionnement & client idéal.",
              "Renomme la deuxième sous-page : Stratégie de contenu par piliers.",
              "Renomme la troisième sous-page : Suivi hebdomadaire.",
            ],
          },
          {
            type: "paragraph",
            text:
              "Tu as maintenant le squelette complet. Les étapes suivantes remplissent chaque sous-page une par une : à la fin de ce guide, aucune des trois ne sera restée vide.",
          },
        ],
        deliverables: ["Une page Business avec exactement 3 sous-pages créées et nommées."],
      },
      {
        title: "Remplis Positionnement & client idéal",
        blocks: [
          {
            type: "heading",
            text:
              "Dans la sous-page Positionnement & client idéal, crée ces 4 titres (tape ## puis le texte pour un titre) et réponds en 2 à 4 phrases sous chacun :",
          },
          {
            type: "list",
            items: [
              "Qui j'aide (âge, situation, niveau : par exemple des hommes de 30 à 45 ans, sédentaires, qui reprennent le sport après un long arrêt).",
              "Le problème principal qu'ils vivent avant de me trouver (concret, pas vague : par exemple ils ont déjà essayé un programme trouvé sur internet et abandonné avant 6 semaines).",
              "Ce qu'ils veulent vraiment obtenir (le résultat final recherché, pas la méthode pour y arriver).",
              "Pourquoi moi et pas un autre coach (ta différence réelle et vécue, pas un slogan générique).",
            ],
          },
          {
            type: "example",
            text:
              "Qui j'aide : des hommes de 30 à 45 ans qui ont déjà fait du sport, ont arrêté depuis 3 à 10 ans, et n'osent plus se relancer seuls par peur de se blesser ou de perdre encore leur temps. Le problème principal : ils ont acheté un programme tout fait, jamais ajusté à leur vie réelle, et ont abandonné avant 2 mois faute de suivi.",
          },
        ],
        deliverables: [
          "La sous-page Positionnement & client idéal remplie avec TES réponses réelles, pas les exemples de ce guide.",
        ],
      },
      {
        title: "Trouve tes 3 à 5 piliers de contenu (méthode en 3 questions)",
        blocks: [
          {
            type: "paragraph",
            text:
              "Un pilier de contenu est un grand thème récurrent autour duquel tu peux créer indéfiniment sans jamais tourner en rond. Pour chaque idée de pilier candidate, pose-toi ces 3 questions :",
          },
          {
            type: "list",
            ordered: true,
            items: [
              "Est-ce que mon client idéal (étape précédente) se reconnaît dans ce thème ?",
              "Est-ce que je peux produire au moins 20 contenus différents sur ce thème sans me répéter ?",
              "Est-ce que ce thème me différencie (est-ce que 10 autres coachs de ma niche pourraient dire exactement la même chose) ?",
            ],
          },
          {
            type: "paragraph",
            text:
              "Si les 3 réponses sont oui, le pilier est valide. Vise 3 à 5 piliers, pas plus : au-delà, ton contenu perd en identité et se dilue.",
          },
          {
            type: "example",
            text:
              "Pour un coach musculation/nutrition : Pilier 1, démonter les mythes du fitness. Pilier 2, la technique des mouvements de base. Pilier 3, la nutrition sans complexité (sans comptage au gramme). Pilier 4, des histoires réelles de clients, anonymisées. Pilier 5, les coulisses du métier de coach.",
          },
        ],
        deliverables: ["Une liste de 3 à 5 piliers de contenu qui passent les 3 questions, propres à TA niche."],
      },
      {
        title: "Construis la sous-page Stratégie de contenu par piliers",
        blocks: [
          {
            type: "paragraph",
            text:
              "Ouvre la sous-page Stratégie de contenu par piliers. Tape /table puis Entrée pour créer un tableau (vue Tableau).",
          },
          {
            type: "list",
            items: [
              "Colonne 1 : Pilier (texte).",
              "Colonne 2 : Idée de contenu (texte).",
              "Colonne 3 : Format (menu déroulant : Reel, Carrousel, Story, Post, Vidéo longue).",
              "Colonne 4 : Statut (menu déroulant : À faire, En cours, Publié).",
            ],
          },
          {
            type: "paragraph",
            text:
              "Ajoute une ligne par pilier trouvé à l'étape précédente, avec au moins 3 idées de contenu déjà notées par pilier. Ce tableau devient ta réserve d'idées : tu n'as plus jamais la page blanche le jour où tu dois publier.",
          },
        ],
        deliverables: [
          "Un tableau avec au moins 3 idées de contenu notées pour CHACUN de tes piliers (donc 9 à 15 lignes minimum).",
        ],
      },
      {
        title: "Mets en place le rituel hebdomadaire de suivi",
        blocks: [
          {
            type: "paragraph",
            text:
              "Ouvre la sous-page Suivi hebdomadaire. Choisis un jour fixe dans ta semaine (par exemple tous les vendredis, 15 à 20 minutes en fin de journée) et bloque-le dans ton agenda comme un rendez-vous que tu ne rates pas.",
          },
          {
            type: "paragraph",
            text: "Crée un tableau (/table) avec exactement ces colonnes :",
          },
          {
            type: "list",
            items: [
              "Semaine du (date).",
              "Contenus publiés (nombre).",
              "Meilleur contenu de la semaine (lien ou titre).",
              "Métrique clé 1 selon ta plateforme principale (par exemple vues moyennes, followers gagnés).",
              "Métrique clé 2 (par exemple messages/DM reçus, clics sur le lien en bio).",
              "1 ajustement pour la semaine prochaine (texte libre).",
            ],
          },
          {
            type: "paragraph",
            text:
              "Chaque semaine, à ton jour fixe : remplis une nouvelle ligne avec les vrais chiffres (copiés depuis les statistiques Instagram/YouTube/TikTok), regarde ce qui a le mieux marché, et note UN seul ajustement concret à tester la semaine suivante. Un seul, pas dix, sinon rien ne se teste vraiment.",
          },
        ],
        deliverables: [
          "Le tableau de suivi créé avec ses 6 colonnes.",
          "Une première ligne remplie avec de vrais chiffres de ta semaine en cours.",
        ],
      },
      {
        title: "Connecte ce Notion à Claude",
        blocks: [
          {
            type: "paragraph",
            text:
              "Va sur claude.ai et connecte-toi à ton compte. Ouvre le menu Connecteurs (souvent accessible depuis les paramètres du compte ou le menu principal).",
          },
          {
            type: "list",
            ordered: true,
            items: [
              "Clique sur Connecteurs.",
              "Cherche Notion dans la liste des connecteurs disponibles.",
              "Clique sur Connecter (ou Ajouter) : une fenêtre Notion s'ouvre pour te demander d'autoriser l'accès.",
              "Choisis ta page Business (et ses sous-pages) dans la liste des pages à partager, puis valide.",
              "Reviens sur claude.ai : dans une nouvelle conversation, Claude peut désormais lire le contenu de ce Notion quand tu le lui demandes.",
            ],
          },
          {
            type: "paragraph",
            text:
              "À partir de maintenant, plus besoin de recopier ton positionnement ou tes piliers à chaque conversation : dis à Claude \"regarde mon Notion Business\" et il a directement le contexte.",
          },
        ],
        deliverables: [
          "Le connecteur Notion actif et visible dans les paramètres de ton compte Claude.",
          "Un Notion Business avec ses 3 sous-pages remplies pour TA propre activité.",
        ],
      },
    ],
  },

  // ── Guide 2 : Stripe ──────────────────────────────────────────────────
  {
    slug: "stripe-paiement-coach",
    title: "Stripe pour un coach : du produit au paiement en un clic, avec les bons documents",
    category: "business",
    estimatedMinutes: 60,
    summary:
      "Configure un produit sur Stripe, génère un lien de paiement utilisable en un clic, active les reçus automatiques, et pars avec une structure de CGV/contrat à faire relire.",
    finalOutcome:
      "Un produit Stripe actif, un lien de paiement en un clic testé, et un premier jet de CGV/contrat prêt à envoyer à un professionnel du droit pour relecture.",
    steps: [
      {
        title: "Crée ton compte Stripe",
        blocks: [
          {
            type: "paragraph",
            text:
              "Va sur stripe.com et clique sur Créer un compte (ou S'inscrire). Renseigne ton email, un mot de passe, et ton pays.",
          },
          {
            type: "paragraph",
            text:
              "Une fois le compte créé, Stripe demande de compléter ton profil d'activité avant de pouvoir encaisser de vrais paiements. Dans les paramètres du compte, section informations sur l'entreprise (parfois appelée Activer les paiements), renseigne :",
          },
          {
            type: "list",
            items: [
              "Ton statut juridique (auto-entrepreneur, société...).",
              "Ton numéro SIRET/SIREN si tu es en France (visible sur ton avis de situation INSEE ou ton extrait Urssaf).",
              "Tes coordonnées bancaires (IBAN) pour recevoir les versements.",
              "Ton adresse et un numéro de téléphone de contact.",
            ],
          },
          {
            type: "warning",
            text:
              "Ceci reste générique et n'est pas un conseil fiscal. Pour le régime exact adapté à ton statut, vérifie auprès de l'Urssaf ou d'un expert-comptable.",
          },
        ],
        deliverables: ["Un compte Stripe créé avec les informations d'activité complétées."],
      },
      {
        title: "Crée ton produit ou service dans Stripe",
        blocks: [
          {
            type: "paragraph",
            text:
              "Dans le tableau de bord Stripe, va dans Catalogue de produits (menu de gauche), puis clique sur + Ajouter un produit.",
          },
          {
            type: "list",
            ordered: true,
            items: [
              "Nom du produit : le nom exact de ton offre (par exemple Coaching en ligne 3 mois).",
              "Description : 1 à 2 phrases sur ce que ça inclut.",
              "Prix : indique le montant.",
              "Juste sous le prix, choisis le type de tarification : Paiement unique (le client paie une fois) ou Récurrent (le client est débité automatiquement à chaque échéance).",
              "Si récurrent, choisis la fréquence de facturation (mensuelle, hebdomadaire...).",
              "Clique sur Enregistrer le produit.",
            ],
          },
          {
            type: "paragraph",
            text:
              "Différence à bien comprendre : un paiement unique s'arrête après le premier encaissement (tu factures à nouveau manuellement si besoin), un abonnement récurrent débite automatiquement à chaque échéance jusqu'à annulation.",
          },
        ],
        deliverables: ["Un produit créé dans Stripe avec un prix et un type de tarification choisi."],
      },
      {
        title: "Génère ton lien de paiement en un clic",
        blocks: [
          {
            type: "paragraph",
            text:
              "Toujours dans Stripe, va dans Liens de paiement (Payment Links) dans le menu de gauche, puis clique sur + Nouveau.",
          },
          {
            type: "list",
            ordered: true,
            items: [
              "Sélectionne le produit créé à l'étape précédente.",
              "Vérifie le prix affiché.",
              "Dans les options (facultatif), tu peux activer la collecte d'adresse, un message de remerciement personnalisé, ou une redirection après paiement.",
              "Clique sur Créer le lien.",
              "Stripe te donne une URL (par exemple buy.stripe.com/xxxxx) : copie-la.",
            ],
          },
          {
            type: "paragraph",
            text:
              "Ce lien fonctionne partout : en bio Instagram/TikTok, envoyé en message privé, collé dans un email. Le client clique, paie sa carte, et c'est encaissé sans rien de plus à faire de ton côté.",
          },
        ],
        deliverables: [
          "Un lien de paiement créé et copié.",
          "Le lien testé une fois toi-même (mode test Stripe, ou un vrai centime symbolique pour vérifier l'affichage).",
        ],
      },
      {
        title: "Active la facturation automatique",
        blocks: [
          {
            type: "paragraph",
            text:
              "Dans les paramètres Stripe, va dans Paramètres puis la section Facturation client (ou Reçus, selon la version de l'interface).",
          },
          {
            type: "list",
            items: [
              "Active l'option qui envoie automatiquement un reçu par email après chaque paiement réussi.",
              "Si tu vends un abonnement récurrent, active aussi l'email d'avertissement avant chaque renouvellement, pour que ton client ne soit jamais surpris par un débit.",
            ],
          },
          {
            type: "paragraph",
            text:
              "Une fois activé, chaque client reçoit automatiquement une preuve de paiement par email sans que tu aies à l'envoyer toi-même.",
          },
        ],
        deliverables: ["La facturation automatique activée et vérifiée avec un paiement test."],
      },
      {
        title: "CGV/CGU et structure de ton contrat",
        blocks: [
          {
            type: "warning",
            text:
              "AVERTISSEMENT IMPORTANT : ce qui suit est une structure, la liste des bonnes sections à inclure avec des phrases types à adapter. Ce n'est PAS un conseil juridique. Ce document ne doit JAMAIS être utilisé tel quel avec un vrai client payant sans avoir été relu et validé par un professionnel du droit avant tout usage commercial réel.",
          },
          {
            type: "heading",
            text: "Section 1, Objet du service",
          },
          {
            type: "paragraph",
            text:
              "Ce que le service inclut précisément et ce qu'il exclut explicitement. Phrase type : \"Le Coach s'engage à fournir au Client un programme personnalisé et un suivi selon les modalités décrites au présent contrat. Le présent contrat ne constitue pas un avis médical.\"",
          },
          {
            type: "heading",
            text: "Section 2, Prix et modalités de paiement",
          },
          {
            type: "paragraph",
            text:
              "Montant, devise, moyen de paiement, et ce qui se passe en cas d'impayé. Phrase type : \"Le prix de la prestation est de [montant] euros, payable en une fois ou mensuellement via Stripe. Tout défaut de paiement peut entraîner la suspension du service après relance.\"",
          },
          {
            type: "heading",
            text: "Section 3, Durée, renouvellement, résiliation",
          },
          {
            type: "paragraph",
            text:
              "Durée de l'engagement, reconduction automatique ou non, préavis de résiliation. Phrase type : \"Le présent contrat est conclu pour une durée de [X mois]. Il se renouvelle automatiquement sauf résiliation notifiée [X jours] avant l'échéance.\"",
          },
          {
            type: "heading",
            text: "Section 4, Obligations du Coach",
          },
          {
            type: "paragraph",
            text:
              "Ce que tu t'engages à fournir concrètement. Phrase type : \"Le Coach s'engage à répondre aux messages du Client dans un délai de [X heures ou jours] et à ajuster le programme selon les retours transmis.\"",
          },
          {
            type: "heading",
            text: "Section 5, Limites de responsabilité",
          },
          {
            type: "paragraph",
            text:
              "La clause la plus importante pour ce métier. Phrase type : \"Le Coach n'est pas médecin et le service fourni ne remplace en aucun cas un avis médical. Le Client déclare ne pas avoir de contre-indication à la pratique d'une activité physique, ou avoir obtenu l'accord de son médecin.\"",
          },
          {
            type: "heading",
            text: "Section 6, Propriété intellectuelle",
          },
          {
            type: "paragraph",
            text:
              "Qui possède les programmes et contenus fournis, et ce que le client peut en faire. Phrase type : \"Les programmes, documents et contenus fournis restent la propriété exclusive du Coach et sont destinés au seul usage personnel du Client, toute reproduction ou revente est interdite.\"",
          },
          {
            type: "heading",
            text: "Section 7, Droit applicable",
          },
          {
            type: "paragraph",
            text:
              "Quel droit s'applique en cas de litige. Phrase type : \"Le présent contrat est soumis au droit français. En cas de litige, une solution amiable sera recherchée avant toute action judiciaire.\"",
          },
          {
            type: "heading",
            text: "Section 8, Droit de rétractation (si applicable)",
          },
          {
            type: "paragraph",
            text:
              "Pour une vente à distance à un particulier, un délai de rétractation de 14 jours existe par défaut en droit français, sauf exécution immédiate demandée par le client. Phrase type : \"Le Client dispose d'un délai de 14 jours pour se rétracter, sauf s'il demande expressément le démarrage immédiat du service avant ce délai.\" Ce point précis doit être vérifié avec un professionnel, les règles varient selon le type de vente.",
          },
        ],
        deliverables: [
          "Un premier jet de CGV/contrat rédigé à partir de cette structure, rempli avec TES informations réelles.",
          "Ce premier jet marqué clairement comme à faire relire par un professionnel avant tout envoi à un client payant.",
        ],
      },
      {
        title: "Teste le tunnel complet",
        blocks: [
          {
            type: "paragraph",
            text:
              "Avant d'envoyer ton lien à un vrai prospect, vérifie tout le parcours toi-même de bout en bout :",
          },
          {
            type: "list",
            ordered: true,
            items: [
              "Clique sur ton propre lien de paiement depuis ton téléphone, pas seulement depuis un ordinateur.",
              "Vérifie que le prix, le nom du produit et la description affichés sont corrects.",
              "Fais un paiement réel avec un petit montant, ou active le mode test dans Stripe (bascule en haut du tableau de bord) pour simuler sans vrai encaissement.",
              "Vérifie que le reçu automatique arrive bien par email.",
              "Range ton lien de paiement dans un endroit facile à retrouver et à partager (bio, notes, ton Notion du Guide 1).",
            ],
          },
        ],
        deliverables: [
          "Un produit Stripe actif.",
          "Un lien de paiement en un clic testé de bout en bout.",
          "Un premier jet de CGV/contrat prêt à envoyer à un professionnel pour relecture.",
        ],
      },
    ],
  },

  // ── Guide 3 : Claude ──────────────────────────────────────────────────
  {
    slug: "claude-business-coach",
    title: "Construire ton Claude pour ton business de coaching",
    category: "outils",
    estimatedMinutes: 50,
    summary:
      "Configure ton propre compte Claude (externe à l'appli), connecte-le au Notion de ton business, écris de bons prompts de production de contenu, et sache exactement où coller le résultat.",
    finalOutcome:
      "Un compte Claude connecté à ton Notion, un premier contenu produit avec le template de prompt, collé avec succès dans un des espaces de l'appli.",
    steps: [
      {
        title: "Choisis ton compte claude.ai (gratuit ou Pro)",
        blocks: [
          {
            type: "paragraph",
            text:
              "Va sur claude.ai et crée un compte avec ton email. Le plan gratuit permet déjà de suivre tout ce guide.",
          },
          {
            type: "list",
            items: [
              "Gratuit : un nombre de messages limité qui se recharge après quelques heures, suffisant pour un usage ponctuel de quelques contenus par semaine.",
              "Pro (abonnement payant) : beaucoup plus de messages, utile si tu comptes produire du contenu presque tous les jours ou avoir de longues conversations avec beaucoup de contexte, comme un Notion connecté avec plusieurs pages.",
            ],
          },
          {
            type: "paragraph",
            text:
              "Recommandation honnête : commence en gratuit. Passe en Pro seulement si tu te retrouves régulièrement bloqué par la limite de messages avant d'avoir fini ta séance de production de contenu de la semaine, pas avant.",
          },
        ],
        deliverables: ["Un compte claude.ai créé, gratuit ou Pro selon ton usage réel."],
      },
      {
        title: "Connecte le Notion de ton business",
        blocks: [
          {
            type: "paragraph",
            text:
              "Si tu as suivi le guide Notion, reproduis la même connexion ici : sur claude.ai, ouvre Connecteurs dans le menu, cherche Notion, clique sur Connecter, autorise l'accès à ta page Business.",
          },
          {
            type: "paragraph",
            text:
              "Si tu n'as pas encore de Notion rempli, fais au moins le strict minimum (ton positionnement et client idéal) avant de continuer ce guide : sans ce contexte, Claude produit du contenu générique qui pourrait s'appliquer à n'importe quel coach.",
          },
        ],
        deliverables: ["Le connecteur Notion actif dans ton compte Claude, avec accès à ta page Business."],
      },
      {
        title: "Écris un bon prompt de production de contenu",
        blocks: [
          {
            type: "paragraph",
            text:
              "L'appli EP Coaching utilise déjà ce principe dans Studio créatif > Générateur (le composant SocialGenerator) : un bon prompt donne à Claude 4 informations précises, jamais une demande vague comme \"écris-moi un post\".",
          },
          {
            type: "list",
            ordered: true,
            items: [
              "Le sujet exact, pas un thème large (par exemple \"la créatine chez les débutants\", pas \"la nutrition\").",
              "L'angle : comment tu abordes le sujet (mythe/réalité, storytelling, liste, question directe...).",
              "La plateforme cible (Instagram, LinkedIn, YouTube...), chaque plateforme a ses codes, précise-le toujours.",
              "Les contraintes de marque à respecter : ton employé, et ce qu'il ne faut jamais faire.",
            ],
          },
          {
            type: "example",
            text:
              "Template à copier-coller et remplir : \"Regarde le contexte de mon business dans mon Notion connecté. Tu es le community manager de mon activité de coaching. Ton direct, concret, jamais de tiret dans le texte, jamais de superlatif vide. Écris-moi un [FORMAT, par exemple un script de Reel de 30 à 45 secondes] sur le sujet suivant : [SUJET]. Angle : [ANGLE, par exemple mythe/réalité, storytelling ou liste]. Plateforme cible : [PLATEFORME]. Termine par un appel à l'action clair.\"",
          },
          {
            type: "paragraph",
            text:
              "C'est exactement la logique déjà en place dans Studio créatif > Générateur : tu peux d'ailleurs y copier un prompt déjà prêt et l'adapter, ou repartir de zéro avec ce template.",
          },
        ],
        deliverables: ["Le template de prompt copié dans un endroit facile à réutiliser."],
      },
      {
        title: "Produis un premier contenu avec Claude",
        blocks: [
          {
            type: "paragraph",
            text:
              "Ouvre une nouvelle conversation sur claude.ai. Colle le template de l'étape précédente rempli avec un vrai sujet de ton activité, pas un exemple. Lis la réponse en entier.",
          },
          {
            type: "paragraph",
            text:
              "Si le résultat ne te convient pas (trop générique, ton pas assez direct, trop long), réponds directement dans la conversation pour préciser, par exemple \"Trop long, raccourcis à 30 secondes\" ou \"Plus direct, moins de politesse\". Claude ajuste sans qu'il faille tout recommencer depuis zéro.",
          },
        ],
        deliverables: ["Un premier contenu produit (script, post, description...) que tu juges utilisable ou presque."],
      },
      {
        title: "Sache où coller chaque résultat dans l'appli",
        blocks: [
          {
            type: "paragraph",
            text:
              "Chaque type de contenu produit par Claude a un endroit précis où l'utiliser dans EP Coaching, ne les mélange pas :",
          },
          {
            type: "list",
            items: [
              "Un script de vidéo (Reel, Short, YouTube) : colle-le dans Studio créatif > Mes scripts.",
              "Un email pour tes clients ou ta liste : colle-le dans Mailing.",
              "Une description de lead magnet ou de guide à télécharger : colle-la dans l'espace où tu gères tes guides (Ressources).",
              "Un post ou une légende pour les réseaux : garde-le dans Studio créatif > Générateur si tu veux le retravailler, ou publie-le directement sur la plateforme concernée.",
            ],
          },
          {
            type: "paragraph",
            text:
              "Le réflexe à prendre : Claude produit, l'appli range et sert de suivi. Ne laisse jamais un bon contenu produit par Claude perdu dans une conversation que tu ne retrouveras plus.",
          },
        ],
        deliverables: [
          "Le contenu produit à l'étape précédente collé avec succès dans l'espace correspondant de l'appli (Mes scripts, Mailing...).",
        ],
      },
      {
        title: "Claude Code, la version avancée (facultatif)",
        blocks: [
          {
            type: "paragraph",
            text:
              "Claude Code est une version de Claude capable d'exécuter des tâches complexes en autonomie directement sur un ordinateur : lire des fichiers, écrire du code, enchaîner plusieurs actions sans validation à chaque étape. C'est notamment l'outil utilisé pour construire cette application EP Coaching elle-même.",
          },
          {
            type: "paragraph",
            text:
              "Si tu es à l'aise avec la technique, tu peux t'en servir pour automatiser une partie de ta propre production, par exemple une routine programmée qui génère des idées de contenu chaque semaine. Ce n'est PAS nécessaire pour ce guide : les étapes précédentes avec claude.ai suffisent largement pour produire du contenu régulièrement.",
          },
        ],
        deliverables: ["Aucun livrable obligatoire, cette étape est informative."],
      },
      {
        title: "Récap et livrable final",
        blocks: [
          {
            type: "paragraph",
            text: "Relis la checklist suivante : si les 3 points sont vrais, ce guide est terminé pour toi.",
          },
          {
            type: "list",
            items: [
              "Un compte Claude actif, connecté à ton Notion.",
              "Un premier contenu produit avec le template de prompt.",
              "Ce contenu collé avec succès dans un des espaces de l'appli (Mes scripts, Mailing...).",
            ],
          },
        ],
        deliverables: ["Les 3 points de la checklist vérifiés pour TA propre activité."],
      },
    ],
  },
];

export function getMasterclassGuide(slug: string): MasterclassGuide | undefined {
  return MASTERCLASS_GUIDES.find((g) => g.slug === slug);
}
