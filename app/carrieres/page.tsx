import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, Briefcase, GraduationCap, Rocket, MessageCircle } from "lucide-react";
import { EPLogo } from "@/components/ui/EPLogo";
import { POLES } from "@/lib/org-roles";
import { getPlatformOwnerId } from "@/lib/job-applications";
import { createAdminClient } from "@/lib/supabase-admin";
import type { RoleStatus } from "@/components/ui/OrganisationView";
import CareersClient from "@/components/careers/CareersClient";

const TITLE = "Carrières | EP Coaching";
const DESCRIPTION = "Rejoins l'équipe EP Coaching : coaching, sales, marketing, produit, opérations.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/carrieres" },
  openGraph: { url: "/carrieres", title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

// Page publique de candidature (demande explicite 2026-08-16 : "recrutement
// réel, bientôt" + "oui, ouvrir aux candidatures externes"). Réutilise les
// mêmes 19 postes que l'organigramme interne (lib/org-roles.ts, seule
// source de vérité) et le même statut de recrutement (org_role_status) pour
// ne jamais afficher "à pourvoir" côté public sur un poste déjà pourvu côté
// admin. Aucune session possible ici (visiteur anonyme) : lecture des
// statuts et écriture de la candidature passent par le client admin,
// jamais par une policy RLS publique (voir app/carrieres/actions.ts).
export default async function CarrieresPage() {
  const ownerId = await getPlatformOwnerId();

  const statuses: Record<string, RoleStatus> = {};
  if (ownerId) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("org_role_status")
      .select("role_key, status")
      .eq("owner_id", ownerId);
    for (const row of data ?? []) {
      statuses[row.role_key as string] = row.status as RoleStatus;
    }
  }

  return (
    <div className="page-transition" style={{ padding: "32px 20px 100px", maxWidth: 640, margin: "0 auto" }}>
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 hover:text-[#F5EDED]/60 transition-colors mb-6"
      >
        <ChevronLeft size={11} /> Accueil
      </Link>

      <div className="flex justify-center mb-5">
        <EPLogo size="md" showCoaching />
      </div>

      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#E01E1E] mb-3">
          <Briefcase size={12} /> On recrute
        </div>
        <h1 className="text-2xl font-black text-white uppercase tracking-tight mb-2">
          Rejoins l&apos;équipe EP Coaching
        </h1>
        <p className="text-sm text-[#F5EDED]/45 leading-relaxed max-w-md mx-auto">
          Coaching, sales, contenu, produit, opérations : voici tous les postes ouverts en ce
          moment. Postule directement, on te recontacte par email.
        </p>
      </div>

      {/* Retour direct 2026-09-02 : "ya toujours pas les salaires
          affichés, corrige et mets les". La rémunération est maintenant
          affichée sur chaque poste plus bas ; ce bloc pose le cadre commun
          avant d'y arriver, pour que personne ne découvre le modèle
          collaboration indépendante seulement en scrollant. */}
      <div
        className="rounded-xl px-4 py-3.5 mb-6 text-center"
        style={{ background: "rgba(217,169,78,0.06)", border: "1px solid rgba(217,169,78,0.18)" }}
      >
        <p className="text-[11.5px] text-[#F5EDED]/60 leading-relaxed">
          Tous les postes sont des collaborations indépendantes (freelance), pas des CDI.
          Rémunération variable dès le premier jour sur ce que le poste influence vraiment,
          un fixe s&apos;ajoute une fois un vrai chiffre d&apos;affaires récurrent en place.
          Le détail est affiché sur chaque poste ci-dessous.
        </p>
      </div>

      {/* Retour direct 2026-08-17 : la page listait les postes sans jamais
          vendre l'opportunité, "jamais de la vie il voit ça il va
          postuler". Trois points concrets et vérifiables (pas de chiffre
          d'effectif ou d'avantage inventé), avant la liste des postes. */}
      <div className="grid sm:grid-cols-3 gap-3 mb-8">
        {[
          {
            icon: GraduationCap,
            title: "Formation avant embauche",
            desc: "Tu apprends sur du contenu réel de l'entreprise avant d'être jugé sur des résultats, pas jeté dans le vide.",
          },
          {
            icon: Rocket,
            title: "Une équipe qui se construit maintenant",
            desc: "Tu arrives tôt : ton poste se façonne avec toi, pas une fiche figée écrite par quelqu'un d'autre il y a 5 ans.",
          },
          {
            icon: MessageCircle,
            title: "Accès direct au fondateur",
            desc: "Équipe encore petite, pas de hiérarchie à traverser pour être entendu ou pour progresser vite.",
          },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="bg-[#150000] border border-[#890404]/20 rounded-xl p-4">
            <Icon size={16} className="text-[#E01E1E] mb-2" />
            <p className="text-[12px] font-bold text-white mb-1">{title}</p>
            <p className="text-[11px] text-[#F5EDED]/40 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      <CareersClient poles={POLES} statuses={statuses} />
    </div>
  );
}
