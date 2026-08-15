import { redirect } from "next/navigation";
import Link from "next/link";
import { getUser, getProfile } from "@/utils/auth";
import { createServerSupabase } from "@/lib/supabase-server";
import { ChevronLeft } from "lucide-react";
import OrganisationView, { type Pole, type RoleStatus } from "@/components/ui/OrganisationView";
import { setRoleStatus } from "./actions";

// Réservé au propriétaire de la plateforme (comme le reste du groupe
// Administration) — organigramme de recrutement, modèle de formation avant
// embauche et exemple de fiche technique. Vivait avant uniquement dans un
// artifact externe ; demande explicite du 2026-08-15 : "faut y pousser dans
// l'appli, je vois aucun nouvel onglet, publie hein" — porté ici avec un
// vrai onglet dans la nav (Administration > Organisation) plutôt qu'un lien
// à part que personne ne retrouve.
//
// Rendu confié à OrganisationView.tsx (composant client, accordéons +
// statut de recrutement cliquable par poste) suite à un deuxième retour le
// même jour : la première version rendait tout à plat (POLES puis TIMELINE
// puis PHASES puis la fiche technique, un seul long scroll), jugée trop
// dense et purement en lecture. Ce fichier ne garde que les données et le
// garde d'accès.

const POLES: Pole[] = [
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

const TIMELINE = [
  { when: "Semaine 1", title: "Découverte", desc: "Présentation de la mission, de l'équipe et des outils. Accès créés (appli, messagerie, dossiers partagés). Observation du poste en doublure avec un titulaire ou le fondateur." },
  { when: "Semaine 2-3", title: "Pratique accompagnée", desc: "Premières tâches réelles en binôme, avec relecture systématique avant envoi/publication. Point hebdomadaire avec le responsable du pôle pour ajuster." },
  { when: "Semaine 4", title: "Autonomie encadrée", desc: "Prise en main autonome du poste avec supervision légère. Bilan d'intégration formel : ce qui fonctionne, ce qui bloque, ajustement du plan si besoin." },
  { when: "Mois 3", title: "Évaluation de période d'essai", desc: "Bilan complet avec le fondateur ou le responsable de pôle : confirmation du poste, ajustement de la mission, ou fin de la période d'essai selon les résultats." },
];

const PHASES = [
  {
    title: "Formation théorique, à distance",
    desc: "Le candidat suit les fiches techniques du poste visé (voir l'exemple plus bas) et les ressources déjà produites par EP Coaching : contenus de formation, scripts, cas pratiques. Ça ne demande aucune présence ni tâche réelle pour l'entreprise, donc pas de statut particulier à ce stade.",
    status: "Non concerné par la rémunération (pas de travail effectif)",
    ok: true,
  },
  {
    title: "Mise en pratique encadrée",
    desc: "Dès que le candidat produit un vrai travail utilisable par l'entreprise (répondre à un vrai client, publier un vrai post, tenir un vrai appel), ce n'est plus de la formation pure : ça relève d'un statut encadré — stage conventionné avec un établissement, alternance, ou période d'essai d'un contrat déjà signé. Le choix se fait avec l'avocat/expert-comptable, pas au feeling.",
    status: "Statut à cadrer avant de démarrer, pas après",
    ok: false,
  },
  {
    title: "Évaluation de compétence",
    desc: "Un coaching live individuel avec le responsable du pôle, suivi d'un audit sur un échantillon de travail réel (voir les critères dans l'exemple de fiche technique). L'évaluation porte sur des critères écrits à l'avance, communiqués au candidat dès la phase 1.",
    status: null,
    ok: null,
  },
  {
    title: "Passage en poste rémunéré",
    desc: "Une fois les critères validés, signature du contrat correspondant au poste (CDI, CDD ou confirmation d'alternance) avec une vraie rémunération dès le premier jour de ce contrat. Si les critères ne sont pas atteints, retour en phase 2 avec un plan de progression écrit, ou fin du parcours.",
    status: "Rémunéré dès la signature",
    ok: true,
  },
];

const CONTRACTS = [
  { title: "CDI", desc: "La forme standard pour un poste permanent à temps plein ou partiel (Head Coach, Head of Sales, développeur...). Période d'essai renouvelable une fois selon le statut du poste." },
  { title: "CDD", desc: "Pour un besoin ponctuel ou un remplacement (pic d'activité, congé). Durée et motif encadrés strictement par la loi française." },
  { title: "Freelance / indépendant", desc: "Fréquent pour un vidéaste, copywriter ou développeur ponctuel. Attention au risque de requalification en salariat si le lien de subordination est trop fort." },
  { title: "Alternance", desc: "Pour former un profil junior (community manager, setter, secrétaire) tout en le finançant partiellement. Le cadre le plus adapté au modèle formation-avant-embauche." },
  { title: "Stage conventionné", desc: "Pour la phase de mise en pratique avant embauche, si le candidat est encore en études. Gratification obligatoire au-delà de 2 mois, convention obligatoire." },
];

export default async function OrganisationAdminPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (!profile?.is_platform_owner) redirect("/dashboard/coach");

  const supabase = await createServerSupabase();
  const { data: statusRows } = await supabase
    .from("org_role_status")
    .select("role_key, status")
    .eq("owner_id", user.id);

  const initialStatuses: Record<string, RoleStatus> = {};
  for (const row of statusRows ?? []) {
    initialStatuses[row.role_key as string] = row.status as RoleStatus;
  }

  return (
    <div className="px-6 py-8 max-w-3xl mx-auto pb-24 md:pb-8 page-transition">
      <Link
        href="/dashboard/coach/admin"
        className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#F5EDED]/40 hover:text-[#F5EDED]/70 transition-colors mb-6"
      >
        <ChevronLeft size={13} /> Retour
      </Link>

      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Administration
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">Organisation</h1>
        <p className="text-sm text-[#F5EDED]/45 mt-2 leading-relaxed">
          Une structure de référence pour préparer les futures embauches : qui fait quoi,
          à qui chaque poste rapporte, comment on les forme avant même de les embaucher,
          et ce qu&apos;il faudra régler légalement avant de signer qui que ce soit.
        </p>
      </div>

      <OrganisationView
        poles={POLES}
        timeline={TIMELINE}
        phases={PHASES}
        contracts={CONTRACTS}
        initialStatuses={initialStatuses}
        setRoleStatus={setRoleStatus}
      />
    </div>
  );
}
