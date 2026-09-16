import { createAdminClient } from "@/lib/supabase-admin";

// Progression PAR COACH sur les guides Masterclass (contenu statique, voir
// lib/masterclass-guides.ts). Seule la case cochée par étape vit en base
// (migration 20260916d_masterclass_progress.sql), le contenu lui-même
// jamais — même séparation que lib/coach-personal-notes.ts vs
// lib/coach-document-templates.ts.

export interface CoachMasterclassProgressRow {
  guide_slug: string;
  step_index: number;
  completed_at: string;
}

// guide_slug -> liste des step_index cochés pour ce guide. Tableau plutôt
// qu'un Set : passé tel quel en prop à un composant client, un tableau
// simple évite toute question de sérialisation RSC.
export type MasterclassProgressMap = Record<string, number[]>;

export async function getCoachMasterclassProgress(coachId: string): Promise<MasterclassProgressMap> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("coach_masterclass_progress")
      .select("guide_slug, step_index")
      .eq("coach_id", coachId);

    const map: MasterclassProgressMap = {};
    for (const row of (data as { guide_slug: string; step_index: number }[]) ?? []) {
      if (!map[row.guide_slug]) map[row.guide_slug] = [];
      map[row.guide_slug].push(row.step_index);
    }
    return map;
  } catch {
    return {};
  }
}
