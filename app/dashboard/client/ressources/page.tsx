import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { getResources } from "@/utils/resources";
import { getResourceRequests } from "@/utils/resource-requests";
import { getAllLeadMagnets } from "@/lib/lead-magnets";
import ResourcesBrowser from "@/components/resources/ResourcesBrowser";
import ResourceRequests from "@/components/resources/ResourceRequests";
import LeadMagnetsExplorer from "@/components/ressources/LeadMagnetsExplorer";
import { createResourceRequest, respondToResourceRequest, deleteResourceRequest } from "./request-actions";

export default async function ClientRessourcesPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "coach") redirect("/dashboard/coach/ressources");

  const [resources, requests, leadMagnets] = await Promise.all([
    getResources(profile?.coach_id ?? ""),
    getResourceRequests(profile?.coach_id ?? ""),
    getAllLeadMagnets(),
  ]);

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto pb-24 md:pb-8 page-transition">
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Contenu
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">Ressources</h1>
      </div>

      {/* Guides/checklists/quiz déjà accessibles publiquement sur /ressources,
          mais invisibles ici jusque là — un client connecté ne devrait pas
          avoir à quitter l'appli pour les trouver. isCoach volontairement
          absent (donc false) : les codes CTA reels sont un outil coach, pas
          une information utile pour un client. */}
      <LeadMagnetsExplorer magnets={leadMagnets} />

      <ResourcesBrowser resources={resources} />

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
