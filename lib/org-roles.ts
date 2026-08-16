import type { Pole } from "@/components/ui/OrganisationView";

// 19 postes de l'organigramme, déplacés ici (2026-08-16) depuis
// app/dashboard/coach/admin/organisation/page.tsx pour être partagés avec
// la page publique de candidature (app/carrieres/page.tsx) sans dupliquer
// la définition, une seule source de vérité pour les postes et leur
// role_key stable (utilisé aussi par org_role_status et job_applications).
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
      },
    ],
  },
];

