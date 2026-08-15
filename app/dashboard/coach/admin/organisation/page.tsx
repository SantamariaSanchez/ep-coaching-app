import { redirect } from "next/navigation";
import Link from "next/link";
import { getUser, getProfile } from "@/utils/auth";
import { ChevronLeft, Building2, Users, GraduationCap, FileText, ShieldAlert } from "lucide-react";

// Réservé au propriétaire de la plateforme (comme le reste du groupe
// Administration) — organigramme de recrutement, modèle de formation avant
// embauche et exemple de fiche technique. Vivait avant uniquement dans un
// artifact externe ; demande explicite du 2026-08-15 : "faut y pousser dans
// l'appli, je vois aucun nouvel onglet, publie hein" — porté ici avec un
// vrai onglet dans la nav (Administration > Organisation) plutôt qu'un lien
// à part que personne ne retrouve.

interface RoleCard {
  title: string;
  mission: string;
  levels: string[];
  tasks: string[];
  reportsTo: string;
}

interface Pole {
  key: string;
  name: string;
  color: string;
  roles: RoleCard[];
}

const POLES: Pole[] = [
  {
    key: "coaching",
    name: "Coaching & Delivery",
    color: "#e08a4a",
    roles: [
      {
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

function RoleCardView({ role, color }: { role: RoleCard; color: string }) {
  return (
    <div
      className="bg-[#1f0101] border border-[#890404]/20 rounded-xl p-4 relative overflow-hidden"
    >
      <div className="absolute left-0 top-0 bottom-0" style={{ width: 3, background: color }} />
      <p className="text-sm font-black text-white mb-1">{role.title}</p>
      <p className="text-[12px] text-[#F5EDED]/55 leading-relaxed mb-3">{role.mission}</p>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {role.levels.map((l) => (
          <span
            key={l}
            className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border"
            style={{ background: `${color}18`, borderColor: `${color}55`, color }}
          >
            {l}
          </span>
        ))}
      </div>
      <ul className="space-y-1 mb-3">
        {role.tasks.map((t, i) => (
          <li key={i} className="text-[11.5px] text-[#F5EDED]/55 flex gap-2 leading-snug">
            <span style={{ color, flexShrink: 0 }}>•</span> {t}
          </li>
        ))}
      </ul>
      <p className="text-[10px] text-[#F5EDED]/30 pt-2.5 border-t border-dashed border-[#890404]/15">
        Rattaché à : <strong className="text-[#F5EDED]/55 font-bold">{role.reportsTo}</strong>
      </p>
    </div>
  );
}

export default async function OrganisationAdminPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (!profile?.is_platform_owner) redirect("/dashboard/coach");

  const totalRoles = POLES.reduce((sum, p) => sum + p.roles.length, 0);

  return (
    <div className="px-6 py-8 max-w-3xl mx-auto pb-24 md:pb-8 page-transition">
      <Link
        href="/dashboard/coach/admin"
        className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#F5EDED]/40 hover:text-[#F5EDED]/70 transition-colors mb-6"
      >
        <ChevronLeft size={13} /> Retour
      </Link>

      <div className="mb-8">
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

      {/* ── Vue d'ensemble ── */}
      <div className="bg-[#1f0101] border border-[#890404]/25 rounded-xl p-5 mb-10">
        <div className="flex items-center gap-2 mb-4">
          <Building2 size={14} className="text-[#E01E1E]" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35">
            Organigramme — {totalRoles} postes sur {POLES.length} pôles
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {POLES.map((p) => (
            <div key={p.key} className="bg-[#150000] border border-[#890404]/15 rounded-lg px-3 py-2.5 text-center">
              <p className="text-lg font-black text-white">{p.roles.length}</p>
              <p className="text-[9px] font-bold uppercase tracking-wider mt-0.5" style={{ color: p.color }}>
                {p.name.split(" ")[0]}
              </p>
            </div>
          ))}
        </div>
        <p className="text-[10.5px] text-[#F5EDED]/30 mt-3 leading-relaxed">
          Chaque pôle peut démarrer à une seule personne — la structure tient même à 1 recrutement près.
        </p>
      </div>

      {/* ── Pôles ── */}
      {POLES.map((pole) => (
        <section key={pole.key} className="mb-10">
          <div className="flex items-center gap-2 mb-4 pb-2.5" style={{ borderBottom: `2px solid ${pole.color}` }}>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: pole.color }}>Pôle</p>
            <h2 className="text-base font-black">{pole.name}</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {pole.roles.map((role) => (
              <RoleCardView key={role.title} role={role} color={pole.color} />
            ))}
          </div>
        </section>
      ))}

      {/* ── Parcours d'intégration ── */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-1">
          <Users size={14} className="text-[#E01E1E]" />
          <h2 className="text-base font-black uppercase tracking-tight">Parcours d&apos;intégration</h2>
        </div>
        <p className="text-[12px] text-[#F5EDED]/40 mb-4 leading-relaxed">
          Trame générique pour quelqu&apos;un qui vient d&apos;être embauché — aucune nouvelle recrue livrée à
          elle-même dès le premier jour.
        </p>
        <div className="space-y-0">
          {TIMELINE.map((t, i) => (
            <div key={i} className={`grid grid-cols-[90px_1fr] gap-4 py-3.5 ${i > 0 ? "border-t border-[#890404]/10" : ""}`}>
              <p className="text-[11px] font-black text-[#E01E1E] pt-0.5">{t.when}</p>
              <div>
                <p className="text-[13px] font-bold text-white mb-1">{t.title}</p>
                <p className="text-[11.5px] text-[#F5EDED]/45 leading-relaxed">{t.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Formation avant embauche ── */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-1">
          <GraduationCap size={14} className="text-[#E01E1E]" />
          <h2 className="text-base font-black uppercase tracking-tight">Formation avant embauche</h2>
        </div>
        <p className="text-[12px] text-[#F5EDED]/40 mb-4 leading-relaxed">
          Former quelqu&apos;un avant de s&apos;engager, puis le rémunérer une fois compétent, est sain — mais le
          droit du travail encadre strictement le travail non rémunéré. Ce déroulé s&apos;appuie sur des
          statuts qui existent déjà, pas sur un montage inventé.
        </p>
        <div className="space-y-2.5">
          {PHASES.map((phase, i) => (
            <div key={i} className="bg-[#1f0101] border border-[#890404]/20 rounded-xl p-4 flex gap-3.5">
              <div className="w-8 h-8 rounded-full bg-[#E01E1E]/15 text-[#E01E1E] font-black text-sm flex items-center justify-center flex-shrink-0">
                {i + 1}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-white mb-1">{phase.title}</p>
                <p className="text-[11.5px] text-[#F5EDED]/50 leading-relaxed mb-2">{phase.desc}</p>
                {phase.status && (
                  <span
                    className="inline-block text-[10px] font-bold px-2.5 py-1 rounded-full"
                    style={
                      phase.ok
                        ? { background: "rgba(74,222,128,0.1)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.3)" }
                        : { background: "rgba(251,191,36,0.1)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.3)" }
                    }
                  >
                    {phase.status}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Fiche technique exemple ── */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-1">
          <FileText size={14} className="text-[#E01E1E]" />
          <h2 className="text-base font-black uppercase tracking-tight">Exemple de fiche technique</h2>
        </div>
        <p className="text-[12px] text-[#F5EDED]/40 mb-4 leading-relaxed">
          Même esprit que les fiches techniques de montage déjà présentes dans l&apos;onglet Idéation : du
          concret à appliquer. Exemple complet pour le Setter, à dupliquer pour chaque poste le jour où il
          s&apos;ouvre vraiment.
        </p>
        <div className="bg-[#1f0101] border border-[#890404]/25 rounded-xl p-5">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <p className="text-[15px] font-black text-white">Setter — Qualification de leads</p>
            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300">
              Pôle Sales
            </span>
          </div>

          <div className="mb-4">
            <p className="text-[9px] font-bold uppercase tracking-widest text-[#E01E1E] mb-1.5">Objectif du poste</p>
            <p className="text-[12px] text-[#F5EDED]/55 leading-relaxed">
              Transformer un message ou un commentaire de quelqu&apos;un d&apos;intéressé en un rendez-vous qualifié
              dans l&apos;agenda du closer, sans jamais faire perdre de temps au closer avec un lead qui n&apos;ira
              nulle part.
            </p>
          </div>

          <div className="mb-4">
            <p className="text-[9px] font-bold uppercase tracking-widest text-[#E01E1E] mb-1.5">Étapes à maîtriser, dans l&apos;ordre</p>
            <ol className="space-y-1 pl-4 list-decimal">
              <li className="text-[12px] text-[#F5EDED]/55 leading-relaxed">Répondre en moins de 2h en journée, avec un message qui relance une vraie conversation (jamais un lien direct en premier message)</li>
              <li className="text-[12px] text-[#F5EDED]/55 leading-relaxed">Poser 3 questions de qualification : objectif, disponibilité budgétaire approximative, urgence</li>
              <li className="text-[12px] text-[#F5EDED]/55 leading-relaxed">Repérer les signaux d&apos;un lead non qualifié et le laisser partir sans insister</li>
              <li className="text-[12px] text-[#F5EDED]/55 leading-relaxed">Proposer 2 à 3 créneaux précis, jamais une question ouverte du type &quot;quand es-tu dispo&quot;</li>
              <li className="text-[12px] text-[#F5EDED]/55 leading-relaxed">Confirmer le rendez-vous par écrit et programmer une relance automatique 24h avant</li>
              <li className="text-[12px] text-[#F5EDED]/55 leading-relaxed">Mettre à jour la fiche CRM du lead à chaque étape</li>
            </ol>
          </div>

          <div className="mb-4">
            <p className="text-[9px] font-bold uppercase tracking-widest text-[#E01E1E] mb-1.5">Exemple de script de qualification</p>
            <pre className="bg-[#150000] border border-[#890404]/20 rounded-lg p-3 text-[11px] text-[#F5EDED]/60 leading-relaxed whitespace-pre-wrap font-mono">{`Salut [Prénom] 👋 merci pour ton message !
Avant de te proposer un créneau avec [Closer], j'ai 2-3 questions
rapides pour être sûr qu'on te fasse gagner du temps :

1. Qu'est-ce qui te pousse à chercher un coach en ce moment ?
2. T'as déjà été coaché avant, ou c'est une première ?
3. Tu serais dispo cette semaine ou plutôt la semaine prochaine
   pour un appel de 20 min ?`}</pre>
          </div>

          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-[#E01E1E] mb-1.5">Critères de passage en poste rémunéré</p>
            <div className="grid sm:grid-cols-2 gap-2">
              {[
                { k: "Délai de réponse", v: "moins de 2h en journée sur 10 leads test" },
                { k: "Qualification", v: "8/10 leads correctement qualifiés (audité par le Head of Sales)" },
                { k: "Taux de présence", v: "au moins 70% des rendez-vous pris se présentent réellement" },
                { k: "CRM à jour", v: "100% des leads traités ont une fiche complète" },
              ].map((c) => (
                <div key={c.k} className="bg-[#150000] border border-[#890404]/15 rounded-lg px-3 py-2">
                  <p className="text-[11.5px] text-[#F5EDED]/60"><strong className="text-white font-bold">{c.k}</strong> — {c.v}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Contrats & légal ── */}
      <section className="mb-8">
        <h2 className="text-base font-black uppercase tracking-tight mb-1">Contrats &amp; aspects légaux</h2>
        <p className="text-[12px] text-[#F5EDED]/40 mb-4 leading-relaxed">
          Repères pour préparer la discussion avec un professionnel — pas des documents prêts à signer.
        </p>
        <div className="grid sm:grid-cols-2 gap-2.5 mb-5">
          {CONTRACTS.map((c) => (
            <div key={c.title} className="bg-[#1f0101] border border-[#890404]/20 rounded-xl p-4">
              <p className="text-[13px] font-bold text-white mb-1">{c.title}</p>
              <p className="text-[11.5px] text-[#F5EDED]/45 leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </div>

        <div className="flex items-start gap-3 bg-amber-500/5 border border-amber-500/25 rounded-xl px-4 py-3.5">
          <ShieldAlert size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[12.5px] font-bold text-amber-300 mb-1">Ce document ne remplace pas un avocat</p>
            <p className="text-[11.5px] text-amber-300/75 leading-relaxed">
              Les fiches de poste, la trame d&apos;intégration et le déroulé de formation avant embauche
              ci-dessus sont des points de départ utilisables tels quels. Les contrats de travail, eux,
              doivent être rédigés ou validés par un avocat en droit du travail avant toute signature — à
              faire avant le premier recrutement, pas après.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
