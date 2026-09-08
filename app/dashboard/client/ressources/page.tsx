import { redirect } from "next/navigation";
import Link from "next/link";
import { Lock, ArrowRight } from "lucide-react";
import { getUser, getProfile } from "@/utils/auth";
import { getAccessType } from "@/utils/auth-client";
import { canBrowseLeadMagnetLibrary } from "@/lib/free-tier";
import { getResourceRequests } from "@/utils/resource-requests";
import { getAllLeadMagnets } from "@/lib/lead-magnets";
import ResourceRequests from "@/components/resources/ResourceRequests";
import LeadMagnetsExplorer from "@/components/ressources/LeadMagnetsExplorer";
import { createResourceRequest, respondToResourceRequest, deleteResourceRequest } from "./request-actions";

export default async function ClientRessourcesPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "coach") redirect("/dashboard/coach/ressources");

  const accessType = getAccessType(profile);
  const canBrowse = canBrowseLeadMagnetLibrary(accessType);

  // La bibliothèque complète n'est chargée que si elle est réellement affichée :
  // inutile de lire des centaines de lignes pour un membre gratuit qui verra
  // l'écran de blocage à la place.
  const [requests, leadMagnets] = await Promise.all([
    getResourceRequests(profile?.coach_id ?? ""),
    canBrowse ? getAllLeadMagnets() : Promise.resolve([]),
  ]);

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto pb-24 md:pb-8 page-transition">
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Contenu
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">Ressources</h1>
      </div>

      {canBrowse ? (
        /* Guides/checklists/quiz déjà accessibles publiquement sur /ressources,
           mais invisibles ici jusque là — un client accompagné ne devrait pas
           avoir à quitter l'appli pour les trouver. isCoach volontairement
           absent (donc false) : les codes CTA reels sont un outil coach, pas
           une information utile pour un client. */
        <LeadMagnetsExplorer magnets={leadMagnets} />
      ) : (
        /* Membre gratuit : la bibliothèque entière n'est pas parcourable dans
           l'appli (demande du 2026-09-08). Les guides continuent d'arriver par
           lien direct, envoyé au cas par cas — c'est ce qui leur redonne de la
           valeur au lieu d'un catalogue infini que personne ne lit. */
        <div className="bg-[#1f0101] border border-[#890404]/25 rounded-2xl p-6 text-center">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: "rgba(217,169,78,0.1)", border: "1px solid rgba(217,169,78,0.25)" }}
          >
            <Lock size={18} style={{ color: "var(--ep-gold)" }} />
          </div>
          <h2 className="text-lg font-black text-white mb-2">La bibliothèque est réservée aux clients accompagnés</h2>
          <p className="text-[12.5px] text-[#F5EDED]/50 leading-relaxed mb-5 max-w-sm mx-auto">
            Les guides que je t&apos;envoie restent accessibles par leur lien, et tu continueras à en
            recevoir. Le catalogue complet, lui, fait partie de l&apos;accompagnement : il est
            construit pour être utilisé avec un coach qui te dit lequel lire, et quand.
          </p>
          <Link
            href="/dashboard/client/abonnement"
            className="inline-flex items-center gap-1.5 bg-[#E01E1E] hover:bg-[#B00202] text-white text-[11px] font-bold uppercase tracking-widest px-4 py-2.5 rounded-lg transition-colors"
          >
            Voir l&apos;accompagnement <ArrowRight size={13} />
          </Link>
        </div>
      )}

      <div className="mt-8 pt-6 border-t border-[#890404]/15">
        <ResourceRequests
          initialRequests={requests}
          isCoach={false}
          createRequest={createResourceRequest}
          respondToRequest={respondToResourceRequest}
          deleteRequest={deleteResourceRequest}
        />
      </div>
    </div>
  );
}
