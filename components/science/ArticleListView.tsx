"use client";

import { useMemo, useState, useEffect } from "react";
import { Search, AlertTriangle } from "lucide-react";
import ArticleCard from "./ArticleCard";
import SeedLibraryButton from "@/components/ui/SeedLibraryButton";
import { SCIENCE_TOPICS, ARTICLE_TYPE_LABELS, type ScienceArticle, type ScienceArticleType } from "@/utils/science-types";
import type { UpdateArticleInput } from "@/app/dashboard/client/science/actions";

const inputCls =
  "w-full bg-[#150000] border border-[#890404]/30 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#F5EDED]/25 focus:outline-none focus:border-[#E01E1E]/60 transition-colors";

interface Props {
  articles: ScienceArticle[];
  isCoach: boolean;
  emptyLabel: string;
  showSeedButton?: boolean;
  seedAction?: () => Promise<{ error?: string; inserted?: number }>;
  updateArticle?: (id: string, input: UpdateArticleInput) => Promise<{ error?: string }>;
  deleteArticle?: (id: string) => Promise<{ error?: string }>;
}

export default function ArticleListView({ articles: initial, isCoach, emptyLabel, showSeedButton, seedAction, updateArticle, deleteArticle }: Props) {
  const [articles, setArticles] = useState(initial);

  // MASTERCLASS.md Axe E : resynchronise depuis le serveur quand
  // initial change (même piège que todayLogs dans ClientNutritionView —
  // useState ne reprend jamais un nouveau prop après le premier rendu).
  useEffect(() => {
    setArticles(initial);
  }, [initial]);
  const [search, setSearch] = useState("");
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<ScienceArticleType | "">("");
  const [showNeedsReview, setShowNeedsReview] = useState(false);

  const topicCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of articles) map[a.topic] = (map[a.topic] ?? 0) + 1;
    return map;
  }, [articles]);

  // Le cron quotidien importe sans résumé FR (voir app/api/cron/sync-pubmed) —
  // seul signal fiable qu'une entrée traîne encore à l'état brut.
  const needsReview = useMemo(() => articles.filter((a) => !a.summary_fr), [articles]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return articles.filter((a) => {
      if (activeTopic && a.topic !== activeTopic) return false;
      if (activeType && a.article_type !== activeType) return false;
      if (!q) return true;
      return (
        a.title.toLowerCase().includes(q) ||
        (a.title_fr ?? "").toLowerCase().includes(q) ||
        (a.authors ?? "").toLowerCase().includes(q) ||
        (a.journal ?? "").toLowerCase().includes(q) ||
        (a.summary_fr ?? "").toLowerCase().includes(q)
      );
    });
  }, [articles, search, activeTopic, activeType]);

  return (
    <div className="space-y-4">
      {isCoach && needsReview.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="flex items-center gap-2 text-[11.5px] text-amber-300/90 leading-snug">
              <AlertTriangle size={14} className="flex-shrink-0" />
              {needsReview.length} article{needsReview.length > 1 ? "s" : ""} importé{needsReview.length > 1 ? "s" : ""}{" "}
              automatiquement sans résumé FR, juste un titre anglais et un lien pour l&apos;instant.
            </p>
            <button
              onClick={() => setShowNeedsReview((v) => !v)}
              className="flex-shrink-0 text-[10px] font-bold uppercase tracking-widest text-amber-400 hover:text-amber-300 transition-colors"
            >
              {showNeedsReview ? "Masquer" : "Voir la liste"}
            </button>
          </div>
          {showNeedsReview && (
            <div className="mt-3 pt-3 border-t border-amber-500/15 space-y-1">
              {needsReview.map((a) => (
                <p key={a.id} className="text-xs text-[#F5EDED]/60 truncate">
                  {a.title} <span className="text-[#F5EDED]/25">· {a.topic}</span>
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {showSeedButton && seedAction && (
        <SeedLibraryButton label="Importer la bibliothèque officielle (PubMed)" action={seedAction} />
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#F5EDED]/25" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher dans la bibliothèque…" aria-label="Rechercher dans la bibliothèque…"
            className={`${inputCls} pl-9`}
          />
        </div>
        <select
          value={activeType}
          onChange={(e) => setActiveType(e.target.value as ScienceArticleType | "")}
          aria-label="Type d'article"
          className={`${inputCls} sm:w-56`}
        >
          <option value="">Tous les types</option>
          {Object.entries(ARTICLE_TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTopic(null)}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-colors ${
            activeTopic === null ? "bg-[#E01E1E]/20 border-[#E01E1E]/50 text-[#E01E1E]" : "border-[#890404]/25 text-[#F5EDED]/40"
          }`}
        >
          Tout ({articles.length})
        </button>
        {SCIENCE_TOPICS.filter((t) => topicCounts[t]).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTopic(t)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-colors ${
              activeTopic === t ? "bg-[#E01E1E]/20 border-[#E01E1E]/50 text-[#E01E1E]" : "border-[#890404]/25 text-[#F5EDED]/40"
            }`}
          >
            {t} ({topicCounts[t]})
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map((a) => (
          <ArticleCard
            key={a.id}
            article={a}
            isCoach={isCoach}
            onUpdate={
              updateArticle
                ? async (input) => {
                    const res = await updateArticle(a.id, input);
                    if (!res.error) {
                      setArticles((prev) =>
                        prev.map((x) =>
                          x.id === a.id
                            ? {
                                ...x,
                                title_fr: input.titleFr.trim() || null,
                                summary_fr: input.summaryFr.trim() || null,
                                article_type: input.articleType,
                                topic: input.topic,
                                is_actualite: input.asActualite,
                              }
                            : x
                        )
                      );
                    }
                    return res;
                  }
                : undefined
            }
            onDelete={
              deleteArticle
                ? async () => {
                    await deleteArticle(a.id);
                    setArticles((prev) => prev.filter((x) => x.id !== a.id));
                  }
                : undefined
            }
          />
        ))}
        {filtered.length === 0 && (
          <p className="text-xs text-[#F5EDED]/25 italic text-center py-10">{emptyLabel}</p>
        )}
      </div>
    </div>
  );
}
