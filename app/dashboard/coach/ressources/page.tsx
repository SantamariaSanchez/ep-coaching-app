import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { getResources } from "@/utils/resources";
import ResourceManager from "@/components/resources/ResourceManager";

export default async function CoachRessourcesPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "client") redirect("/dashboard/client/ressources");

  const resources = await getResources();

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

      <ResourceManager resources={resources} />
    </div>
  );
}
