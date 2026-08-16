import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, Briefcase } from "lucide-react";
import { EPLogo } from "@/components/ui/EPLogo";
import { POLES } from "@/lib/org-roles";
import { getPlatformOwnerId } from "@/lib/job-applications";
import { createAdminClient } from "@/lib/supabase-admin";
import type { RoleStatus } from "@/components/ui/OrganisationView";
import CareersClient from "@/components/careers/CareersClient";

export const metadata: Metadata = {
  title: "Carrières | EP Coaching",
  description: "Rejoins l'équipe EP Coaching : coaching, sales, marketing, produit, opérations.",
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

      <CareersClient poles={POLES} statuses={statuses} />
    </div>
  );
}
