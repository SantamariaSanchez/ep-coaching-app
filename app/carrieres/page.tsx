import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, Check, Users, MessageCircle, ShieldCheck, ArrowRight } from "lucide-react";
import { EPLogo } from "@/components/ui/EPLogo";
import { POLES } from "@/lib/org-roles";
import { getPlatformOwnerId } from "@/lib/job-applications";
import { createAdminClient } from "@/lib/supabase-admin";
import type { RoleStatus } from "@/components/ui/OrganisationView";
import CareersClient from "@/components/careers/CareersClient";

const TITLE = "Coachs, accès gratuit | EP Coaching";
const DESCRIPTION = "Coachs : l'appli EP Coaching complète, gratuite, pour suivre tous tes clients. En échange, tes retours.";

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

      {/* Décision du fondateur 2026-10-09 : 0 € de CA, pas de recrutement
          salarié pour l'instant (les rémunérations ne sont pas assez
          avantageuses). La page pousse l'accès gratuit coach : appli
          gratuite, clients illimités, en échange de retours. Les postes
          restent consultables plus bas, repliés. */}
      <div className="text-center mb-7">
        <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#E01E1E] mb-3">
          <Users size={12} /> Coachs : accès gratuit
        </div>
        <h1 className="text-2xl font-black text-white uppercase tracking-tight mb-3">
          Coachs : l&apos;appli complète, gratuite, pour tous tes clients
        </h1>
        <p className="ep-tagline mb-3">Tu gagnes un outil. On gagne tes retours.</p>
        <p className="text-sm text-[#F5EDED]/50 leading-relaxed max-w-md mx-auto">
          On ne recrute pas pour l&apos;instant. On cherche des coachs qui suivent leurs propres
          clients dans EP Coaching et qui nous disent ce qui marche et ce qui coince.
        </p>
      </div>

      <Link
        href="/auth/coach"
        className="ep-btn-primary flex items-center justify-center gap-2 mb-8"
        style={{ textDecoration: "none" }}
      >
        Créer mon compte coach gratuit <ArrowRight size={15} />
      </Link>

      <div className="bg-[#150000] border border-[#890404]/25 rounded-2xl p-5 mb-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#E01E1E] mb-3">Ce que tu as, gratuitement</p>
        <ul className="space-y-2.5">
          {[
            "Clients illimités, et ils restent les tiens, jamais visibles par un autre coach",
            "Programmes, diètes au gramme près, carnet d'entraînement",
            "Bilans, check-ins, photos et mesures de tes clients au même endroit",
            "Messagerie, agenda avec rappels, lives",
            "Plus de 1000 guides gratuits à envoyer à tes clients",
            "Ton espace business : scripts de contenu, stats de tes réseaux",
          ].map((item) => (
            <li key={item} className="flex gap-2.5 text-[13px] text-[#F5EDED]/80 leading-snug">
              <Check size={15} className="text-[#4ade80] shrink-0 mt-0.5" /> {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="grid sm:grid-cols-2 gap-3 mb-8">
        <div className="bg-[#150000] border border-[#890404]/20 rounded-xl p-4">
          <MessageCircle size={16} className="text-[#E01E1E] mb-2" />
          <p className="text-[12px] font-bold text-white mb-1">Ce qu&apos;on te demande</p>
          <p className="text-[11.5px] text-[#F5EDED]/45 leading-relaxed">
            Utiliser l&apos;appli avec tes vrais clients, et nous dire franchement ce qui te fait gagner du temps et ce qui te gêne. Un message suffit.
          </p>
        </div>
        <div className="bg-[#150000] border border-[#890404]/20 rounded-xl p-4">
          <ShieldCheck size={16} className="text-[#E01E1E] mb-2" />
          <p className="text-[12px] font-bold text-white mb-1">Le pire scénario</p>
          <p className="text-[11.5px] text-[#F5EDED]/45 leading-relaxed">
            Tu testes, ça ne te convient pas, tu arrêtes. Tu as perdu zéro euro. Sans engagement, sans carte bancaire.
          </p>
        </div>
      </div>

      <details className="group bg-[#0f0000] border border-[#890404]/15 rounded-xl px-4 py-3">
        <summary className="cursor-pointer list-none text-[12px] font-bold text-[#F5EDED]/55 flex items-center justify-between">
          Les postes de l&apos;équipe (recrutement en pause)
          <span className="text-[#F5EDED]/30 group-open:rotate-90 transition-transform">›</span>
        </summary>
        <p className="text-[11.5px] text-[#F5EDED]/40 leading-relaxed mt-3 mb-4">
          Tous les postes sont des collaborations indépendantes, rémunérées à la performance. Tu peux candidater, mais on recrutera vraiment une fois un chiffre d&apos;affaires récurrent en place.
        </p>
      <CareersClient poles={POLES} statuses={statuses} />
      </details>
    </div>
  );
}
