import { redirect } from "next/navigation";
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
    <div className="px-6 py-8 max-w-6xl mx-auto page-transition">
      <div className="mb-8">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Espace de conception
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">Programmation</h1>
        <p className="mt-1 text-xs text-[#F5EDED]/30 max-w-2xl">
          Conçois des modèles de programme, de diète et de road map réutilisables, indépendants de tout
          client, puis applique les en quelques clics à un ou plusieurs clients.
        </p>
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
