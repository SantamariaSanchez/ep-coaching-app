import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { getResourceRequests } from "@/utils/resource-requests";
import { getAllLeadMagnets, getCoachLeadMagnets } from "@/lib/lead-magnets";
import ResourceRequests from "@/components/resources/ResourceRequests";
import LeadMagnetsExplorer from "@/components/ressources/LeadMagnetsExplorer";
import CoachLeadMagnetManager from "@/components/coach/CoachLeadMagnetManager";
import {
  createResourceRequest,
  respondToResourceRequest,
  deleteResourceRequest,
} from "@/app/dashboard/client/ressources/request-actions";

export default async function CoachRessourcesPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "client") redirect("/dashboard/client/ressources");

  // "Mes lead magnets" n'a de sens que pour un coach TIERS : le fondateur de
  // la plateforme n'en a pas besoin, ses lead magnets à lui sont déjà le
  // catalogue officiel des 1000 produit par la routine cloud (retour direct
  // 2026-09-02 : "moi mes leadmagnet c'est les 1000, donc enlève"). Un futur
  // coach tiers, qui n'a aucun accès au catalogue officiel, en a besoin.
  const isPlatformOwner = profile?.is_platform_owner ?? false;

  const [requests, leadMagnets, ownLeadMagnets] = await Promise.all([
    getResourceRequests(user.id),
    getAllLeadMagnets(),
    isPlatformOwner ? Promise.resolve([]) : getCoachLeadMagnets(user.id),
  ]);

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto pb-24 md:pb-8 page-transition">
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Contenu
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">Ressources</h1>
        <p className="text-sm text-[#F5EDED]/45 mt-2">
          Visibles par tous les clients, gratuits et payants.
        </p>
      </div>

      {/* Les guides/checklists/quiz publics de /ressources, aussi accessibles
          depuis le dashboard : utile au coach pour se rappeler ce qui existe
          déjà, le recommander à un client, et retrouver le code CTA reels
          d'un lead magnet précis (isCoach=true, voir LeadMagnetsExplorer). */}
      <LeadMagnetsExplorer magnets={leadMagnets} isCoach />

      {!isPlatformOwner && <CoachLeadMagnetManager ownMagnets={ownLeadMagnets} />}

      <div className="mt-8 pt-6 border-t border-[#890404]/15">
        <ResourceRequests
          initialRequests={requests}
          isCoach={true}
          createRequest={createResourceRequest}
          respondToRequest={respondToResourceRequest}
          deleteRequest={deleteResourceRequest}
        />
      </div>
    </div>
  );
}
