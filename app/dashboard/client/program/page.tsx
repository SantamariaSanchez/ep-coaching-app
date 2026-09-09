import { redirect } from "next/navigation";
import { getUser, getProfile, isSubscribed } from "@/utils/auth";
import { getActiveProgram } from "@/utils/programs";
import { getClientCorrections } from "@/utils/corrections";
import { getRecentWorkoutLogs } from "@/utils/workout-logs";
import { getSessionsThisWeekCount } from "@/utils/sessions";
import ClientCorrectionsSection from "@/components/ui/ClientCorrectionsSection";
import ProgramPresetSelector from "@/components/ui/ProgramPresetSelector";
import ProgramFromScratchSection from "@/components/ui/ProgramFromScratchSection";
import VolumeIntensitySection from "@/components/ui/VolumeIntensitySection";
import ProgramDaysGrid from "@/components/ui/ProgramDaysGrid";
import CollapsibleSection from "@/components/ui/CollapsibleSection";
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

  // Espace gratuit — programmes prédéfinis au choix, ou création d'un
  // programme sur mesure de zéro via ProgramFromScratchSection.
  if (!isSubscribed(profile)) {
    return (
      <div className="px-6 py-8 max-w-4xl mx-auto pb-24 md:pb-8 page-transition">
        <div className="mb-6">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
            Training
          </p>
          <h1 className="text-3xl font-black uppercase tracking-tight">Mon programme</h1>
        </div>

        {/* Retour direct 2026-09-09 : "dans programme je veux les séances en
            haut et le reste en bas" — les jours réels d'abord (repliés par
            défaut, voir ProgramDaysGrid), les stats volume/intensité après.
            ProgramDaysGrid (déjà utilisé ailleurs) remplace la grille
            dupliquée à la main ici, qui n'affichait jamais les accessoires
            "à prévoir" contrairement aux autres pages de programme. */}
        {program && program.days.length > 0 && (
          <>
            <div className="mb-6">
              <ProgramDaysGrid program={program} />
            </div>
            <VolumeIntensitySection program={program} workoutLogs={workoutLogs} sessionsThisWeek={sessionsThisWeek} />
          </>
        )}

        {/* Retour direct 2026-09-01 : "dans programme c'est encore tout la
            création alors que la prog est déjà créée, faut montrer la prog
            quoi" — la création/changement de programme reste disponible,
            mais repliée par défaut dès qu'un programme existe déjà. Ouverte
            d'office seulement s'il n'y a encore rien à montrer. */}
        <div className="border-t border-[#890404]/15 pt-6">
          <CollapsibleSection
            title={program && program.days.length > 0 ? "Changer de programme" : "Créer mon programme"}
            defaultOpen={!program || program.days.length === 0}
          >
            <ProgramPresetSelector
              clientId={user.id}
              currentProgramName={program?.name ?? null}
              saveProgram={saveOwnProgram}
            />
            <ProgramFromScratchSection
              clientId={user.id}
              program={program}
              saveProgram={saveOwnProgram}
            />
          </CollapsibleSection>
        </div>
      </div>
    );
  }

  return (
    <div className="page-transition" style={{ padding: "32px 20px 100px", maxWidth: 900, margin: "0 auto" }}>

      {/* Header */}
      <div className="animate-fade-up" style={{ marginBottom: 28 }}>
        <p className="ep-section-title" style={{ marginBottom: 4 }}>Entraînement</p>
        <h1 className="ep-h1">
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

      {/* Retour direct 2026-09-09 : "dans programme je veux les séances en
          haut et le reste en bas" — séances réelles d'abord (repliées par
          défaut, voir ProgramDaysGrid), stats volume/intensité après.
          ProgramDaysGrid remplace la grille dupliquée à la main ici, qui
          n'affichait jamais les accessoires "à prévoir". */}
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
        <>
          <div style={{ marginBottom: 24 }}>
            <ProgramDaysGrid program={program} />
          </div>
          <VolumeIntensitySection program={program} workoutLogs={workoutLogs} sessionsThisWeek={sessionsThisWeek} />
        </>
      )}

      {/* Corrections & Questions */}
      <ClientCorrectionsSection corrections={corrections} />
    </div>
  );
}
