import { redirect } from "next/navigation";
import Link from "next/link";
import { getUser, getProfile } from "@/utils/auth";
import { createServerSupabase } from "@/lib/supabase-server";
import { ChevronLeft, ExternalLink } from "lucide-react";
import OrganisationView, { type RoleStatus } from "@/components/ui/OrganisationView";
import { POLES } from "@/lib/org-roles";
import { getJobApplications, getOnboardingStepsByApplication } from "@/lib/job-applications";
import { setRoleStatus, setApplicationStatus, setApplicationNotes, toggleOnboardingStep } from "./actions";

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
//
// POLES déplacé dans lib/org-roles.ts le 2026-08-16 pour être partagé avec
// la page publique de candidature /carrieres, et section "Candidatures
// reçues" ajoutée au même moment (recrutement réel confirmé côté business).

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
    desc: "Dès que le candidat produit un vrai travail utilisable par l'entreprise (répondre à un vrai client, publier un vrai post, tenir un vrai appel), ce n'est plus de la formation pure : ça relève d'un statut encadré, stage conventionné avec un établissement, alternance, ou période d'essai d'un contrat déjà signé. Le choix se fait avec l'avocat/expert-comptable, pas au feeling.",
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

  const applications = await getJobApplications(user.id);
  const acceptedIds = applications.filter((a) => a.status === "acceptee").map((a) => a.id);
  const onboardingByApplication = await getOnboardingStepsByApplication(acceptedIds);
  const roleTitleByKey: Record<string, string> = {};
  for (const pole of POLES) {
    for (const role of pole.roles) roleTitleByKey[role.key] = role.title;
  }

  return (
    <div className="px-6 py-8 max-w-3xl mx-auto pb-24 md:pb-8 page-transition">
      <Link
        href="/dashboard/coach/admin"
        className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#F5EDED]/40 hover:text-[#F5EDED]/70 transition-colors mb-6"
      >
        <ChevronLeft size={13} /> Retour
      </Link>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
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
        <Link
          href="/carrieres"
          target="_blank"
          className="flex-shrink-0 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#E01E1E] border border-[#E01E1E]/30 rounded-lg px-3 py-2 hover:bg-[#E01E1E]/10 transition-colors whitespace-nowrap"
        >
          Page publique <ExternalLink size={11} />
        </Link>
      </div>

      <OrganisationView
        poles={POLES}
        timeline={TIMELINE}
        phases={PHASES}
        contracts={CONTRACTS}
        initialStatuses={initialStatuses}
        setRoleStatus={setRoleStatus}
        applications={applications}
        roleTitleByKey={roleTitleByKey}
        setApplicationStatus={setApplicationStatus}
        setApplicationNotes={setApplicationNotes}
        onboardingByApplication={onboardingByApplication}
        toggleOnboardingStep={toggleOnboardingStep}
      />
    </div>
  );
}
