import { getT } from "@/lib/i18n-server";
import BackButton from "@/components/ui/BackButton";
import { redirect, notFound } from "next/navigation";
import { getUser, getProfile, getClientById } from "@/utils/auth";
import { getActiveProgram } from "@/utils/programs";
import { getClientIntake } from "@/utils/client-intake";
import { getMemberPreferences } from "@/utils/member-preferences";
import { levelFromExperience } from "@/lib/plan-generator";
import { getCoachProgramTemplates } from "@/utils/program-templates";
import { getScheduleBlocks } from "@/utils/agenda";
import { createAdminClient } from "@/lib/supabase-admin";
import { saveProgram, saveCurrentProgramAsTemplate } from "../actions";
import ProgramBuilder from "@/components/program-builder/ProgramBuilder";
import type { ContextPhotos } from "@/components/program-builder/ClientContextPanel";

// Espace de conception de programme (refonte 2026-10-13) : la fiche client à
// gauche, les séances en tableaux façon Google Sheets à droite, un seul
// bouton pour livrer. Objectif : un programme complet en 10 minutes.

const PHYSIQUE_LABELS: Record<string, string> = { face: "Face", profil: "Profil", dos: "Dos" };

async function signedPhotos(gymPaths: string[], physiquePaths: string[]): Promise<ContextPhotos> {
  const all = [...gymPaths, ...physiquePaths];
  if (all.length === 0) return { gym: [], physique: [] };
  try {
    const admin = createAdminClient();
    const { data } = await admin.storage.from("progress-photos").createSignedUrls(all, 60 * 60);
    const urlOf = new Map((data ?? []).filter((d) => d.signedUrl).map((d) => [d.path, d.signedUrl]));
    return {
      gym: gymPaths.map((p) => urlOf.get(p)).filter((u): u is string => !!u),
      physique: physiquePaths
        .map((p) => {
          const url = urlOf.get(p);
          const slot = p.match(/physique-(face|profil|dos)/)?.[1] ?? "";
          return url ? { label: PHYSIQUE_LABELS[slot] ?? "Photo", url } : null;
        })
        .filter((x): x is { label: string; url: string } => !!x),
    };
  } catch {
    return { gym: [], physique: [] };
  }
}

export default async function EditProgramPage({ params }: { params: Promise<{ id: string }> }) {
  const t = await getT();
  const { id } = await params;

  const user = await getUser();
  if (!user) redirect("/");

  const [profile, client, program, intake, templates, scheduleBlocks, preferences] = await Promise.all([
    getProfile(user.id),
    getClientById(id, user.id),
    // includeCoachNotes : page réservée au coach, la note privée de conception
    // du programme n'est chargée que sur ce chemin.
    getActiveProgram(id, { includeCoachNotes: true, raw: true }),
    getClientIntake(id),
    getCoachProgramTemplates(user.id),
    getScheduleBlocks(id),
    getMemberPreferences(id),
  ]);

  if (profile?.role === "client") redirect("/dashboard/client");
  if (!client) notFound();

  const photos = await signedPhotos(intake?.gym_photo_paths ?? [], intake?.physique_photo_paths ?? []);
  const clientName = client.full_name ?? t("Client");

  return (
    <div className="px-2.5 sm:px-5 py-4 sm:py-5 w-full max-w-[1500px] mx-auto page-transition">
      <div className="flex items-center gap-3 mb-4">
        <BackButton
          fallbackHref={`/dashboard/coach/clients/${id}/program`}
          label=""
          iconSize={18}
          className="p-1.5 -ml-1.5 rounded-lg text-(--ep-ink)/45 hover:text-(--ep-strong) hover:bg-(--ep-line)/25"
        />
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-(--ep-ink)/35">
            {program ? t("Modifier le programme") : t("Nouveau programme")}
          </p>
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight truncate">{clientName}</h1>
        </div>
      </div>

      <ProgramBuilder
        clientId={id}
        clientName={clientName}
        program={program}
        intake={intake}
        experienceLevel={levelFromExperience(preferences?.experience_level)}
        templates={templates}
        scheduleBlocks={scheduleBlocks}
        photos={photos}
        saveProgram={saveProgram}
        saveAsTemplate={saveCurrentProgramAsTemplate}
        backHref={`/dashboard/coach/clients/${id}/program`}
        programHref={`/dashboard/coach/clients/${id}/program`}
        clientHref={`/dashboard/coach/clients/${id}`}
      />
    </div>
  );
}
