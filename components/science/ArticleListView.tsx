"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import ArticleCard from "./ArticleCard";
import SeedLibraryButton from "@/components/ui/SeedLibraryButton";
import { SCIENCE_TOPICS, ARTICLE_TYPE_LABELS, type ScienceArticle, type ScienceArticleType } from "@/utils/science-types";

const inputCls =
  "w-full bg-[#150000] border border-[#890404]/30 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#F5EDED]/25 focus:outline-none focus:border-[#E01E1E]/60 transition-colors";

interface Props {
  articles: ScienceArticle[];
  isCoach: boolean;
  emptyLabel: string;
  showSeedButton?: boolean;
  seedAction?: () => Promise<{ error?: string; inserted?: number }>;
  deleteArticle?: (id: string) => Promise<{ error?: string }>;
}

export default function ArticleListView({ articles: initial, isCoach, emptyLabel, showSeedButton, seedAction, deleteArticle }: Props) {
  const [articles, setArticles] = useState(initial);
  const [search, setSearch] = useState("");
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<ScienceArticleType | "">("");

  const topicCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of articles) map[a.topic] = (map[a.topic] ?? 0) + 1;
    return map;
  }, [articles]);

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
      {showSeedButton && seedAction && (
        <SeedLibraryButton label="Importer la bibliothèque officielle (PubMed)" action={seedAction} />
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#F5EDED]/25" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher dans la bibliothèque…"
            className={`${inputCls} pl-9`}
          />
        </div>
        <select
          value={activeType}
          onChange={(e) => setActiveType(e.target.value as ScienceArticleType | "")}
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
