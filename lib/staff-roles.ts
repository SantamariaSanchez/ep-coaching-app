// Configuration des espaces métier de l'équipe (app/equipe/*). Fichier pur,
// sans accès base : importable côté serveur comme côté navigateur.
//
// 18 métiers = les 19 postes de lib/org-roles.ts sauf "Coach sportif &
// nutrition", qui travaille déjà dans l'espace coach existant. Chaque métier
// assemble des briques communes (agenda, CRM, tâches, livrables...) stockées
// dans une seule table générique, staff_records (voir la migration
// 20260925_staff_roles.sql) : ajouter un métier ou un champ se fait ici, sans
// nouvelle table.

import { POLES } from "@/lib/org-roles";
import type { Pole } from "@/components/ui/OrganisationView";

export type RoleCard = Pole["roles"][number];

// ── Champs et étapes ────────────────────────────────────────────────────

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "money"
  | "date"
  | "datetime"
  | "select"
  | "url"
  | "phone"
  | "email";

/** Colonne dédiée de staff_records ; absent = rangé dans data (jsonb). */
export type FieldColumn = "title" | "amount" | "occurred_on" | "due_at";

export interface FieldOption {
  value: string;
  label: string;
}

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  column?: FieldColumn;
  options?: FieldOption[];
  required?: boolean;
  placeholder?: string;
  /** Affiché dans la ligne repliée, pas seulement dans le détail. */
  summary?: boolean;
}

export interface StageDef {
  value: string;
  label: string;
  color: string;
  /** Étape terminale : ne compte plus comme "en cours" ni "en retard". */
  closed?: boolean;
}

export const RECORD_KINDS = [
  "lead",
  "appointment",
  "task",
  "deliverable",
  "campaign",
  "ticket",
  "feature",
  "transaction",
  "candidate",
  "audit",
  "followup",
  "opportunity",
  "process",
  "report",
] as const;
export type RecordKind = (typeof RECORD_KINDS)[number];

export interface KindDef {
  kind: Exclude<RecordKind, "report">;
  singular: string;
  plural: string;
  addLabel: string;
  titleLabel: string;
  titlePlaceholder: string;
  stages: StageDef[];
  fields: FieldDef[];
  /** Ordre d'affichage : par échéance (agenda) ou par création. */
  sort: "due_asc" | "created_desc";
  emptyText: string;
}

const C = {
  grey: "rgba(245,237,237,0.45)",
  blue: "#60a5fa",
  violet: "#a78bfa",
  gold: "#facc15",
  orange: "#fb923c",
  green: "#4ade80",
  red: "#f87171",
};

const PLATFORM_OPTIONS: FieldOption[] = [
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "email", label: "Email" },
  { value: "site", label: "Site / appli" },
  { value: "autre", label: "Autre" },
];

const OFFER_OPTIONS: FieldOption[] = [
  { value: "coaching_physique", label: "Coaching individuel physique" },
  { value: "coaching_business", label: "Coaching business" },
  { value: "saas_standard", label: "SaaS Standard" },
  { value: "saas_premium", label: "SaaS Premium" },
  { value: "formation", label: "Formation" },
];

const PRIORITY_OPTIONS: FieldOption[] = [
  { value: "haute", label: "Haute" },
  { value: "normale", label: "Normale" },
  { value: "basse", label: "Basse" },
];

const NOTES: FieldDef = { key: "notes", label: "Notes", type: "textarea" };

