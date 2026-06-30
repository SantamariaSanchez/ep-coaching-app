import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getUser, getProfile, getClientById } from "@/utils/auth";
import { getActiveProgram } from "@/utils/programs";
import { getClientCorrections } from "@/utils/corrections";
import { getRecentWorkoutLogs } from "@/utils/workout-logs";
import { getSessionsThisWeekCount } from "@/utils/sessions";
import CoachCorrectionsSection from "@/components/ui/CoachCorrectionsSection";
import VolumeIntensitySection from "@/components/ui/VolumeIntensitySection";
import { ChevronLeft, Pencil, Plus } from "lucide-react";

export default async function CoachClientProgramPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getUser();
  if (!user) redirect("/");

  const [profile, client, program, corrections, workoutLogs, sessionsThisWeek] = await Promise.all([
    getProfile(user.id),
    getClientById(id),
    getActiveProgram(id),
    getClientCorrections(id),
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

      <div className="flex items-start justify-between mb-8">
        <div>
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

        <Link
          href={`/dashboard/coach/clients/${id}/program/edit`}
          className="inline-flex items-center gap-2 bg-[#E01E1E] hover:bg-[#B00202] text-white text-xs font-bold uppercase tracking-widest px-4 py-2.5 rounded-lg transition-colors"
        >
          {program ? (
            <>
              <Pencil size={13} />
              Modifier
            </>
          ) : (
            <>
              <Plus size={13} />
              Créer un programme
            </>
          )}
        </Link>
      </div>

      {/* ── Volume & Intensité ─────────────────────────────────────────────── */}
      {program && program.days.length > 0 && (
        <VolumeIntensitySection program={program} workoutLogs={workoutLogs} sessionsThisWeek={sessionsThisWeek} />
      )}

      {!program || program.days.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-sm font-semibold text-[#F5EDED]/40 uppercase tracking-widest">
            Aucun programme actif
          </p>
          <p className="text-xs text-[#F5EDED]/25 mt-1">
            Crée le premier programme d&apos;entraînement pour ce client.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto pb-4">
          <div
            className="flex gap-4"
            style={{ minWidth: `${program.days.length * 280}px` }}
          >
            {program.days.map((day) => (
              <div
                key={day.id}
                className="flex-1 min-w-[260px] bg-[#1f0101] border border-[#890404]/40 rounded-xl p-4"
              >
                <p className="text-xs font-bold uppercase tracking-widest text-[#E01E1E] mb-4 pb-2 border-b border-[#890404]/20">
                  {day.day_label}
                </p>

                {day.exercises.length === 0 ? (
                  <p className="text-xs text-[#F5EDED]/25 italic">
                    Aucun exercice
                  </p>
                ) : (
                  <div className="space-y-2">
                    {day.exercises.map((ex) => (
                      <div
                        key={ex.id}
                        className="bg-[#150000] border border-[#890404]/20 rounded-lg px-3 py-2.5"
                      >
                        <p className="text-sm font-semibold text-white leading-tight">
                          {ex.name}
                        </p>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                          {ex.sets != null && ex.reps && (
                            <span className="text-[10px] text-[#F5EDED]/50">
                              {ex.sets} × {ex.reps}
                            </span>
                          )}
                          {ex.rir !== null && (
                            <span className="text-[10px] text-[#F5EDED]/50">
                              RIR {ex.rir}
                            </span>
                          )}
                          {ex.rest_seconds != null && ex.rest_seconds > 0 && (
                            <span className="text-[10px] text-[#F5EDED]/50">
                              {ex.rest_seconds >= 60
                                ? `${Math.floor(ex.rest_seconds / 60)}min`
                                : `${ex.rest_seconds}s`}{" "}
                              repos
                            </span>
                          )}
                        </div>
                        {ex.notes && (
                          <p className="text-[10px] text-[#F5EDED]/35 mt-1 italic">
                            {ex.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Corrections & Questions ─────────────────────────────────────────── */}
      <CoachCorrectionsSection corrections={corrections} clientId={id} />
    </div>
  );
}
