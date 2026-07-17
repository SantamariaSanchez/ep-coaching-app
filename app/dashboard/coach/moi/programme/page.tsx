export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";
import { getActiveProgram } from "@/utils/programs";
import { getRecentWorkoutLogs } from "@/utils/workout-logs";
import { getSessionsThisWeekCount } from "@/utils/sessions";
import ProgramEditor from "@/components/ui/ProgramEditor";
import VolumeIntensitySection from "@/components/ui/VolumeIntensitySection";
import { saveOwnCoachProgram } from "./actions";

export default async function CoachMonProgrammePage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/coach");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "coach") redirect("/dashboard/client");

  const [program, workoutLogs, sessionsThisWeek] = await Promise.all([
    getActiveProgram(user.id),
    getRecentWorkoutLogs(user.id),
    getSessionsThisWeekCount(user.id),
  ]);

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto pb-24 md:pb-8 page-transition">
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Mon entraînement
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">Mon programme</h1>
      </div>

      {program && program.days.length > 0 && (
        <VolumeIntensitySection program={program} workoutLogs={workoutLogs} sessionsThisWeek={sessionsThisWeek} />
      )}

      <ProgramEditor
        clientId={user.id}
        program={program}
        saveProgram={saveOwnCoachProgram}
        successRedirect="/dashboard/coach/moi/programme"
      />
    </div>
  );
}
