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
    let query = supabase.from("science_articles").select("*");
    if (opts.actualiteOnly) {
      // "Actualité" = ce qui vient d'être découvert, pas la date d'édition
      // formelle du journal : PubMed assigne parfois une date de couverture
      // future aux articles publiés en avance en ligne (epub ahead of
      // print), ce qui faisait remonter des articles "de décembre 2026" en
      // tête d'un flux censé montrer les nouveautés (vérifié en base le
      // 2026-08-08 : jusqu'à 5 mois dans le futur). created_at (le moment où
      // l'app l'a trouvé) reflète mieux "quoi de neuf" que pub_date ici.
      query = query.eq("is_actualite", true).order("created_at", { ascending: false });
    } else {
      query = query.order("pub_date", { ascending: false, nullsFirst: false });
    }
    const { data } = await query;
    return (data as ScienceArticle[]) ?? [];
  } catch {
    return [];
  }
}

// "Nos études" (contrairement à science_articles) ce sont les protocoles de
// recherche interne du coach avec SES clients — pas de la littérature
// partagée. getScienceStudies() renvoyait jusqu'ici les études de TOUS les
// coachs de la plateforme à TOUT client, sans lien avec science_studies.
// created_by, contraire au cloisonnement multi-coach explicitement promis
// ailleurs (voir 20260729b_multi_coach_foundation.sql) et déjà corrigé côté
// participants le 2026-08-06 (migration 20260806d) mais pas ici. Non
// exploitable avec un seul coach en prod aujourd'hui, deviendrait une fuite
// inter-coachs dès qu'un deuxième existera — coachId : le coach lui-même
// côté dashboard coach, ou profile.coach_id du client côté dashboard client.
export async function getScienceStudies(coachId: string, viewerId?: string): Promise<ScienceStudy[]> {
  if (!coachId) return [];
  try {
    const supabase = createAdminClient();
    const { data: studies } = await supabase
      .from("science_studies")
      .select("*")
      .eq("created_by", coachId)
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
      if (viewerId && p.participant_id === viewerId) joinedSet.add(sid);
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

// Compteurs pour les badges du sous-menu Science (Actualité/Bibliothèque/Nos
// études) — trois COUNT côté base plutôt que charger les listes complètes
// juste pour un nombre. coachId : voir getScienceStudies (vide côté client
// sans coach, renvoie alors 0 étude sans erreur).
export async function getScienceCounts(coachId: string): Promise<{ articles: number; actualite: number; studies: number }> {
  try {
    const supabase = createAdminClient();
    // UUID bidon si coachId est vide (client sans coach) : garantit 0 ligne
    // plutôt qu'une branche de type différente dans le Promise.all.
    const scopedCoachId = coachId || "00000000-0000-0000-0000-000000000000";
    const [articlesRes, actualiteRes, studiesRes] = await Promise.all([
      supabase.from("science_articles").select("id", { count: "exact", head: true }),
      supabase.from("science_articles").select("id", { count: "exact", head: true }).eq("is_actualite", true),
      supabase.from("science_studies").select("id", { count: "exact", head: true }).eq("created_by", scopedCoachId),
    ]);
    return {
      articles: articlesRes.count ?? 0,
      actualite: actualiteRes.count ?? 0,
      studies: studiesRes.count ?? 0,
    };
  } catch {
    return { articles: 0, actualite: 0, studies: 0 };
  }
}
