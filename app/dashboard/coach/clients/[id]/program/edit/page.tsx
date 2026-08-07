import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getUser, getProfile, getClientById } from "@/utils/auth";
import { getActiveProgram } from "@/utils/programs";
import { getClientIntake } from "@/utils/client-intake";
import { findGymEquipmentNotes } from "@/utils/gyms";
import { getCoachProgramTemplates } from "@/utils/program-templates";
import { getScheduleBlocks } from "@/utils/agenda";
import { getClientRoadmap } from "@/utils/roadmap";
import { saveProgram, saveCurrentProgramAsTemplate } from "../actions";
import ProgramEditor from "@/components/ui/ProgramEditor";
import ClientReferenceCard from "@/components/ui/ClientReferenceCard";
import { ChevronLeft } from "lucide-react";

export default async function EditProgramPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getUser();
  if (!user) redirect("/");

  const [profile, client, program, intake, templates, scheduleBlocks, roadmap] = await Promise.all([
    getProfile(user.id),
    getClientById(id, user.id),
    // includeCoachNotes : page réservée au coach, la note privée de conception
    // du programme n'est chargée que sur ce chemin.
    getActiveProgram(id, { includeCoachNotes: true }),
    getClientIntake(id),
    getCoachProgramTemplates(user.id),
    getScheduleBlocks(id),
    getClientRoadmap(id),
  ]);

  if (profile?.role === "client") redirect("/dashboard/client");
  if (!client) notFound();

  const gymEquipmentNotes = await findGymEquipmentNotes(intake?.gym_name ?? null);

  return (
    <div className="px-6 py-8 ep-page-wide page-transition">
      <Link
        href={`/dashboard/coach/clients/${id}/program`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#F5EDED]/40 hover:text-[#F5EDED]/70 transition-colors mb-6"
      >
        <ChevronLeft size={14} />
        Retour au programme
      </Link>

      <div className="mb-8">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          {program ? "Concevoir le programme" : "Nouveau programme"}
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">
          {client.full_name}
        </h1>
        <p className="mt-1 text-xs text-[#F5EDED]/30 max-w-2xl">
          Structure d&apos;abord (split, fréquence, objectif de phase), exercices ensuite. Tout ce que tu
          construis ici est le programme réel de ce client, pas un modèle.
        </p>
      </div>

      <ClientReferenceCard intake={intake} gymEquipmentNotes={gymEquipmentNotes} />

      <ProgramEditor
        clientId={id}
        program={program}
        saveProgram={saveProgram}
        intake={intake}
        templates={templates}
        saveAsTemplate={saveCurrentProgramAsTemplate}
        templatesHref="/dashboard/coach/programmation"
        subjectLabel={client.full_name ?? "ce client"}
        scheduleBlocks={scheduleBlocks}
        roadmap={roadmap}
        roadmapHref={`/dashboard/coach/clients/${id}/roadmap`}
      />
    </div>
  );
}
