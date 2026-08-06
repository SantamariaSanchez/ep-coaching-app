import { redirect } from "next/navigation";
import Link from "next/link";
import { Users } from "lucide-react";
import { getUser, getProfile, getClients } from "@/utils/auth";
import { getCoachProgramTemplates } from "@/utils/program-templates";
import { getCoachDietTemplates } from "@/utils/diet-templates";
import { getCoachRoadmapTemplates } from "@/utils/roadmap-templates";
import { getAllFoods } from "@/utils/nutrition";
import ProgrammationHub from "@/components/ui/ProgrammationHub";
import { deleteProgramTemplate, applyProgramTemplate } from "./programmes/actions";
import { createDietTemplateAction, deleteDietTemplate, applyDietTemplate } from "./diet/actions";
import { deleteRoadmapTemplate, applyRoadmapTemplate } from "./roadmap/actions";

export default async function ProgrammationPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "client") redirect("/dashboard/client");

  const [programTemplates, dietTemplates, roadmapTemplates, foods, clients] = await Promise.all([
    getCoachProgramTemplates(user.id),
    getCoachDietTemplates(user.id),
    getCoachRoadmapTemplates(user.id),
    getAllFoods(),
    getClients(user.id),
  ]);

  return (
    <div className="px-6 py-8 ep-page-wide page-transition">
      <div className="mb-8">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Programmation
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">Bibliothèque de modèles</h1>
        <p className="mt-1 text-xs text-[#F5EDED]/30 max-w-2xl">
          Le stock de points de départ réutilisables : modèles de programme, de diète et de road map,
          indépendants de tout client. La conception au cas par cas, elle, se fait directement dans la fiche
          du client, où ces modèles sont proposés en point de départ et personnalisables à la volée.
        </p>
        <Link
          href="/dashboard/coach/clients"
          className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#E01E1E] hover:text-[#ff4444] transition-colors"
        >
          <Users size={12} />
          Aller travailler sur un client
        </Link>
      </div>

      <ProgrammationHub
        programTemplates={programTemplates}
        dietTemplates={dietTemplates}
        roadmapTemplates={roadmapTemplates}
        foods={foods}
        clients={clients.map((c) => ({ id: c.id, full_name: c.full_name }))}
        deleteProgramTemplate={deleteProgramTemplate}
        applyProgramTemplate={applyProgramTemplate}
        createDietTemplate={createDietTemplateAction}
        deleteDietTemplate={deleteDietTemplate}
        applyDietTemplate={applyDietTemplate}
        deleteRoadmapTemplate={deleteRoadmapTemplate}
        applyRoadmapTemplate={applyRoadmapTemplate}
      />
    </div>
  );
}
