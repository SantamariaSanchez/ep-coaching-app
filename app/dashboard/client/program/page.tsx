import { redirect } from "next/navigation";
import { getUser, getProfile, isSubscribed } from "@/utils/auth";
import { getActiveProgram } from "@/utils/programs";
import { getClientCorrections } from "@/utils/corrections";
import { getRecentWorkoutLogs } from "@/utils/workout-logs";
import { getSessionsThisWeekCount } from "@/utils/sessions";
import ClientCorrectionsSection from "@/components/ui/ClientCorrectionsSection";
import TrainingSubNav from "@/components/ui/TrainingSubNav";
import ProgramPresetSelector from "@/components/ui/ProgramPresetSelector";
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

  // Espace gratuit — 3 programmes prédéfinis au choix, pas de création custom.
  if (!isSubscribed(profile)) {
    return (
      <div className="px-6 py-8 max-w-4xl mx-auto pb-24 md:pb-8 page-transition">
        <TrainingSubNav />
        <div className="mb-6">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
            Training
          </p>
          <h1 className="text-3xl font-black uppercase tracking-tight">Mon programme</h1>
        </div>

        {program && program.days.length > 0 && (
          <>
            <VolumeIntensitySection program={program} workoutLogs={workoutLogs} sessionsThisWeek={sessionsThisWeek} />

            <div className="mb-6 overflow-x-auto">
              <div style={{ display: "flex", gap: 12, minWidth: `${program.days.length * 280}px` }}>
                {program.days.map((day, di) => (
                  <div
                    key={day.id}
                    className="ep-card animate-fade-up"
                    style={{ flex: 1, minWidth: 260, padding: "18px 16px", animationDelay: `${di * 60}ms` }}
                  >
                    <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#E01E1E", marginBottom: 14, paddingBottom: 10, borderBottom: "1px solid rgba(224,30,30,0.1)" }}>
                      {day.day_label}
                    </p>
                    {day.exercises.length === 0 ? (
                      <p style={{ fontSize: 12, color: "rgba(245,237,237,0.22)", fontStyle: "italic" }}>Aucun exercice</p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {day.exercises.map((ex) => (
                          <div key={ex.id} style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(137,4,4,0.2)", borderRadius: 12, padding: "11px 14px" }}>
                            <p style={{ fontSize: 13, fontWeight: 700, color: "#F5EDED", margin: "0 0 6px" }}>{ex.name}</p>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px" }}>
                              {ex.sets != null && ex.reps && (
                                <span style={{ fontSize: 11, color: "rgba(245,237,237,0.5)", fontWeight: 600 }}>{ex.sets} x {ex.reps}</span>
                              )}
                              {ex.rir !== null && <span style={{ fontSize: 11, color: "rgba(245,237,237,0.4)" }}>RIR {ex.rir}</span>}
                              {ex.rest_seconds != null && ex.rest_seconds > 0 && (
                                <span style={{ fontSize: 11, color: "rgba(245,237,237,0.4)" }}>
                                  {ex.rest_seconds >= 60 ? `${Math.floor(ex.rest_seconds / 60)}min` : `${ex.rest_seconds}s`} repos
                                </span>
                              )}
                            </div>
                            {ex.notes && <p style={{ fontSize: 11, color: "rgba(245,237,237,0.3)", marginTop: 6, fontStyle: "italic" }}>{ex.notes}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="border-t border-[#890404]/15 pt-6">
          <ProgramPresetSelector
            clientId={user.id}
            currentProgramName={program?.name ?? null}
            saveProgram={saveOwnProgram}
          />
        </div>
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
          color: "#F5EDED", margin: 0, lineHeight: 1.05,
        }}>
          Mon programme
        </h1>
        {program && (
          <p style={{ marginTop: 6, fontSize: 12, color: "rgba(245,237,237,0.3)", fontWeight: 500 }}>
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
            background: "rgba(137,4,4,0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <Dumbbell size={22} style={{ color: "rgba(245,237,237,0.2)" }} strokeWidth={1.5} />
          </div>
          <p style={{ fontSize: 13, fontWeight: 600, color: "rgba(245,237,237,0.35)", margin: 0 }}>
            Aucun programme disponible
          </p>
          <p style={{ fontSize: 11, color: "rgba(245,237,237,0.2)", margin: 0 }}>
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
                  color: "#E01E1E",
                  marginBottom: 14,
                  paddingBottom: 10,
                  borderBottom: "1px solid rgba(224,30,30,0.1)",
                }}>
                  {day.day_label}
                </p>

                {day.exercises.length === 0 ? (
                  <p style={{ fontSize: 12, color: "rgba(245,237,237,0.22)", fontStyle: "italic" }}>
                    Aucun exercice
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {day.exercises.map((ex) => (
                      <div
                        key={ex.id}
                        style={{
                          background: "rgba(0,0,0,0.35)",
                          border: "1px solid rgba(137,4,4,0.2)",
                          borderRadius: 12,
                          padding: "11px 14px",
                        }}
                      >
                        <p style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#F5EDED",
                          margin: "0 0 6px",
                          lineHeight: 1.3,
                        }}>
                          {ex.name}
                        </p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px" }}>
                          {ex.sets != null && ex.reps && (
                            <span style={{ fontSize: 11, color: "rgba(245,237,237,0.5)", fontWeight: 600 }}>
                              {ex.sets} × {ex.reps}
                            </span>
                          )}
                          {ex.rir !== null && (
                            <span style={{ fontSize: 11, color: "rgba(245,237,237,0.4)" }}>
                              RIR {ex.rir}
                            </span>
                          )}
                          {ex.rest_seconds != null && ex.rest_seconds > 0 && (
                            <span style={{ fontSize: 11, color: "rgba(245,237,237,0.4)" }}>
                              {ex.rest_seconds >= 60
                                ? `${Math.floor(ex.rest_seconds / 60)}min`
                                : `${ex.rest_seconds}s`} repos
                            </span>
                          )}
                        </div>
                        {ex.notes && (
                          <p style={{
                            fontSize: 11,
                            color: "rgba(245,237,237,0.3)",
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
