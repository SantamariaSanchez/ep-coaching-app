"use client";

import { useState } from "react";
import { ExternalLink, Trash2 } from "lucide-react";
import type { ScienceArticle } from "@/utils/science-types";
import { ARTICLE_TYPE_LABELS } from "@/utils/science-types";

function formatDate(d: string | null): string {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return d;
  }
}

export default function ArticleCard({
  article,
  isCoach,
  onDelete,
}: {
  article: ScienceArticle;
  isCoach: boolean;
  onDelete?: () => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  return (
    <div className="bg-[#1f0101] border border-[#890404]/20 rounded-xl overflow-hidden">
      <button onClick={() => setExpanded((v) => !v)} className="w-full text-left px-4 py-3.5">
        <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[#150000] border border-[#890404]/25 text-[#F5EDED]/45">
            {article.topic}
          </span>
          {article.article_type && (
            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[#E01E1E]/10 border border-[#E01E1E]/30 text-[#E01E1E]">
              {ARTICLE_TYPE_LABELS[article.article_type]}
            </span>
          )}
          {article.is_actualite && (
            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-300">
              Actualité
            </span>
          )}
        </div>
        <p className="text-sm font-bold text-white leading-snug">{article.title}</p>
        <p className="text-[10px] text-[#F5EDED]/35 mt-1">
          {article.journal}
          {article.pub_date ? ` · ${formatDate(article.pub_date)}` : ""}
        </p>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-[#890404]/15 pt-3 space-y-2">
          {article.authors && <p className="text-[11px] text-[#F5EDED]/40 italic">{article.authors}</p>}

          {article.summary_fr && (
            <div className="bg-[#150000] border border-[#890404]/20 rounded-lg p-3">
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/30 mb-1">
                À retenir
              </p>
              <p className="text-sm text-[#F5EDED]/70 leading-relaxed">{article.summary_fr}</p>
            </div>
          )}

          {article.abstract && (
            <p className="text-xs text-[#F5EDED]/45 leading-relaxed">{article.abstract}</p>
          )}

          <div className="flex items-center gap-3 pt-2 border-t border-[#890404]/10">
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-[#E01E1E] hover:text-[#ff4444] transition-colors"
            >
              <ExternalLink size={11} /> Voir sur PubMed
            </a>
            {article.doi && (
              <a
                href={`https://doi.org/${article.doi}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-semibold text-[#F5EDED]/30 hover:text-[#F5EDED]/55 transition-colors"
              >
                DOI: {article.doi}
              </a>
            )}
            {isCoach && onDelete && (
              <button
                onClick={async () => {
                  if (!confirmDelete) {
                    setConfirmDelete(true);
                    return;
                  }
                  setDeleting(true);
                  await onDelete();
                  setDeleting(false);
                }}
                disabled={deleting}
                className="ml-auto inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/30 hover:text-red-400 transition-colors disabled:opacity-40"
              >
                <Trash2 size={11} /> {confirmDelete ? "Confirmer" : "Supprimer"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
