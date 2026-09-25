import type { Pole } from "@/components/ui/OrganisationView";

// 19 postes de l'organigramme, déplacés ici (2026-08-16) depuis
// app/dashboard/coach/admin/organisation/page.tsx pour être partagés avec
// la page publique de candidature (app/carrieres/page.tsx) sans dupliquer
// la définition, une seule source de vérité pour les postes et leur
// role_key stable (utilisé aussi par org_role_status et job_applications).
//
// Rémunération ajoutée le 2026-09-02 (retour direct : "dans carrière ya
// toujours pas les salaires affichés, corrige et mets les, mets vraiment
// ce que Matis Clouet a dit sur le recrutement"). Deux niveaux de fidélité
// au transcript (voir Notion 📚 Synthèse Webinaire Matis Clouet et
// TRANSCRIPT 4H LIVE SCALING 2E SOIRÉE) :
// 1. Setting/Closing et Coaching/CSM : chiffres CITÉS TEXTUELLEMENT par
//    Matis Clouet dans le transcript ("le closer, ça va de 8 à 10%",
//    "le setter, ça va de 4% [leads fournis] à 7% [prospection]",
//    "comment bien rémunérer un coach en CSM, ça va de 10 à 15% avec un
//    fixe", "le setting, je vous conseille pas de rémunérer en fixe, je
//    vous conseille vraiment au pourcentage"). Repris tels quels.
// 2. Tous les autres pôles (Marketing, Produit, Opérations) : Matis
//    Clouet ne donne aucun chiffre pour ces postes dans le transcript (son
//    intervention porte sur le scaling d'une activité de vente/coaching),
//    donc on applique le MÊME PRINCIPE qu'il pose en général (collaboration
//    indépendante, variable/prestation d'abord, fixe activé progressivement
//    une fois un vrai chiffre d'affaires récurrent en place) sans inventer
//    de pourcentage ou de montant précis qu'il n'a pas dit. Le seuil de CA
//    exact qui active un fixe reste à trancher par Emmanuel avec son
//    expert comptable (voir Notion 💰 Grille de rémunération), donc jamais
//    chiffré ici.
// Tous les postes sont des collaborations indépendantes (freelance/auto
// entrepreneur), pas des CDI — cohérent avec le statut légal actuel d'EP
// Coaching (micro-entreprise). Voir aussi `nonNegotiable`, la méthode
// "scorecard" de Matis Clouet : mission, résultats attendus, compétences
// non négociables posés AVANT de voir un premier candidat.
export const POLES: Pole[] = [
  {
    key: "coaching",
    name: "Coaching & Delivery",
    color: "#e08a4a",
    roles: [
      {
        key: "coach-sportif-nutrition",
        title: "Coach sportif & nutrition",
        mission: "Accompagne un portefeuille de clients au quotidien dans l'appli : programme, nutrition, bilans, messagerie.",
        levels: ["Junior", "Confirmé"],
        tasks: [
          "Construit et ajuste les programmes d'entraînement et plans nutritionnels",
          "Répond aux messages clients et corrige les bilans hebdomadaires",
          "Détecte les décrochages et relance avant qu'un client abandonne",
        ],
        reportsTo: "Head Coach",
        compensation: {
          variable: "10 à 15% du montant payé par chaque client suivi",
          fixed: "Un fixe s'active une fois le poste réellement intégré (seuil de chiffre d'affaires récurrent à définir)",
          earnings:
            "100 à 150 € par mois pour chaque tranche de 1 000 € d'abonnements que tu suis, en récurrent tant que tes clients restent. Un portefeuille qui encaisse 5 000 € par mois te rapporte 500 à 750 € par mois.",
        },
        nonNegotiable: [
          "Répond à un client sous 24h ouvrées, sans exception",
          "Sait justifier chaque décision de programme par une vraie raison, pas une habitude",
        ],
      },
      {
        key: "head-coach",
        title: "Head Coach",
        mission: "Garantit la qualité de coaching sur tout le portefeuille client et forme les nouveaux coachs.",
        levels: ["Lead"],
        tasks: [
          "Audite un échantillon de bilans/programmes chaque semaine",
          "Forme et évalue les nouveaux coachs pendant leur intégration",
          "Arbitre les cas clients difficiles (litiges, résiliations, urgences)",
        ],
        reportsTo: "Fondateur",
        compensation: {
          variable: "5% de supervision sur le chiffre d'affaires total du portefeuille coaching",
          fixed: "Fixe mensuel activé une fois un seuil de chiffre d'affaires récurrent atteint",
          earnings:
            "5 % du portefeuille coaching supervisé : 10 000 € encaissés dans le mois représentent 500 €, 25 000 € représentent 1 250 €, en plus du fixe une fois activé.",
        },
        nonNegotiable: [
          "A déjà coaché des clients en direct, pas seulement supervisé",
          "Sait dire non à un coach qui baisse le niveau, même si c'est inconfortable",
        ],
      },
      {
        key: "coach-onboarding-success",
        title: "Coach Onboarding / Success",
        mission: "Accompagne un nouveau client sur ses 30 premiers jours pour maximiser la rétention.",
        levels: ["Junior", "Confirmé"],
        tasks: [
          "Appel ou message de bienvenue, prise en main de l'appli",
          "Vérifie que le premier bilan et la première semaine sont bien faits",
          "Remonte les frictions produit à l'équipe Produit & Tech",
        ],
        reportsTo: "Head Coach",
        compensation: {
          variable: "Prime versée pour chaque client toujours actif à J+30 (rétention)",
          fixed: null,
          earnings: null,
        },
        nonNegotiable: [
          "Contacte tout nouveau client dans les 24h suivant sa signature",
          "Remonte une friction produit le jour même où elle est repérée",
        ],
      },
    ],
  },
  {
    key: "sales",
    name: "Sales",
    color: "#d4b23c",
    roles: [
      {
        key: "setter",
        title: "Setter",
        mission: "Qualifie les leads entrants (réseaux sociaux, formulaire, pub) et décroche des rendez-vous pour les closers.",
        levels: ["Junior", "Confirmé"],
        tasks: [
          "Répond aux DM/commentaires et qualifie l'intérêt réel du lead",
          "Prend rendez-vous dans l'agenda des closers, relance les no-show",
          "Tient le CRM à jour (source du lead, statut, notes)",
        ],
        reportsTo: "Head of Sales",
        compensation: {
          // Cité textuellement par Matis Clouet : "le setter, c'est 4%
          // d'une bonne [lead fourni] ou 7% dans une bonne [prospection]"
          // et "le setting, je vous conseille pas de rémunérer en fixe,
          // je vous conseille vraiment au pourcentage".
          variable: "4% du montant encaissé si le lead est fourni par EP Coaching, 7% s'il va chercher lui-même ses leads (prospection)",
          fixed: null,
          earnings:
            "40 € pour chaque tranche de 1 000 € encaissés sur les ventes issues de tes rendez-vous avec un lead fourni, 70 € si tu as trouvé le lead toi-même. 10 000 € encaissés dans le mois grâce à tes rendez-vous représentent 400 à 700 €.",
        },
        nonNegotiable: [
          "Qualifie un lead entrant en moins de 2h en journée",
          "Ne booke jamais un appel juste pour remplir l'agenda du closer",
        ],
      },
      {
        key: "closer",
        title: "Closer",
        mission: "Mène les appels de vente et signe les nouveaux clients coaching.",
        levels: ["Confirmé", "Lead"],
        tasks: [
          "Conduit l'appel découverte, traite les objections, conclut la vente",
          "Passe le relais proprement à l'équipe Coaching à la signature",
          "Suit son propre taux de conversion et panier moyen",
        ],
        reportsTo: "Head of Sales",
        compensation: {
          // Cité textuellement par Matis Clouet : "le closer, ça va de 8
          // à 10%" (commission pure sur le montant encaissé).
          variable: "8 à 10% du montant encaissé sur chaque vente conclue",
          fixed: null,
          earnings:
            "80 à 100 € pour chaque tranche de 1 000 € encaissés sur tes ventes. 10 000 € encaissés dans le mois représentent 800 à 1 000 €, 20 000 € représentent 1 600 à 2 000 €.",
        },
        nonNegotiable: [
          "Qualifie avant de persuader : ne pousse jamais une vente à quelqu'un qui n'est pas prêt",
          "Suit son propre taux de conversion sans qu'on ait à le lui demander",
        ],
      },
      {
        key: "head-of-sales",
        title: "Head of Sales",
        mission: "Pilote l'équipe commerciale : objectifs, scripts d'appel, recrutement des setters/closers.",
        levels: ["Lead"],
        tasks: [
          "Fixe et suit les objectifs mensuels de l'équipe sales",
          "Écrit et fait évoluer les scripts de vente et de qualification",
          "Reporting direct au fondateur sur le chiffre d'affaires signé",
        ],
        reportsTo: "Fondateur",
        compensation: {
          variable: "3% du chiffre d'affaires total généré par l'équipe sales",
          fixed: "Fixe mensuel activé une fois un seuil de chiffre d'affaires récurrent atteint",
          earnings:
            "3 % du chiffre d'affaires de toute l'équipe sales : 30 000 € encaissés dans le mois représentent 900 €, 60 000 € représentent 1 800 €, en plus du fixe une fois activé.",
        },
        nonNegotiable: [
          "A déjà closé des ventes lui-même, pas seulement managé une équipe",
          "Diagnostique le vrai goulot d'étranglement (offre, acquisition ou vente) avant d'agir",
        ],
      },
    ],
  },
  {
    key: "marketing",
    name: "Marketing & Contenu",
    color: "#7fbe68",
    roles: [
      {
        key: "createur-contenu-videaste",
        title: "Créateur de contenu / Vidéaste",
        mission: "Tourne et monte les formats courts (Reels/Shorts) et longs (YouTube) pour Instagram, YouTube, TikTok.",
        levels: ["Junior", "Confirmé"],
        tasks: [
          "Tourne sur le terrain (séances, coulisses, témoignages clients)",
          "Monte, sous-titre et exporte aux formats de chaque plateforme",
          "Puise dans l'onglet Idéation de l'appli pour ne jamais tourner à vide",
        ],
        reportsTo: "Head of Marketing",
        compensation: {
          variable: "Payé à la pièce, un forfait par vidéo montée et livrée",
          fixed: "Un fixe mensuel s'active si le volume devient régulier, une fois un seuil de chiffre d'affaires récurrent atteint",
          earnings: null,
        },
        nonNegotiable: [
          "Livre dans le délai annoncé, sans relance nécessaire",
          "Respecte l'identité visuelle de la marque sans qu'on ait à tout recadrer",
        ],
      },
      {
        key: "community-manager",
        title: "Community Manager",
        mission: "Publie, anime et modère la présence de la marque sur les réseaux sociaux au quotidien.",
        levels: ["Junior", "Confirmé"],
        tasks: [
          "Planifie et publie le calendrier de contenu multi-plateformes",
          "Répond aux commentaires et messages, remonte les questions chaudes",
          "Suit les statistiques d'engagement et ajuste le calendrier",
        ],
        reportsTo: "Head of Marketing",
        compensation: {
          variable: "Forfait mensuel proportionné au temps réel passé",
          fixed: "S'active une fois un seuil de chiffre d'affaires récurrent atteint",
          earnings: null,
        },
        nonNegotiable: [
          "Répond à un commentaire ou message public sous 4h en journée",
          "Remonte immédiatement une question chaude ou un signal de crise",
        ],
      },
      {
        key: "copywriter",
        title: "Copywriter",
        mission: "Écrit les textes qui vendent : emails, pages de vente, scripts publicitaires, légendes.",
        levels: ["Confirmé"],
        tasks: [
          "Rédige les séquences email (acquisition, relance, fidélisation)",
          "Écrit les pages de vente et scripts publicitaires",
          "Garde une voix de marque cohérente sur tous les supports",
        ],
        reportsTo: "Head of Marketing",
        compensation: {
          variable: "Payé à la pièce, un forfait par texte livré (email, page de vente, script)",
          fixed: "S'active une fois un seuil de chiffre d'affaires récurrent atteint",
          earnings: null,
        },
        nonNegotiable: [
          "Écrit dans la voix de la marque dès le premier jet, sans qu'on ait à tout réécrire",
          "Justifie chaque accroche par une vraie intention, pas un cliché marketing",
        ],
      },
      {
        key: "personal-brand-manager",
        title: "Personal Brand Manager",
        mission: "Gère et développe l'image publique du fondateur comme figure de la marque.",
        levels: ["Confirmé", "Lead"],
        tasks: [
          "Planifie les apparitions publiques, interviews, collaborations",
          "Coordonne le ton et le positionnement personnel avec la marque",
          "Protège et développe la réputation en ligne du fondateur",
        ],
        reportsTo: "Fondateur",
        compensation: {
          variable: "Forfait mensuel",
          fixed: "S'active une fois un seuil de chiffre d'affaires récurrent atteint",
          earnings: null,
        },
        nonNegotiable: [
          "Ne valide jamais une prise de parole publique sans relire l'alignement avec la marque",
          "Réagit sous 24h face à un enjeu de réputation",
        ],
      },
      {
        key: "growth-traffic-manager",
        title: "Growth / Traffic Manager",
        mission: "Pilote l'acquisition payante (Meta, Google, TikTok Ads) pour alimenter le pôle Sales en leads.",
        levels: ["Confirmé", "Lead"],
        tasks: [
          "Crée, lance et optimise les campagnes publicitaires",
          "Suit le coût d'acquisition et le retour sur investissement",
          "Teste de nouveaux formats et audiences en continu",
        ],
        reportsTo: "Head of Marketing",
        compensation: {
          variable: "Un pourcentage du retour généré par les campagnes (ROAS), aligné sur la performance",
          fixed: "S'active une fois un seuil de chiffre d'affaires récurrent atteint",
          earnings: null,
        },
        nonNegotiable: [
          "Suit un coût d'acquisition précis, pas une intuition",
          "Coupe une campagne qui ne performe pas plutôt que d'attendre",
        ],
      },
      {
        key: "head-of-marketing",
        title: "Head of Marketing (CMO)",
        mission: "Définit la stratégie de marque et d'acquisition, pilote toute l'équipe contenu & growth.",
        levels: ["Lead"],
        tasks: [
          "Fixe le calendrier éditorial et les priorités par plateforme",
          "Arbitre le budget publicitaire avec le Growth Manager",
          "Reporting direct au fondateur sur notoriété et acquisition",
        ],
        reportsTo: "Fondateur",
        compensation: {
          variable: "Un pourcentage de la croissance de chiffre d'affaires générée",
          fixed: "S'active une fois un seuil de chiffre d'affaires récurrent atteint",
          earnings: null,
        },
        nonNegotiable: [
          "Distingue explicitement contenu d'acquisition et contenu de conversion dans sa stratégie",
          "Diagnostique le vrai canal en panne avant de tout changer",
        ],
      },
    ],
  },
  {
    key: "produit",
    name: "Produit & Tech",
    color: "#5fc2d6",
    roles: [
      {
        key: "developpeur-saas",
        title: "Développeur SaaS",
        mission: "Construit et maintient l'application EP Coaching (web, notifications, intégrations).",
        levels: ["Confirmé", "Lead"],
        tasks: [
          "Développe les nouvelles fonctionnalités de la roadmap produit",
          "Corrige les bugs remontés par le support et les coachs",
          "Garde l'app rapide, fiable et sécurisée (données de santé)",
        ],
        reportsTo: "Product Manager",
        compensation: {
          variable: "TJM (taux journalier), logique de prestation classique, à définir selon la mission",
          fixed: null,
          earnings: null,
        },
        nonNegotiable: [
          "Ne livre jamais une fonctionnalité touchant des données de santé sans test réel",
          "Documente ce qu'il livre, pas juste le code",
        ],
      },
      {
        key: "product-manager",
        title: "Product Manager",
        mission: "Priorise la roadmap produit entre les retours coachs, clients et la vision du fondateur.",
        levels: ["Lead"],
        tasks: [
          "Collecte et arbitre les demandes d'évolution de l'app",
          "Rédige les spécifications des nouvelles fonctionnalités",
          "Suit les métriques d'usage pour prioriser objectivement",
        ],
        reportsTo: "Fondateur",
        compensation: {
          variable: null,
          fixed: "Forfait mensuel, activé une fois un seuil de chiffre d'affaires récurrent atteint",
          earnings: null,
        },
        nonNegotiable: [
          "Priorise avec des données d'usage réelles, pas la dernière demande reçue",
          "Rédige une spec qu'un développeur peut suivre sans revenir poser 10 questions",
        ],
      },
      {
        key: "support-client-tech",
        title: "Support client (Customer Success tech)",
        mission: "Aide les utilisateurs bloqués techniquement et fait le lien avec le développeur.",
        levels: ["Junior"],
        tasks: [
          "Répond aux tickets/messages techniques des clients et coachs",
          "Documente les bugs récurrents pour l'équipe produit",
          "Maintient une base de réponses aux questions fréquentes",
        ],
        reportsTo: "Product Manager",
        compensation: {
          variable: null,
          fixed: "Forfait mensuel, souvent à temps partiel, activé une fois un seuil de chiffre d'affaires récurrent atteint",
          earnings: null,
        },
        nonNegotiable: [
          "Répond à un ticket sous 24h ouvrées",
          "Sait dire je ne sais pas et remonter plutôt qu'inventer une réponse",
        ],
      },
    ],
  },
  {
    key: "operations",
    name: "Opérations",
    color: "#a69ae0",
    roles: [
      {
        key: "office-ops-manager",
        title: "Office / Ops Manager",
        mission: "Coordonne le quotidien de l'entreprise : outils, process, communication interne.",
        levels: ["Confirmé"],
        tasks: [
          "Maintient les outils internes et les accès de chaque pôle",
          "Fait vivre les process (onboarding, réunions, reporting)",
          "Coordonne entre les pôles quand un sujet dépasse une équipe",
        ],
        reportsTo: "Fondateur",
        compensation: {
          variable: null,
          fixed: "Forfait mensuel, activé une fois un seuil de chiffre d'affaires récurrent atteint",
          earnings: null,
        },
        nonNegotiable: [
          "Documente un process au lieu de le garder dans sa tête",
          "Alerte avant qu'un sujet devienne un problème, pas après",
        ],
      },
      {
        key: "secretaire-assistant",
        title: "Secrétaire / Assistant(e) administratif(ve)",
        mission: "Gère les tâches administratives du quotidien : courrier, prise de rendez-vous, classement, premier accueil.",
        levels: ["Junior"],
        tasks: [
          "Trie et répond aux emails/appels administratifs courants",
          "Organise l'agenda du fondateur et des responsables de pôle",
          "Classe et archive les documents (contrats, factures, courriers)",
        ],
        reportsTo: "Office / Ops Manager",
        compensation: {
          variable: null,
          fixed: "Forfait mensuel à temps partiel, activé une fois un seuil de chiffre d'affaires récurrent atteint",
          earnings: null,
        },
        nonNegotiable: [
          "Ne laisse jamais un email administratif sans réponse plus de 48h",
          "Classe un document le jour où il arrive, pas en fin de mois",
        ],
      },
      {
        key: "finance-comptabilite",
        title: "Finance / Comptabilité",
        mission: "Suit la facturation, la trésorerie et prépare les éléments pour l'expert-comptable.",
        levels: ["Confirmé"],
        tasks: [
          "Suit les paiements clients et les abonnements coachs",
          "Prépare les tableaux de bord financiers mensuels",
          "Fait le lien avec l'expert-comptable et l'avocat de l'entreprise",
        ],
        reportsTo: "Fondateur",
        compensation: {
          variable: null,
          fixed: "Forfait mensuel ou prestation ponctuelle, activé une fois un seuil de chiffre d'affaires récurrent atteint",
          earnings: null,
        },
        nonNegotiable: [
          "Signale un écart de trésorerie dès qu'il le voit, pas en fin de mois",
          "Ne communique jamais un chiffre qu'il n'a pas vérifié",
        ],
      },
      {
        key: "rh-people-ops",
        title: "RH / People Ops",
        mission: "Pilote le recrutement, l'intégration et le suivi administratif de l'équipe.",
        levels: ["Confirmé", "Lead"],
        tasks: [
          "Publie les offres et mène les entretiens de recrutement",
          "Organise le parcours d'intégration de chaque nouvelle recrue",
          "Prépare les dossiers contrats avec l'avocat en droit du travail",
        ],
        reportsTo: "Fondateur",
        compensation: {
          variable: null,
          fixed: "Forfait mensuel, activé une fois un seuil de chiffre d'affaires récurrent atteint",
          earnings: null,
        },
        nonNegotiable: [
          "Écrit une fiche de poste avec mission, résultats attendus et critères non négociables avant tout recrutement",
          "Ne fait jamais traîner une réponse à un candidat, positive ou négative",
        ],
      },
    ],
  },
];
