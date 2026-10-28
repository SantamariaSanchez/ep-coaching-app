import { getT } from "@/lib/i18n-server";
import { getTrainingGyms } from "@/utils/training-gyms";
import BackButton from "@/components/ui/BackButton";
import { redirect, notFound } from "next/navigation";
import { getUser, getProfile, getClientById } from "@/utils/auth";
import { getActiveProgram } from "@/utils/programs";
import { getRecentWorkoutLogs } from "@/utils/workout-logs";
import { getSessionsThisWeekCount } from "@/utils/sessions";
import ClientProgramView from "@/components/ui/ClientProgramView";
import { getAccessoriesByExerciseName } from "@/utils/exercise-library";

export default async function CoachClientProgramPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = await getT();
  const { id } = await params;

  const user = await getUser();
  if (!user) redirect("/");

  const [profile, client, program, workoutLogs, sessionsThisWeek, accessoriesByName] = await Promise.all([
    getProfile(user.id),
    getClientById(id, user.id),
    getActiveProgram(id),
    getRecentWorkoutLogs(id),
    getSessionsThisWeekCount(id),
    getAccessoriesByExerciseName(),
  ]);

  if (profile?.role === "client") redirect("/dashboard/client");
  if (!client) notFound();

  return (
    <div className="px-6 py-8 max-w-6xl mx-auto page-transition">
      {/* Retour réel vers la fiche (même onglet), sinon la fiche sur l'onglet programme. */}
      <BackButton
        fallbackHref={`/dashboard/coach/clients/${id}?tab=programme`}
        expect={`/dashboard/coach/clients/${id}`}
        label={client.full_name ?? t("Client")}
        className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-(--ep-ink)/40 hover:text-(--ep-ink)/70 transition-colors mb-6"
      />

      <div className="mb-8">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-(--ep-ink)/35 mb-1">
          {t("Programme")}
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">
          {client.full_name}
        </h1>
        {program && (
          <p className="mt-1 text-xs text-(--ep-ink)/30">
            {program.name}
            {program.frequency ? ` · ${program.frequency}×/semaine` : ""}
            {program.type ? ` · ${program.type}` : ""}
          </p>
        )}
      </div>

      <ClientProgramView
        clientId={id}
        program={program}
        workoutLogs={workoutLogs}
        sessionsThisWeek={sessionsThisWeek}
        accessoriesByName={accessoriesByName}
        gyms={(await getTrainingGyms(id)).map((g) => ({ id: g.id, name: g.name, city: g.city }))}
      />
    </div>
  );
}
