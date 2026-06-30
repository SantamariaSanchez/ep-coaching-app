import { createAdminClient } from "@/lib/supabase-admin";
import type { ScienceArticle, ScienceStudy } from "@/utils/science-types";

export type { ScienceArticleType, ScienceArticle, ScienceStudy } from "@/utils/science-types";
export { SCIENCE_TOPICS, ARTICLE_TYPE_LABELS, STUDY_STATUS_LABELS } from "@/utils/science-types";

// Contenu de référence partagé (pas scopé à l'utilisateur) — lu via le
// client admin pour que l'affichage ne dépende jamais de la config RLS sur
// ces tables (même fix que exercise_library/gyms/foods, voir 28c1d21).
export async function getScienceArticles(opts: { actualiteOnly?: boolean } = {}): Promise<ScienceArticle[]> {
  try {
    const supabase = createAdminClient();
    let query = supabase
      .from("science_articles")
      .select("*")
      .order("pub_date", { ascending: false, nullsFirst: false });
    if (opts.actualiteOnly) query = query.eq("is_actualite", true);
    const { data } = await query;
    return (data as ScienceArticle[]) ?? [];
  } catch {
    return [];
  }
}

export async function getScienceStudies(userId?: string): Promise<ScienceStudy[]> {
  try {
    const supabase = createAdminClient();
    const { data: studies } = await supabase
      .from("science_studies")
      .select("*")
      .order("created_at", { ascending: false });
    if (!studies || studies.length === 0) return [];

    const studyIds = studies.map((s) => s.id as string);
    const { data: participants } = await supabase
      .from("science_study_participants")
      .select("study_id, participant_id")
      .in("study_id", studyIds);

    const countMap: Record<string, number> = {};
    const joinedSet = new Set<string>();
    for (const p of participants ?? []) {
      const sid = p.study_id as string;
      countMap[sid] = (countMap[sid] ?? 0) + 1;
      if (userId && p.participant_id === userId) joinedSet.add(sid);
    }

    return studies.map((s) => ({
      ...s,
      joined_count: countMap[s.id] ?? 0,
      is_joined: joinedSet.has(s.id),
    })) as ScienceStudy[];
  } catch {
    return [];
  }
}