export const KINDS: Record<Exclude<RecordKind, "report">, KindDef> = {
  lead: {
    kind: "lead",
    singular: "Prospect",
    plural: "Prospects",
    addLabel: "Ajouter un prospect",
    titleLabel: "Nom du prospect",
    titlePlaceholder: "Prénom Nom",
    sort: "created_desc",
    emptyText: "Aucun prospect pour l'instant. Ajoute le premier lead que tu traites.",
    stages: [
      { value: "nouveau", label: "Nouveau", color: C.grey },
      { value: "contacte", label: "Contacté", color: C.blue },
      { value: "qualifie", label: "Qualifié", color: C.violet },
      { value: "rdv_booke", label: "RDV booké", color: C.gold },
      { value: "show", label: "Appel tenu", color: C.orange },
      { value: "close", label: "Closé", color: C.green, closed: true },
      { value: "perdu", label: "Perdu", color: C.red, closed: true },
    ],
    fields: [
      { key: "title", label: "Nom du prospect", type: "text", column: "title", required: true },
      { key: "phone", label: "Téléphone", type: "phone", summary: true },
      { key: "email", label: "Email", type: "email" },
      { key: "instagram", label: "Instagram", type: "text", placeholder: "@pseudo" },
      {
        key: "source",
        label: "Source",
        type: "select",
        summary: true,
        options: [
          { value: "instagram", label: "Instagram" },
          { value: "tiktok", label: "TikTok" },
          { value: "youtube", label: "YouTube" },
          { value: "formulaire", label: "Formulaire de préqualification" },
          { value: "lead_magnet", label: "Guide gratuit (lead magnet)" },
          { value: "appli", label: "Inscription dans l'appli" },
          { value: "calendly", label: "Réservation Calendly directe" },
          { value: "pub", label: "Publicité" },
          { value: "recommandation", label: "Recommandation" },
          { value: "autre", label: "Autre" },
        ],
      },
      {
        key: "origine",
        label: "Lead fourni ou trouvé par toi",
        type: "select",
        options: [
          { value: "fourni", label: "Fourni par EP Coaching" },
          { value: "prospection", label: "Trouvé en prospection" },
        ],
      },
      { key: "offre", label: "Offre visée", type: "select", options: OFFER_OPTIONS, summary: true },
      { key: "amount", label: "Montant encaissé (€)", type: "money", column: "amount", summary: true },
      { key: "closed_on", label: "Date de closing", type: "date", column: "occurred_on" },
      { key: "next_action", label: "Prochaine relance", type: "datetime", column: "due_at", summary: true },
      {
        key: "objection",
        label: "Objection principale",
        type: "select",
        options: [
          { value: "prix", label: "Prix" },
          { value: "timing", label: "Pas le bon moment" },
          { value: "conjoint", label: "Doit en parler à quelqu'un" },
          { value: "confiance", label: "Manque de confiance" },
          { value: "besoin", label: "Besoin pas clair" },
          { value: "autre", label: "Autre" },
        ],
      },
      NOTES,
    ],
  },
  appointment: {
    kind: "appointment",
    singular: "Rendez-vous",
    plural: "Rendez-vous",
    addLabel: "Ajouter un rendez-vous",
    titleLabel: "Avec qui / objet",
    titlePlaceholder: "Ex : Appel découverte avec Julie",
    sort: "due_asc",
    emptyText: "Aucun rendez-vous planifié.",
    stages: [
      { value: "planifie", label: "Planifié", color: C.blue },
      { value: "honore", label: "Honoré", color: C.green, closed: true },
      { value: "no_show", label: "No-show", color: C.red, closed: true },
      { value: "reporte", label: "Reporté", color: C.gold },
      { value: "annule", label: "Annulé", color: C.grey, closed: true },
    ],
    fields: [
      { key: "title", label: "Avec qui / objet", type: "text", column: "title", required: true },
      { key: "starts_at", label: "Date et heure", type: "datetime", column: "due_at", required: true, summary: true },
      {
        key: "type",
        label: "Type",
        type: "select",
        summary: true,
        options: [
          { value: "decouverte", label: "Appel découverte" },
          { value: "closing", label: "Appel de closing" },
          { value: "suivi", label: "Suivi" },
          { value: "entretien", label: "Entretien de recrutement" },
          { value: "reunion", label: "Réunion interne" },
          { value: "tournage", label: "Tournage" },
          { value: "interview", label: "Interview / collaboration" },
          { value: "autre", label: "Autre" },
        ],
      },
      { key: "phone", label: "Téléphone", type: "phone" },
      { key: "link", label: "Lien visio", type: "url" },
      NOTES,
    ],
  },
  task: {
    kind: "task",
    singular: "Tâche",
    plural: "Tâches",
    addLabel: "Ajouter une tâche",
    titleLabel: "Tâche",
    titlePlaceholder: "Ce qu'il faut faire",
    sort: "due_asc",
    emptyText: "Rien à faire pour l'instant.",
    stages: [
      { value: "a_faire", label: "À faire", color: C.grey },
      { value: "en_cours", label: "En cours", color: C.blue },
      { value: "bloque", label: "Bloqué", color: C.red },
      { value: "fait", label: "Fait", color: C.green, closed: true },
    ],
    fields: [
      { key: "title", label: "Tâche", type: "text", column: "title", required: true },
      { key: "due", label: "Échéance", type: "date", column: "occurred_on", summary: true },
      { key: "priority", label: "Priorité", type: "select", options: PRIORITY_OPTIONS, summary: true },
      NOTES,
    ],
  },
  deliverable: {
    kind: "deliverable",
    singular: "Livrable",
    plural: "Livrables",
    addLabel: "Ajouter un livrable",
    titleLabel: "Titre",
    titlePlaceholder: "Ex : Reel mythe créatine",
    sort: "created_desc",
    emptyText: "Aucun livrable en cours.",
    stages: [
      { value: "idee", label: "Idée", color: C.grey },
      { value: "en_cours", label: "En cours", color: C.blue },
      { value: "relecture", label: "En relecture", color: C.gold },
      { value: "livre", label: "Livré", color: C.green },
      { value: "publie", label: "Publié", color: C.green, closed: true },
    ],
    fields: [
      { key: "title", label: "Titre", type: "text", column: "title", required: true },
      {
        key: "format",
        label: "Format",
        type: "select",
        summary: true,
        options: [
          { value: "reel", label: "Reel / Short" },
          { value: "youtube", label: "Vidéo YouTube" },
          { value: "story", label: "Story" },
          { value: "carrousel", label: "Carrousel" },
          { value: "post", label: "Post" },
          { value: "email", label: "Email" },
          { value: "newsletter", label: "Newsletter" },
          { value: "page_vente", label: "Page de vente" },
          { value: "script_pub", label: "Script publicitaire" },
          { value: "legende", label: "Légende" },
          { value: "autre", label: "Autre" },
        ],
      },
      { key: "platform", label: "Plateforme", type: "select", options: PLATFORM_OPTIONS, summary: true },
      { key: "deadline", label: "Deadline", type: "date", column: "occurred_on", summary: true },
      { key: "link", label: "Lien (fichier, brouillon, publication)", type: "url" },
      NOTES,
    ],
  },
  campaign: {
    kind: "campaign",
    singular: "Campagne",
    plural: "Campagnes",
    addLabel: "Ajouter une campagne",
    titleLabel: "Nom de la campagne",
    titlePlaceholder: "Ex : Meta, lead magnet créatine, septembre",
    sort: "created_desc",
    emptyText: "Aucune campagne suivie.",
    stages: [
      { value: "brouillon", label: "Brouillon", color: C.grey },
      { value: "active", label: "Active", color: C.green },
      { value: "pause", label: "En pause", color: C.gold },
      { value: "terminee", label: "Terminée", color: C.grey, closed: true },
    ],
    fields: [
      { key: "title", label: "Nom de la campagne", type: "text", column: "title", required: true },
      {
        key: "platform",
        label: "Plateforme",
        type: "select",
        summary: true,
        options: [
          { value: "meta", label: "Meta (Facebook / Instagram)" },
          { value: "google", label: "Google" },
          { value: "tiktok", label: "TikTok" },
          { value: "youtube", label: "YouTube" },
          { value: "autre", label: "Autre" },
        ],
      },
      { key: "start", label: "Date de lancement", type: "date", column: "occurred_on" },
      { key: "budget", label: "Budget prévu (€)", type: "money" },
      { key: "spend", label: "Dépensé (€)", type: "money", column: "amount", summary: true },
      { key: "leads", label: "Leads générés", type: "number", summary: true },
      { key: "sales", label: "Ventes attribuées", type: "number" },
      { key: "revenue", label: "Chiffre d'affaires généré (€)", type: "money" },
      NOTES,
    ],
  },
  ticket: {
    kind: "ticket",
    singular: "Ticket",
    plural: "Tickets",
    addLabel: "Ouvrir un ticket",
    titleLabel: "Sujet",
    titlePlaceholder: "Ex : La photo de bilan ne s'envoie pas",
    sort: "created_desc",
    emptyText: "Aucun ticket ouvert.",
    stages: [
      { value: "nouveau", label: "Nouveau", color: C.grey },
      { value: "en_cours", label: "En cours", color: C.blue },
      { value: "attente", label: "En attente de retour", color: C.gold },
      { value: "resolu", label: "Résolu", color: C.green, closed: true },
    ],
    fields: [
      { key: "title", label: "Sujet", type: "text", column: "title", required: true },
      {
        key: "type",
        label: "Type",
        type: "select",
        summary: true,
        options: [
          { value: "bug", label: "Bug" },
          { value: "question", label: "Question" },
          { value: "demande", label: "Demande d'évolution" },
          { value: "compte", label: "Compte / accès" },
          { value: "facturation", label: "Facturation" },
          { value: "autre", label: "Autre" },
        ],
      },
      {
        key: "priority",
        label: "Priorité",
        type: "select",
        summary: true,
        options: [{ value: "critique", label: "Critique" }, ...PRIORITY_OPTIONS],
      },
      { key: "requester", label: "Demandeur", type: "text", placeholder: "Nom ou email" },
      {
        key: "channel",
        label: "Canal",
        type: "select",
        options: [
          { value: "messagerie", label: "Messagerie de l'appli" },
          { value: "email", label: "Email" },
          { value: "instagram", label: "Instagram" },
          { value: "autre", label: "Autre" },
        ],
      },
      NOTES,
      { key: "resolution", label: "Résolution apportée", type: "textarea" },
    ],
  },
  feature: {
    kind: "feature",
    singular: "Fonctionnalité",
    plural: "Backlog",
    addLabel: "Ajouter au backlog",
    titleLabel: "Fonctionnalité",
    titlePlaceholder: "Ex : Export PDF du bilan",
    sort: "created_desc",
    emptyText: "Backlog vide.",
    stages: [
      { value: "idee", label: "Idée", color: C.grey },
      { value: "specifie", label: "Spécifié", color: C.violet },
      { value: "en_dev", label: "En développement", color: C.blue },
      { value: "en_test", label: "En test", color: C.gold },
      { value: "livre", label: "Livré", color: C.green, closed: true },
    ],
    fields: [
      { key: "title", label: "Fonctionnalité", type: "text", column: "title", required: true },
      {
        key: "impact",
        label: "Impact",
        type: "select",
        summary: true,
        options: [
          { value: "fort", label: "Fort" },
          { value: "moyen", label: "Moyen" },
          { value: "faible", label: "Faible" },
        ],
      },
      {
        key: "effort",
        label: "Effort",
        type: "select",
        summary: true,
        options: [
          { value: "s", label: "Petit (moins d'un jour)" },
          { value: "m", label: "Moyen (quelques jours)" },
          { value: "l", label: "Gros (plus d'une semaine)" },
        ],
      },
      {
        key: "source",
        label: "Demandé par",
        type: "select",
        options: [
          { value: "fondateur", label: "Fondateur" },
          { value: "coach", label: "Coach" },
          { value: "client", label: "Client / membre" },
          { value: "equipe", label: "Équipe" },
        ],
      },
      { key: "target", label: "Date cible", type: "date", column: "occurred_on" },
      { key: "spec", label: "Lien vers la spécification", type: "url" },
      NOTES,
    ],
  },
  transaction: {
    kind: "transaction",
    singular: "Écriture",
    plural: "Écritures",
    addLabel: "Ajouter une écriture",
    titleLabel: "Libellé",
    titlePlaceholder: "Ex : Abonnement Premium, Julie D.",
    sort: "created_desc",
    emptyText: "Aucune écriture.",
    stages: [
      { value: "en_attente", label: "En attente", color: C.gold },
      { value: "paye", label: "Payé", color: C.green, closed: true },
      { value: "en_retard", label: "En retard", color: C.red },
      { value: "annule", label: "Annulé", color: C.grey, closed: true },
    ],
    fields: [
      { key: "title", label: "Libellé", type: "text", column: "title", required: true },
      {
        key: "direction",
        label: "Sens",
        type: "select",
        required: true,
        summary: true,
        options: [
          { value: "encaissement", label: "Encaissement" },
          { value: "depense", label: "Dépense" },
        ],
      },
      { key: "amount", label: "Montant (€)", type: "money", column: "amount", required: true, summary: true },
      { key: "date", label: "Date", type: "date", column: "occurred_on", required: true, summary: true },
      {
        key: "category",
        label: "Catégorie",
        type: "select",
        options: [
          { value: "coaching", label: "Coaching" },
          { value: "saas", label: "SaaS" },
          { value: "formation", label: "Formation" },
          { value: "publicite", label: "Publicité" },
          { value: "outils", label: "Outils / logiciels" },
          { value: "prestataires", label: "Prestataires / commissions" },
          { value: "autre", label: "Autre" },
        ],
      },
      { key: "party", label: "Client ou fournisseur", type: "text" },
      NOTES,
    ],
  },
  candidate: {
    kind: "candidate",
    singular: "Candidat",
    plural: "Candidats",
    addLabel: "Ajouter un candidat",
    titleLabel: "Nom du candidat",
    titlePlaceholder: "Prénom Nom",
    sort: "created_desc",
    emptyText: "Aucun candidat dans ton pipeline.",
    stages: [
      { value: "candidature", label: "Candidature", color: C.grey },
      { value: "entretien", label: "Entretien", color: C.blue },
      { value: "test", label: "Mise en situation", color: C.violet },
      { value: "offre", label: "Proposition", color: C.gold },
      { value: "embauche", label: "Recruté", color: C.green, closed: true },
      { value: "refuse", label: "Refusé", color: C.red, closed: true },
    ],
    fields: [
      { key: "title", label: "Nom du candidat", type: "text", column: "title", required: true },
      {
        key: "role",
        label: "Poste visé",
        type: "select",
        summary: true,
        options: POLES.flatMap((p) => p.roles.map((r) => ({ value: r.key, label: r.title }))),
      },
      { key: "email", label: "Email", type: "email" },
      { key: "phone", label: "Téléphone", type: "phone" },
      {
        key: "source",
        label: "Source",
        type: "select",
        options: [
          { value: "carrieres", label: "Page Carrières" },
          { value: "linkedin", label: "LinkedIn" },
          { value: "recommandation", label: "Recommandation" },
          { value: "autre", label: "Autre" },
        ],
      },
      { key: "next", label: "Prochain échange", type: "datetime", column: "due_at", summary: true },
      NOTES,
    ],
  },
  audit: {
    kind: "audit",
    singular: "Audit",
    plural: "Audits qualité",
    addLabel: "Ajouter un audit",
    titleLabel: "Coach ou dossier audité",
    titlePlaceholder: "Ex : Bilans de la semaine, coach Léa",
    sort: "created_desc",
    emptyText: "Aucun audit pour l'instant.",
    stages: [
      { value: "planifie", label: "Planifié", color: C.blue },
      { value: "fait", label: "Fait", color: C.green, closed: true },
    ],
    fields: [
      { key: "title", label: "Coach ou dossier audité", type: "text", column: "title", required: true },
      {
        key: "scope",
        label: "Ce qui est audité",
        type: "select",
        summary: true,
        options: [
          { value: "bilans", label: "Bilans hebdomadaires" },
          { value: "programmes", label: "Programmes" },
          { value: "nutrition", label: "Plans nutrition" },
          { value: "messagerie", label: "Messagerie client" },
          { value: "integration", label: "Intégration d'un nouveau coach" },
        ],
      },
      { key: "date", label: "Date", type: "date", column: "occurred_on", summary: true },
      { key: "score", label: "Note sur 10", type: "number", summary: true },
      { key: "strengths", label: "Points forts", type: "textarea" },
      { key: "fixes", label: "À corriger", type: "textarea" },
    ],
  },
  followup: {
    kind: "followup",
    singular: "Suivi client",
    plural: "Suivis nouveaux clients",
    addLabel: "Ajouter un nouveau client",
    titleLabel: "Client",
    titlePlaceholder: "Prénom Nom",
    sort: "created_desc",
    emptyText: "Aucun nouveau client suivi.",
    stages: [
      { value: "j0", label: "Bienvenue à faire", color: C.gold },
      { value: "j7", label: "Suivi J+7", color: C.blue },
      { value: "j30", label: "Suivi J+30", color: C.violet },
      { value: "actif_j30", label: "Actif à J+30", color: C.green, closed: true },
      { value: "perdu", label: "Parti avant J+30", color: C.red, closed: true },
    ],
    fields: [
      { key: "title", label: "Client", type: "text", column: "title", required: true },
      { key: "start", label: "Date de démarrage", type: "date", column: "occurred_on", required: true, summary: true },
      { key: "phone", label: "Téléphone", type: "phone" },
      { key: "next", label: "Prochain contact", type: "datetime", column: "due_at", summary: true },
      { key: "friction", label: "Friction produit repérée", type: "textarea" },
      NOTES,
    ],
  },
  opportunity: {
    kind: "opportunity",
    singular: "Opportunité",
    plural: "Opportunités",
    addLabel: "Ajouter une opportunité",
    titleLabel: "Opportunité",
    titlePlaceholder: "Ex : Podcast Muscu & Mindset",
    sort: "created_desc",
    emptyText: "Aucune opportunité en cours.",
    stages: [
      { value: "idee", label: "Idée", color: C.grey },
      { value: "contacte", label: "Contacté", color: C.blue },
      { value: "discussion", label: "En discussion", color: C.violet },
      { value: "confirme", label: "Confirmé", color: C.gold },
      { value: "publie", label: "Publié", color: C.green, closed: true },
      { value: "refuse", label: "Refusé", color: C.red, closed: true },
    ],
    fields: [
      { key: "title", label: "Opportunité", type: "text", column: "title", required: true },
      {
        key: "type",
        label: "Type",
        type: "select",
        summary: true,
        options: [
          { value: "interview", label: "Interview" },
          { value: "podcast", label: "Podcast" },
          { value: "collab", label: "Collaboration contenu" },
          { value: "evenement", label: "Événement" },
          { value: "presse", label: "Presse" },
          { value: "autre", label: "Autre" },
        ],
      },
      { key: "contact", label: "Contact", type: "text" },
      { key: "date", label: "Date prévue", type: "datetime", column: "due_at", summary: true },
      { key: "audience", label: "Audience estimée", type: "number" },
      { key: "link", label: "Lien", type: "url" },
      NOTES,
    ],
  },
  process: {
    kind: "process",
    singular: "Process",
    plural: "Process",
    addLabel: "Documenter un process",
    titleLabel: "Process",
    titlePlaceholder: "Ex : Intégration d'une nouvelle recrue",
    sort: "created_desc",
    emptyText: "Aucun process documenté.",
    stages: [
      { value: "a_ecrire", label: "À écrire", color: C.grey },
      { value: "brouillon", label: "Brouillon", color: C.gold },
      { value: "valide", label: "Validé", color: C.green, closed: true },
      { value: "obsolete", label: "Obsolète", color: C.red, closed: true },
    ],
    fields: [
      { key: "title", label: "Process", type: "text", column: "title", required: true },
      {
        key: "pole",
        label: "Pôle concerné",
        type: "select",
        summary: true,
        options: [
          ...POLES.map((p) => ({ value: p.key, label: p.name })),
          { value: "transverse", label: "Transverse" },
        ],
      },
      { key: "owner", label: "Responsable", type: "text", summary: true },
      { key: "link", label: "Lien vers le document", type: "url" },
      NOTES,
    ],
  },
};

