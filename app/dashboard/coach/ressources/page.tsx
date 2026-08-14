import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { getResources } from "@/utils/resources";
import { getResourceRequests } from "@/utils/resource-requests";
import { getAllLeadMagnets } from "@/lib/lead-magnets";
import ResourceManager from "@/components/resources/ResourceManager";
import ResourceRequests from "@/components/resources/ResourceRequests";
import LeadMagnetsExplorer from "@/components/ressources/LeadMagnetsExplorer";
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

  const [resources, requests, leadMagnets] = await Promise.all([
    getResources(user.id),
    getResourceRequests(user.id),
    getAllLeadMagnets(),
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

      <ResourceManager resources={resources} />

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
