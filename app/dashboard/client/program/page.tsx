import { redirect } from "next/navigation";
import { getUser, getProfile, isSubscribed } from "@/utils/auth";
import { getActiveProgram } from "@/utils/programs";
import { getClientCorrections } from "@/utils/corrections";
import { getRecentWorkoutLogs } from "@/utils/workout-logs";
import { getSessionsThisWeekCount } from "@/utils/sessions";
import ClientCorrectionsSection from "@/components/ui/ClientCorrectionsSection";
import TrainingSubNav from "@/components/ui/TrainingSubNav";
import ProgramBuilderTabs from "@/components/ui/ProgramBuilderTabs";
import VolumeIntensitySection from "@/components/ui/VolumeIntensitySection";
import { saveOwnProgram } from "./actions";
import { Dumbbell } from "lucide-react";

export default async function ClientProgramPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const [profile, program, corrections, workoutLogs, sessionsThisWeek] = await Promise.all([
    getProfile(user.id),
    getActiveProgram(user.id),
    getClientCorrections(user.id),
    getRecentWorkoutLogs(user.id),
    getSessionsThisWeekCount(user.id),
  ]);

  if (profile?.role === "coach") redirect("/dashboard/coach");

  // Free community members build and edit their own program — no coach review.
  if (!isSubscribed(profile)) {
    return (
      <div className="px-6 py-8 max-w-4xl mx-auto pb-24 md:pb-8 page-transition">
        <TrainingSubNav />
        <div className="mb-6">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-ep-light)]/35 mb-1">
            Entraînement — Communauté
          </p>
          <h1 className="text-3xl font-black uppercase tracking-tight">Mon programme</h1>
          <p className="text-sm text-[var(--color-ep-light)]/45 mt-2">
            Tu gères toi-même ton programme — autonome, sans suivi coach.
          </p>
        </div>
        {program && program.days.length > 0 && (
          <VolumeIntensitySection program={program} workoutLogs={workoutLogs} sessionsThisWeek={sessionsThisWeek} />
        )}
        <ProgramBuilderTabs
          clientId={user.id}
          program={program}
          saveProgram={saveOwnProgram}
          successRedirect="/dashboard/client/program"
        />
      </div>
    );
  }

  return (
    <div className="page-transition" style={{ padding: "32px 20px 100px", maxWidth: 900, margin: "0 auto" }}>

      <TrainingSubNav />

      {/* Header */}
      <div className="animate-fade-up" style={{ marginBottom: 28 }}>
        <p className="ep-section-title" style={{ marginBottom: 4 }}>Entraînement</p>
        <h1 style={{
          fontSize: 32, fontWeight: 900, letterSpacing: "-0.04em",
          color: "var(--color-ep-light)", margin: 0, lineHeight: 1.05,
        }}>
          Mon programme
        </h1>
        {program && (
          <p style={{ marginTop: 6, fontSize: 12, color: "rgba(var(--color-ep-light-rgb),0.3)", fontWeight: 500 }}>
            {program.name}
            {program.frequency ? ` · ${program.frequency}×/semaine` : ""}
            {program.type ? ` · ${program.type}` : ""}
          </p>
        )}
      </div>

      {program && program.days.length > 0 && (
        <VolumeIntensitySection program={program} workoutLogs={workoutLogs} sessionsThisWeek={sessionsThisWeek} />
      )}

      {!program || program.days.length === 0 ? (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px 20px",
          textAlign: "center",
          gap: 12,
        }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: 18,
            background: "rgba(var(--color-ep-dark-red-rgb),0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <Dumbbell size={22} style={{ color: "rgba(var(--color-ep-light-rgb),0.2)" }} strokeWidth={1.5} />
          </div>
          <p style={{ fontSize: 13, fontWeight: 600, color: "rgba(var(--color-ep-light-rgb),0.35)", margin: 0 }}>
            Aucun programme disponible
          </p>
          <p style={{ fontSize: 11, color: "rgba(var(--color-ep-light-rgb),0.2)", margin: 0 }}>
            Ton coach le créera prochainement.
          </p>
        </div>
      ) : (
        <div style={{ overflowX: "auto", paddingBottom: 8 }}>
          <div style={{
            display: "flex",
            gap: 12,
            minWidth: `${program.days.length * 280}px`,
          }}>
            {program.days.map((day, di) => (
              <div
                key={day.id}
                className="ep-card animate-fade-up"
                style={{
                  flex: 1,
                  minWidth: 260,
                  padding: "18px 16px",
                  animationDelay: `${di * 60}ms`,
                }}
              >
                <p style={{
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--color-ep-red)",
                  marginBottom: 14,
                  paddingBottom: 10,
                  borderBottom: "1px solid rgba(var(--color-ep-red-rgb),0.1)",
                }}>
                  {day.day_label}
                </p>

                {day.exercises.length === 0 ? (
                  <p style={{ fontSize: 12, color: "rgba(var(--color-ep-light-rgb),0.22)", fontStyle: "italic" }}>
                    Aucun exercice
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {day.exercises.map((ex) => (
                      <div
                        key={ex.id}
                        style={{
                          background: "rgba(0,0,0,0.35)",
                          border: "1px solid rgba(var(--color-ep-dark-red-rgb),0.2)",
                          borderRadius: 12,
                          padding: "11px 14px",
                        }}
                      >
                        <p style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: "var(--color-ep-light)",
                          margin: "0 0 6px",
                          lineHeight: 1.3,
                        }}>
                          {ex.name}
                        </p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px" }}>
                          {ex.sets != null && ex.reps && (
                            <span style={{ fontSize: 11, color: "rgba(var(--color-ep-light-rgb),0.5)", fontWeight: 600 }}>
                              {ex.sets} × {ex.reps}
                            </span>
                          )}
                          {ex.rir !== null && (
                            <span style={{ fontSize: 11, color: "rgba(var(--color-ep-light-rgb),0.4)" }}>
                              RIR {ex.rir}
                            </span>
                          )}
                          {ex.rest_seconds != null && ex.rest_seconds > 0 && (
                            <span style={{ fontSize: 11, color: "rgba(var(--color-ep-light-rgb),0.4)" }}>
                              {ex.rest_seconds >= 60
                                ? `${Math.floor(ex.rest_seconds / 60)}min`
                                : `${ex.rest_seconds}s`} repos
                            </span>
                          )}
                        </div>
                        {ex.notes && (
                          <p style={{
                            fontSize: 11,
                            color: "rgba(var(--color-ep-light-rgb),0.3)",
                            marginTop: 6,
                            fontStyle: "italic",
                            lineHeight: 1.4,
                          }}>
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

      {/* Corrections & Questions */}
      <ClientCorrectionsSection corrections={corrections} />
    </div>
  );
}