// ── Rapport de fin de journée ───────────────────────────────────────────

export interface ReportMetric {
  key: string;
  label: string;
  type: "number" | "money";
}

// ── Modules (onglets de l'espace) ───────────────────────────────────────

export type ModuleKey =
  | "agenda"
  | "crm"
  | "taches"
  | "livrables"
  | "campagnes"
  | "tickets"
  | "backlog"
  | "finance"
  | "recrutement"
  | "audits"
  | "clients"
  | "opportunites"
  | "process"
  | "rapports"
  | "scripts"
  | "equipe";

export interface ModuleDef {
  key: ModuleKey;
  label: string;
  description: string;
  /** Type de données géré par le module (absent = vue spéciale). */
  kind?: Exclude<RecordKind, "report">;
}

export const MODULES: Record<ModuleKey, ModuleDef> = {
  agenda: { key: "agenda", label: "Agenda", description: "Tes rendez-vous, du plus proche au plus lointain.", kind: "appointment" },
  crm: { key: "crm", label: "CRM", description: "Chaque prospect, son étape et sa prochaine relance.", kind: "lead" },
  taches: { key: "taches", label: "Tâches", description: "Ce qu'il te reste à faire, par échéance.", kind: "task" },
  livrables: { key: "livrables", label: "Livrables", description: "Tout ce que tu produis, de l'idée à la publication.", kind: "deliverable" },
  campagnes: { key: "campagnes", label: "Campagnes", description: "Budget, dépense, leads, coût par lead et retour sur investissement.", kind: "campaign" },
  tickets: { key: "tickets", label: "Tickets", description: "Demandes et bugs à traiter, du plus urgent au plus ancien.", kind: "ticket" },
  backlog: { key: "backlog", label: "Backlog", description: "Les évolutions de l'appli, de l'idée à la livraison.", kind: "feature" },
  finance: { key: "finance", label: "Trésorerie", description: "Encaissements, dépenses et paiements en retard.", kind: "transaction" },
  recrutement: { key: "recrutement", label: "Recrutement", description: "Les candidatures reçues sur la page Carrières et ton pipeline.", kind: "candidate" },
  audits: { key: "audits", label: "Audits qualité", description: "Contrôle qualité du coaching, avec une note et des points d'action.", kind: "audit" },
  clients: { key: "clients", label: "Nouveaux clients", description: "Les 30 premiers jours de chaque nouveau client.", kind: "followup" },
  opportunites: { key: "opportunites", label: "Opportunités", description: "Interviews, podcasts, collaborations en cours.", kind: "opportunity" },
  process: { key: "process", label: "Process", description: "Les façons de faire de l'entreprise, écrites noir sur blanc.", kind: "process" },
  rapports: { key: "rapports", label: "Rapport du jour", description: "Tes chiffres de la journée, en deux minutes." },
  scripts: { key: "scripts", label: "Scripts d'appel", description: "La banque de questions d'appel de vente, par situation." },
  equipe: { key: "equipe", label: "Mon équipe", description: "Les chiffres du mois de chaque personne que tu encadres." },
};

