export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";
import { getActiveProgram } from "@/utils/programs";
import TrainingSubNav from "@/components/ui/TrainingSubNav";
import ProgramEditor from "@/components/ui/ProgramEditor";
import { saveOwnCoachProgram } from "./actions";

export default async function CoachMonProgrammePage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/coach");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "coach") redirect("/dashboard/client");

  const program = await getActiveProgram(user.id);

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto pb-24 md:pb-8 page-transition">
      <TrainingSubNav scope="coach-moi" />

      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Mon entraînement
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">Mon programme</h1>
      </div>

      <ProgramEditor
        clientId={user.id}
        program={program}
        saveProgram={saveOwnCoachProgram}
        successRedirect="/dashboard/coach/moi/programme"
      />
    </div>
  );
}
