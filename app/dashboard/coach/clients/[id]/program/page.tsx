import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getUser, getProfile, getClientById } from "@/utils/auth";
import { getActiveProgram } from "@/utils/programs";
import { getRecentWorkoutLogs } from "@/utils/workout-logs";
import { getSessionsThisWeekCount } from "@/utils/sessions";
import ClientProgramView from "@/components/ui/ClientProgramView";
import { ChevronLeft } from "lucide-react";

export default async function CoachClientProgramPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getUser();
  if (!user) redirect("/");

  const [profile, client, program, workoutLogs, sessionsThisWeek] = await Promise.all([
    getProfile(user.id),
    getClientById(id),
    getActiveProgram(id),
    getRecentWorkoutLogs(id),
    getSessionsThisWeekCount(id),
  ]);

  if (profile?.role === "client") redirect("/dashboard/client");
  if (!client) notFound();

  return (
    <div className="px-6 py-8 max-w-6xl mx-auto page-transition">
      <Link
        href={`/dashboard/coach/clients/${id}`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#F5EDED]/40 hover:text-[#F5EDED]/70 transition-colors mb-6"
      >
        <ChevronLeft size={14} />
        {client.full_name}
      </Link>

      <div className="mb-8">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Programme
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">
          {client.full_name}
        </h1>
        {program && (
          <p className="mt-1 text-xs text-[#F5EDED]/30">
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
      />
    </div>
  );
}