// ── Métiers ─────────────────────────────────────────────────────────────

export interface StaffRoleConfig {
  key: string;
  modules: ModuleKey[];
  reportMetrics: ReportMetric[];
  /** Postes encadrés (vue "Mon équipe"). */
  team?: string[];
  /** Ce qui compte vraiment dans ce métier, affiché en tête du tableau de bord. */
  focus: string;
}

const n = (key: string, label: string): ReportMetric => ({ key, label, type: "number" });
const m = (key: string, label: string): ReportMetric => ({ key, label, type: "money" });

export const STAFF_ROLES: StaffRoleConfig[] = [
  {
    key: "head-coach",
    modules: ["audits", "equipe", "agenda", "taches", "rapports"],
    team: ["coach-onboarding-success"],
    reportMetrics: [n("bilans_audites", "Bilans audités"), n("coachs_accompagnes", "Coachs accompagnés"), n("cas_difficiles", "Cas difficiles traités")],
    focus: "La qualité du coaching sur tout le portefeuille : audits réguliers et coachs qui progressent.",
  },
  {
    key: "coach-onboarding-success",
    modules: ["clients", "agenda", "taches", "rapports"],
    reportMetrics: [n("bienvenues", "Bienvenues faites"), n("suivis", "Suivis faits"), n("frictions", "Frictions produit remontées")],
    focus: "Chaque nouveau client toujours actif à J+30. C'est ce qui déclenche ta prime.",
  },
  {
    key: "setter",
    modules: ["crm", "agenda", "scripts", "taches", "rapports"],
    reportMetrics: [n("conversations", "Conversations (DM, commentaires)"), n("leads_qualifies", "Leads qualifiés"), n("rdv_bookes", "RDV bookés"), n("relances", "Relances no-show")],
    focus: "Des rendez-vous qualifiés qui se présentent, jamais un agenda rempli pour rien.",
  },
  {
    key: "closer",
    modules: ["agenda", "crm", "scripts", "taches", "rapports"],
    reportMetrics: [n("appels_prevus", "Appels prévus"), n("appels_tenus", "Appels tenus"), n("ventes", "Ventes"), m("cash_collecte", "Cash collecté (€)")],
    focus: "Ton taux de close et ton cash collecté. Qualifie avant de persuader.",
  },
  {
    key: "head-of-sales",
    modules: ["equipe", "crm", "agenda", "scripts", "taches", "rapports"],
    team: ["setter", "closer"],
    reportMetrics: [n("coachings", "Coachings individuels de l'équipe"), n("appels_reecoutes", "Appels réécoutés"), n("ventes_equipe", "Ventes de l'équipe")],
    focus: "Le chiffre d'affaires signé par toute l'équipe et le vrai goulot d'étranglement du mois.",
  },
  {
    key: "createur-contenu-videaste",
    modules: ["livrables", "agenda", "taches", "rapports"],
    reportMetrics: [n("videos_tournees", "Vidéos tournées"), n("videos_montees", "Vidéos montées"), n("videos_livrees", "Vidéos livrées")],
    focus: "Livrer dans le délai annoncé, sans relance, dans l'identité de la marque.",
  },
  {
    key: "community-manager",
    modules: ["livrables", "agenda", "taches", "rapports"],
    reportMetrics: [n("posts_publies", "Posts publiés"), n("commentaires", "Commentaires traités"), n("dm", "Messages privés traités"), n("questions_chaudes", "Questions chaudes remontées")],
    focus: "Un calendrier tenu et une réponse publique en moins de 4h en journée.",
  },
  {
    key: "copywriter",
    modules: ["livrables", "taches", "rapports"],
    reportMetrics: [n("textes_livres", "Textes livrés"), n("emails_ecrits", "Emails écrits"), n("accroches_testees", "Accroches testées")],
    focus: "Des textes dans la voix de la marque dès le premier jet.",
  },
  {
    key: "personal-brand-manager",
    modules: ["opportunites", "livrables", "agenda", "taches", "rapports"],
    reportMetrics: [n("contacts", "Opportunités contactées"), n("publications", "Publications validées"), n("alertes", "Alertes réputation traitées")],
    focus: "Des prises de parole alignées avec la marque, et une réaction sous 24h en cas d'enjeu.",
  },
  {
    key: "growth-traffic-manager",
    modules: ["campagnes", "taches", "rapports"],
    reportMetrics: [m("depense", "Dépense du jour (€)"), n("leads", "Leads du jour"), n("tests", "Tests lancés")],
    focus: "Un coût par lead précis et un retour sur investissement positif. Coupe ce qui ne performe pas.",
  },
  {
    key: "head-of-marketing",
    modules: ["equipe", "livrables", "campagnes", "agenda", "taches", "rapports"],
    team: ["createur-contenu-videaste", "community-manager", "copywriter", "personal-brand-manager", "growth-traffic-manager"],
    reportMetrics: [n("contenus_valides", "Contenus validés"), n("reunions", "Points avec l'équipe")],
    focus: "La notoriété et l'acquisition du mois, et le canal qui coince vraiment.",
  },
  {
    key: "developpeur-saas",
    modules: ["tickets", "backlog", "taches", "rapports"],
    reportMetrics: [n("tickets_resolus", "Tickets résolus"), n("features_livrees", "Fonctionnalités livrées"), n("heures", "Heures travaillées")],
    focus: "Une appli rapide, fiable et sûre. Rien ne part en production sans test réel.",
  },
  {
    key: "product-manager",
    modules: ["backlog", "tickets", "equipe", "agenda", "taches", "rapports"],
    team: ["developpeur-saas", "support-client-tech"],
    reportMetrics: [n("specs", "Spécifications rédigées"), n("retours", "Retours utilisateurs collectés")],
    focus: "Prioriser avec de vraies données d'usage, pas la dernière demande reçue.",
  },
  {
    key: "support-client-tech",
    modules: ["tickets", "taches", "rapports"],
    reportMetrics: [n("tickets_traites", "Tickets traités"), n("tickets_resolus", "Tickets résolus"), n("bugs_remontes", "Bugs remontés")],
    focus: "Chaque ticket traité sous 24h ouvrées, et les bugs récurrents documentés.",
  },
  {
    key: "office-ops-manager",
    modules: ["process", "equipe", "agenda", "taches", "rapports"],
    team: ["secretaire-assistant"],
    reportMetrics: [n("process_documentes", "Process documentés"), n("points_inter_poles", "Points entre pôles")],
    focus: "Des process écrits plutôt que gardés en tête, et les alertes avant les problèmes.",
  },
  {
    key: "secretaire-assistant",
    modules: ["agenda", "taches", "rapports"],
    reportMetrics: [n("emails", "Emails traités"), n("appels", "Appels traités"), n("rdv_organises", "Rendez-vous organisés"), n("documents", "Documents classés")],
    focus: "Aucun email administratif sans réponse plus de 48h, et chaque document classé le jour même.",
  },
  {
    key: "finance-comptabilite",
    modules: ["finance", "taches", "rapports"],
    reportMetrics: [n("paiements_verifies", "Paiements vérifiés"), n("factures", "Factures émises"), n("relances", "Relances envoyées")],
    focus: "Une trésorerie juste au jour près, et aucun chiffre communiqué sans vérification.",
  },
  {
    key: "rh-people-ops",
    modules: ["recrutement", "agenda", "taches", "rapports"],
    reportMetrics: [n("candidatures_traitees", "Candidatures traitées"), n("entretiens", "Entretiens menés"), n("reponses", "Réponses envoyées")],
    focus: "Des recrutements sur scorecard, et aucun candidat qui attend une réponse.",
  },
];

