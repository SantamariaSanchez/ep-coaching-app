import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { searchPubMedIds, fetchPubMedSummaries } from "@/lib/pubmed";

// Alimente automatiquement l'onglet "Actualité" avec les dernières études
// publiées sur les sujets suivis par l'app. Déclenché une fois par jour par
// Supabase pg_cron (voir supabase/migrations/20260710b_sync_pubmed_cron.sql).
// Idempotent : upsert par pmid, donc un run en double ne casse rien.

const TRACKED_TOPICS: Array<{ topic: string; query: string }> = [
  { topic: "Hypertrophie & Musculation", query: "resistance training hypertrophy" },
  { topic: "Force & Performance", query: "strength training performance periodization" },
  { topic: "Nutrition & Composition corporelle", query: "protein intake muscle body composition" },
  { topic: "Supplémentation", query: "creatine OR whey protein supplementation resistance training" },
  { topic: "Récupération & Sommeil", query: "sleep recovery resistance exercise" },
  { topic: "Hormones & Santé", query: "testosterone resistance training" },
  { topic: "Perte de graisse", query: "fat loss resistance training OR high intensity interval training" },
  { topic: "Féminin & Spécificités", query: "resistance training women menstrual cycle" },
];

const RECENT_DAYS = 60;

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const dateFrom = new Date(Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)
    .replaceAll("-", "/");

  let inserted = 0;
  const errors: string[] = [];

  for (const { topic, query } of TRACKED_TOPICS) {
    try {
      const { ids } = await searchPubMedIds(query, { maxResults: 8, sort: "pub_date", dateFrom });
      if (ids.length === 0) continue;
      const summaries = await fetchPubMedSummaries(ids);

      const { data: existing } = await supabase
        .from("science_articles")
        .select("pmid")
        .in("pmid", summaries.map((s) => s.pmid));
      const existingPmids = new Set((existing ?? []).map((r) => r.pmid));
      const fresh = summaries.filter((s) => !existingPmids.has(s.pmid));
      if (fresh.length === 0) continue;

      const { error } = await supabase.from("science_articles").insert(
        fresh.map((s) => ({
          pmid: s.pmid,
          doi: s.doi,
          title: s.title,
          abstract: null,
          authors: s.authors,
          journal: s.journal,
          pub_date: s.pubDate,
          article_type: "autre",
          topic,
          summary_fr: null,
          url: s.url,
          pmc_id: s.pmcId,
          is_actualite: true,
          is_auto: true,
          created_by: null,
        }))
      );
      if (error) errors.push(`${topic}: ${error.message}`);
      else inserted += fresh.length;
    } catch (e) {
      errors.push(`${topic}: ${e instanceof Error ? e.message : "erreur inconnue"}`);
    }
  }

  return NextResponse.json({ ok: true, inserted, errors });
}
