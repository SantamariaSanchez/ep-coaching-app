export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";
import { getActiveProgram } from "@/utils/programs";
import { getCoachProgramTemplates } from "@/utils/program-templates";
import { getRecentWorkoutLogs } from "@/utils/workout-logs";
import { getSessionsThisWeekCount } from "@/utils/sessions";
import { getScheduleBlocks } from "@/utils/agenda";
import { saveCurrentProgramAsTemplate } from "@/app/dashboard/coach/clients/[id]/program/actions";
import ProgramEditor from "@/components/ui/ProgramEditor";
import VolumeIntensitySection from "@/components/ui/VolumeIntensitySection";
import ProgramDaysGrid from "@/components/ui/ProgramDaysGrid";
import MesocycleStatusBanner from "@/components/ui/MesocycleStatusBanner";
import CollapsibleSection from "@/components/ui/CollapsibleSection";
import { getAccessoriesByExerciseName } from "@/utils/exercise-library";
import { saveOwnCoachProgram } from "./actions";

export default async function CoachMonProgrammePage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/coach");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "coach") redirect("/dashboard/client");

  const [program, workoutLogs, sessionsThisWeek, templates, scheduleBlocks, accessoriesByName] = await Promise.all([
    // Le coach est ici sur son propre programme : ses notes de conception
    // sont les siennes, aucune raison de les masquer.
    getActiveProgram(user.id, { includeCoachNotes: true }),
    getRecentWorkoutLogs(user.id),
    getSessionsThisWeekCount(user.id),
    getCoachProgramTemplates(user.id),
    getScheduleBlocks(user.id),
    getAccessoriesByExerciseName(),
  ]);

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto pb-24 md:pb-8 page-transition">
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Mon entraînement
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">Mon programme</h1>
      </div>

      {/* Retour direct 2026-09-02 : "en bas ya encore le truc pour créer la
          prog, or ma prog est déjà créée, donc direct ma prog bien visible
          en premier" — même schéma que app/dashboard/client/program/page.tsx
          (déjà corrigé le 2026-09-01) : programme réel d'abord, formulaire
          d'édition replié en dessous, ouvert par défaut seulement s'il n'y a
          encore rien à montrer. */}
      {/* Retour direct 2026-09-09 : "dans programme je veux les séances en
          haut et le reste en bas" — séances réelles d'abord (repliées par
          défaut, voir ProgramDaysGrid), stats volume/intensité après. */}
      {program && program.days.length > 0 && (
        <>
          <MesocycleStatusBanner startDate={program.mesocycle_start_date} weeks={program.mesocycle_weeks} />
          <div style={{ marginBottom: 24 }}>
            <ProgramDaysGrid program={program} accessoriesByName={accessoriesByName} />
          </div>
          <VolumeIntensitySection program={program} workoutLogs={workoutLogs} sessionsThisWeek={sessionsThisWeek} />
        </>
      )}

      <div style={{ marginTop: program && program.days.length > 0 ? 24 : 0 }}>
        <CollapsibleSection
          title={program && program.days.length > 0 ? "Modifier mon programme" : "Créer mon programme"}
          defaultOpen={!program || program.days.length === 0}
        >
          <ProgramEditor
            clientId={user.id}
            program={program}
            saveProgram={saveOwnCoachProgram}
            successRedirect="/dashboard/coach/moi/programme"
            templates={templates}
            saveAsTemplate={saveCurrentProgramAsTemplate}
            templatesHref="/dashboard/coach/programmation"
            subjectLabel="moi"
            scheduleBlocks={scheduleBlocks}
          />
        </CollapsibleSection>
      </div>
    </div>
  );
}
