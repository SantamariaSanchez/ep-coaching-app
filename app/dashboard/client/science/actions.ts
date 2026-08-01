"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { requireAuth, requireClient, requireCoach } from "@/lib/auth-guards";
import { revalidatePath } from "next/cache";
import type { ScienceArticleType } from "@/utils/science";
import { SCIENCE_LIBRARY_SEED } from "@/lib/science-library-seed";
import { getProfile, isSubscribed } from "@/utils/auth";
import { getTotalPoints } from "@/lib/gamification";
import { hasUnlocked } from "@/lib/gamification-types";

function revalidateScience() {
  revalidatePath("/dashboard/client/science", "layout");
  revalidatePath("/dashboard/coach/science", "layout");
}

// Importe l'archive officielle extraite de PubMed (lib/science-library-seed.ts)
// au lieu de coller des centaines de lignes SQL — même logique que
// seedOfficialExercises. Idempotent : ignore les pmid déjà en base.
export async function seedScienceLibrary(): Promise<{ error?: string; inserted?: number }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  try {
    const supabase = createAdminClient();
    const { data: existing, error: fetchError } = await supabase.from("science_articles").select("pmid");
    if (fetchError) return { error: "Erreur lors de la lecture de la bibliothèque." };

    const existingPmids = new Set((existing ?? []).map((r) => r.pmid));
    const missing = SCIENCE_LIBRARY_SEED.filter((a) => !existingPmids.has(a.pmid));
    if (missing.length === 0) return { inserted: 0 };

    const { error } = await supabase.from("science_articles").insert(
      missing.map((a) => ({
        pmid: a.pmid,
        doi: a.doi,
        title: a.title,
        abstract: a.abstract,
        authors: a.authors,
        journal: a.journal,
        pub_date: a.pub_date,
        article_type: a.article_type,
        topic: a.topic,
        summary_fr: a.summary_fr,
        url: a.url,
        pmc_id: a.pmc_id,
        is_actualite: a.is_actualite,
        is_auto: false,
        created_by: null,
      }))
    );
    if (error) return { error: "Erreur lors de l'import." };

    revalidateScience();
    return { inserted: missing.length };
  } catch {
    return { error: "Erreur inattendue." };
  }
}

export interface ImportArticleInput {
  pmid: string;
  doi: string | null;
  title: string;
  titleFr: string;
  authors: string;
  journal: string;
  pubDate: string | null;
  url: string;
  pmcId: string | null;
  topic: string;
  articleType: ScienceArticleType;
  summaryFr: string;
  asActualite: boolean;
}

// Permet au coach de faire passer un résultat de recherche live (onglet
// Recherche) directement dans la bibliothèque / l'actualité, sans ressaisie.
export async function importArticle(input: ImportArticleInput): Promise<{ error?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };
  if (!input.topic) return { error: "Choisis un thème." };

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("science_articles").upsert(
      {
        pmid: input.pmid,
        doi: input.doi,
        title: input.title,
        title_fr: input.titleFr.trim() || null,
        abstract: null,
        authors: input.authors,
        journal: input.journal,
        pub_date: input.pubDate,
        article_type: input.articleType,
        topic: input.topic,
        summary_fr: input.summaryFr.trim() || null,
        url: input.url,
        pmc_id: input.pmcId,
        is_actualite: input.asActualite,
        is_auto: false,
        created_by: guard.userId,
      },
      { onConflict: "pmid" }
    );
    if (error) return { error: "Erreur lors de l'ajout." };

    revalidateScience();
    return {};
  } catch {
    return { error: "Erreur inattendue." };
  }
}

export async function deleteArticle(id: string): Promise<{ error?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("science_articles").delete().eq("id", id);
    if (error) return { error: "Erreur lors de la suppression." };

    revalidateScience();
    return {};
  } catch {
    return { error: "Erreur inattendue." };
  }
}

// ── Nos études (recherche interne menée par le coach) ──────────────────────

export interface StudyInput {
  title: string;
  hypothesis: string | null;
  protocol: string | null;
  status: "idee" | "en_cours" | "terminee";
  participant_count: number | null;
  start_date: string | null;
  end_date: string | null;
  results: string | null;
}

export async function createStudy(input: StudyInput): Promise<{ error?: string; id?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };
  if (!input.title.trim()) return { error: "Le titre est requis." };

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("science_studies")
      .insert({ ...input, title: input.title.trim(), created_by: guard.userId })
      .select("id")
      .single();
    if (error || !data) return { error: "Erreur lors de la création." };

    revalidateScience();
    return { id: data.id };
  } catch {
    return { error: "Erreur inattendue." };
  }
}

export async function updateStudy(id: string, input: Partial<StudyInput>): Promise<{ error?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("science_studies")
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return { error: "Erreur lors de la mise à jour." };

    revalidateScience();
    return {};
  } catch {
    return { error: "Erreur inattendue." };
  }
}

export async function deleteStudy(id: string): Promise<{ error?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("science_studies").delete().eq("id", id);
    if (error) return { error: "Erreur lors de la suppression." };

    revalidateScience();
    return {};
  } catch {
    return { error: "Erreur inattendue." };
  }
}

// Rejoindre/quitter une étude — réservé aux membres ayant débloqué la
// participation (rang Vétéran ou abonnement, voir FEATURE_UNLOCK_POINTS).
export async function joinStudy(studyId: string): Promise<{ error?: string }> {
  const guard = await requireClient();
  if (!guard.ok) return { error: guard.error };

  try {
    const [profile, points] = await Promise.all([
      getProfile(guard.userId),
      getTotalPoints(guard.userId),
    ]);
    if (!hasUnlocked("study_participation", points, isSubscribed(profile))) {
      return { error: "Pas encore débloqué, continue à cumuler des points ou abonne-toi." };
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("science_study_participants")
      .insert({ study_id: studyId, participant_id: guard.userId });
    if (error) return { error: "Erreur lors de l'inscription." };

    revalidateScience();
    return {};
  } catch {
    return { error: "Erreur inattendue." };
  }
}

export async function leaveStudy(studyId: string): Promise<{ error?: string }> {
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error };

  try {
    const supabase = createAdminClient();
    await supabase
      .from("science_study_participants")
      .delete()
      .eq("study_id", studyId)
      .eq("participant_id", guard.userId);

    revalidateScience();
    return {};
  } catch {
    return { error: "Erreur inattendue." };
  }
}