export const STAFF_ROLE_KEYS = STAFF_ROLES.map((r) => r.key);

export function getStaffRoleConfig(roleKey: string): StaffRoleConfig | null {
  return STAFF_ROLES.find((r) => r.key === roleKey) ?? null;
}

export function getRoleCard(roleKey: string): { role: RoleCard; pole: Pole } | null {
  for (const pole of POLES) {
    const role = pole.roles.find((r) => r.key === roleKey);
    if (role) return { role, pole };
  }
  return null;
}

export function isStaffRoleKey(value: unknown): value is string {
  return typeof value === "string" && STAFF_ROLE_KEYS.includes(value);
}

/** Types de données qu'un métier a le droit d'écrire. */
export function allowedKinds(roleKey: string): RecordKind[] {
  const cfg = getStaffRoleConfig(roleKey);
  if (!cfg) return [];
  const kinds = new Set<RecordKind>(["report"]);
  for (const mod of cfg.modules) {
    const kind = MODULES[mod].kind;
    if (kind) kinds.add(kind);
  }
  return [...kinds];
}

export function staffLoginPath(roleKey: string): string {
  return `/auth/equipe/${roleKey}`;
}

export function stageDef(kind: Exclude<RecordKind, "report">, value: string): StageDef | undefined {
  return KINDS[kind].stages.find((s) => s.value === value);
}

export function isClosedStage(kind: Exclude<RecordKind, "report">, value: string): boolean {
  return stageDef(kind, value)?.closed === true;
}
