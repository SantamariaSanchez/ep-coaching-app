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

export async function getScienceStudies(): Promise<ScienceStudy[]> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("science_studies")
      .select("*")
      .order("created_at", { ascending: false });
    return (data as ScienceStudy[]) ?? [];
  } catch {
    return [];
  }
}
