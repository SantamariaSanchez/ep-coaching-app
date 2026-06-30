import { createServerSupabase } from "@/lib/supabase-server";
import type { ScienceArticle, ScienceStudy } from "@/utils/science-types";

export type { ScienceArticleType, ScienceArticle, ScienceStudy } from "@/utils/science-types";
export { SCIENCE_TOPICS, ARTICLE_TYPE_LABELS, STUDY_STATUS_LABELS } from "@/utils/science-types";

export async function getScienceArticles(opts: { actualiteOnly?: boolean } = {}): Promise<ScienceArticle[]> {
  try {
    const supabase = await createServerSupabase();
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
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("science_studies")
      .select("*")
      .order("created_at", { ascending: false });
    return (data as ScienceStudy[]) ?? [];
  } catch {
    return [];
  }
}
