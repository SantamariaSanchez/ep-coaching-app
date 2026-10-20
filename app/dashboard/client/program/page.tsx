import { getT } from "@/lib/i18n-server";
import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { getAccessType } from "@/utils/auth-client";
import { getActiveProgram } from "@/utils/programs";
import { getClientCorrections } from "@/utils/corrections";
import { getRecentWorkoutLogs } from "@/utils/workout-logs";
import { getSessionsThisWeekCount } from "@/utils/sessions";
import ClientCorrectionsSection from "@/components/ui/ClientCorrectionsSection";
import ProgramPresetSelector from "@/components/ui/ProgramPresetSelector";
import ProgramFromScratchSection from "@/components/ui/ProgramFromScratchSection";
import VolumeIntensitySection from "@/components/ui/VolumeIntensitySection";
import ProgramWeekView from "@/components/ui/ProgramWeekView";
import { getProgramWeekContext } from "@/utils/program-week";
import CollapsibleSection from "@/components/ui/CollapsibleSection";
import { getMemberPreferences } from "@/utils/member-preferences";
import { recommendPreset } from "@/lib/preset-programs";
import { saveOwnProgram } from "./actions";
import Link from "next/link";
import { Dumbbell, Play, MessageCircle } from "lucide-react";

const SESSION_BASE_PATH = "/dashboard/client/logbook";

export default async function ClientProgramPage() {
  const t = await getT();
  const user = await getUser();
  if (!user) redirect("/");

  const [profile, program, corrections, workoutLogs, sessionsThisWeek] = await Promise.all([
    getProfile(user.id),
    getActiveProgram(user.id),
    getClientCorrections(user.id),
    getRecentWorkoutLogs(user.id),
    getSessionsThisWeekCount(user.id),
  ]);

  // Retombait sur le dashboard générique au lieu de son propre programme
  // (app/dashboard/coach/moi/programme existe déjà) — même trou trouvé sur
  // plusieurs pages client en auditant public/manifest.json.
  if (profile?.role === "coach") redirect("/dashboard/coach/moi/programme");

  const hasProgram = !!program && program.days.length > 0;
  // Salle, créneaux d'agenda, matériel, séances faites cette semaine.
  const weekCtx = hasProgram ? await getProgramWeekContext(user.id, program) : null;

  // Espace gratuit — programmes prédéfinis au choix, ou création d'un
  // programme sur mesure de zéro via ProgramFromScratchSection.
  // getAccessType() est la seule source de vérité du statut (voir
  // utils/auth-client.ts) : le coach est déjà redirigé juste au-dessus.
  if (getAccessType(profile) === "membre_gratuit") {
    // Programme conseillé d'après le quiz d'onboarding, mis en avant et
    // présélectionné dans la liste (voir recommendPreset).
    const recommendation = recommendPreset(await getMemberPreferences(user.id));
    return (
      <div className="px-4 pt-5 max-w-2xl mx-auto pb-24 md:pb-8 page-transition">
        {/* Refonte 2026-10-20 (retour direct : jour, heure, salle, matériel,
            exos, sans longueur inutile) : voir components/ui/ProgramWeekView.
            Les séances d'abord, les stats volume/intensité après. */}
        {program && weekCtx ? (
          <>
            <ProgramWeekView
              program={program}
              ctx={weekCtx}
              sessionBasePath={SESSION_BASE_PATH}
              gymsHref="/dashboard/client/gyms"
              agendaHref="/dashboard/client/agenda"
              eyebrow={t("Training")}
            />
            <div className="mt-4">
              <VolumeIntensitySection program={program} workoutLogs={workoutLogs} sessionsThisWeek={sessionsThisWeek} />
            </div>
          </>
        ) : (
          <div className="mb-6">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-(--ep-ink)/35 mb-1">
              {t("Training")}
            </p>
            <h1 className="text-3xl font-black uppercase tracking-tight">{t("Mon programme")}</h1>
          </div>
        )}

        {/* Retour direct 2026-09-01 : "dans programme c'est encore tout la
            création alors que la prog est déjà créée, faut montrer la prog
            quoi" — la création/changement de programme reste disponible,
            mais repliée par défaut dès qu'un programme existe déjà. Ouverte
            d'office seulement s'il n'y a encore rien à montrer. */}
        <div className="border-t border-(--ep-line)/15 pt-6">
          <CollapsibleSection
            title={hasProgram ? t("Changer de programme") : t("Créer mon programme")}
            defaultOpen={!hasProgram}
          >
            <ProgramPresetSelector
              clientId={user.id}
              currentProgramName={program?.name ?? null}
              saveProgram={saveOwnProgram}
              recommendation={recommendation}
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
    <div className="page-transition px-4 pt-5 pb-24 md:pb-8 max-w-2xl mx-auto">
      {(!program || !weekCtx) && (
        <div className="animate-fade-up" style={{ marginBottom: 28 }}>
          <p className="ep-section-title" style={{ marginBottom: 4 }}>{t("Entraînement")}</p>
          <h1 className="ep-h1">{t("Mon programme")}</h1>
        </div>
      )}

      {!program || !weekCtx ? (
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
            background: "rgba(var(--ep-line-rgb),0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <Dumbbell size={22} style={{ color: "rgba(var(--ep-ink-rgb),0.2)" }} strokeWidth={1.5} />
          </div>
          <p style={{ fontSize: 13, fontWeight: 600, color: "rgba(var(--ep-ink-rgb),0.35)", margin: 0 }}>
            {t("Aucun programme disponible")}
          </p>
          <p style={{ fontSize: 11, color: "rgba(var(--ep-ink-rgb),0.35)", margin: 0, maxWidth: 320, lineHeight: 1.5 }}>
            {t("Ton coach prépare ton programme. En attendant, tu peux déjà loguer une séance libre : tes charges seront gardées pour la suite.")}
          </p>
          {/* Cet écran était un cul-de-sac (aucune action possible) : les
              deux gestes utiles en attendant le programme, à un tap. */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 8 }}>
            <Link
              href={SESSION_BASE_PATH}
              className="inline-flex items-center gap-2 rounded-xl bg-(--ep-accent) hover:bg-(--ep-accent-2) text-(--ep-strong) text-[11px] font-bold uppercase tracking-widest px-4 py-2.5 transition-colors shadow-[0_0_18px_rgba(var(--ep-accent-rgb),0.25)]"
            >
              <Play size={12} fill="currentColor" />{" "}{t("Séance libre")}
            </Link>
            <Link
              href="/dashboard/client/messages"
              className="inline-flex items-center gap-2 rounded-xl border border-(--ep-line)/40 hover:border-(--ep-accent)/60 text-(--ep-ink)/80 text-[11px] font-bold uppercase tracking-widest px-4 py-2.5 transition-colors"
            >
              <MessageCircle size={12} />{" "}{t("Écrire à mon coach")}
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Refonte 2026-10-20 : semaine en un coup d'œil, séance du jour en
              avant (jour, heure, salle, matériel, exos), voir
              components/ui/ProgramWeekView. */}
          <ProgramWeekView
            program={program}
            ctx={weekCtx}
            sessionBasePath={SESSION_BASE_PATH}
            gymsHref="/dashboard/client/gyms"
            agendaHref="/dashboard/client/agenda"
            eyebrow={t("Entraînement")}
          />
          <div className="mt-4">
            <VolumeIntensitySection program={program} workoutLogs={workoutLogs} sessionsThisWeek={sessionsThisWeek} />
          </div>
        </>
      )}

      {/* Corrections & Questions */}
      <ClientCorrectionsSection corrections={corrections} />
    </div>
  );
}
