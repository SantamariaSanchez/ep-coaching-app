import { getT } from "@/lib/i18n-server";
export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";
import { getActiveProgram } from "@/utils/programs";
import { getCoachProgramTemplates } from "@/utils/program-templates";
import { getRecentWorkoutLogs } from "@/utils/workout-logs";
import { getSessionsThisWeekCount } from "@/utils/sessions";
import { getScheduleBlocks } from "@/utils/agenda";
import { saveCurrentProgramAsTemplate } from "@/app/dashboard/coach/clients/[id]/program/actions";
import ProgramBuilder from "@/components/program-builder/ProgramBuilder";
import VolumeIntensitySection from "@/components/ui/VolumeIntensitySection";
import ProgramWeekView from "@/components/ui/ProgramWeekView";
import CollapsibleSection from "@/components/ui/CollapsibleSection";
import { getProgramWeekContext } from "@/utils/program-week";
import { saveOwnCoachProgram } from "./actions";

export default async function CoachMonProgrammePage() {
  const t = await getT();
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/coach");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "coach") redirect("/dashboard/client");

  const [program, workoutLogs, sessionsThisWeek, templates, scheduleBlocks] = await Promise.all([
    // Le coach est ici sur son propre programme : ses notes de conception
    // sont les siennes, aucune raison de les masquer.
    getActiveProgram(user.id, { includeCoachNotes: true }),
    getRecentWorkoutLogs(user.id),
    getSessionsThisWeekCount(user.id),
    getCoachProgramTemplates(user.id),
    getScheduleBlocks(user.id),
  ]);
  const weekCtx = program && program.days.length > 0 ? await getProgramWeekContext(user.id, program) : null;

  return (
    <div className="px-4 pt-5 max-w-2xl mx-auto pb-24 md:pb-8 page-transition">
      {/* Refonte 2026-10-20 (retour direct : « qu'on voie bien le jour,
          l'heure, les accessoires, quelle salle et quels exos ») : même vue
          que le client, voir components/ui/ProgramWeekView. Séances d'abord,
          stats volume/intensité après, édition repliée en bas. */}
      {program && weekCtx ? (
        <>
          <ProgramWeekView
            program={program}
            ctx={weekCtx}
            sessionBasePath="/dashboard/coach/moi/logbook"
            gymsHref="/dashboard/coach/gyms"
            agendaHref="/dashboard/coach/moi/agenda"
            eyebrow={t("Mon entraînement")}
          />
          <div className="mt-4">
            <VolumeIntensitySection program={program} workoutLogs={workoutLogs} sessionsThisWeek={sessionsThisWeek} />
          </div>
        </>
      ) : (
        <div className="mb-6">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-(--ep-ink)/35 mb-1">
            {t("Mon entraînement")}
          </p>
          <h1 className="text-3xl font-black uppercase tracking-tight">{t("Mon programme")}</h1>
        </div>
      )}

      <div style={{ marginTop: program && program.days.length > 0 ? 24 : 0 }}>
        <CollapsibleSection
          title={program && program.days.length > 0 ? t("Modifier mon programme") : t("Créer mon programme")}
          defaultOpen={!program || program.days.length === 0}
        >
          <ProgramBuilder
            mode="self"
            clientId={user.id}
            clientName="moi"
            program={program}
            saveProgram={saveOwnCoachProgram}
            templates={templates}
            saveAsTemplate={saveCurrentProgramAsTemplate}
            scheduleBlocks={scheduleBlocks}
            backHref="/dashboard/coach/moi/programme"
            programHref="/dashboard/coach/moi/programme"
          />
        </CollapsibleSection>
      </div>
    </div>
  );
}
