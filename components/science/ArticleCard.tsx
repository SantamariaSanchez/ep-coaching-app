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
    <div className="bg-[var(--color-ep-card)] border border-[var(--color-ep-dark-red)]/20 rounded-xl overflow-hidden">
      <button onClick={() => setExpanded((v) => !v)} className="w-full text-left px-4 py-3.5">
        <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[var(--color-ep-input)] border border-[var(--color-ep-dark-red)]/25 text-[var(--color-ep-light)]/45">
            {article.topic}
          </span>
          {article.article_type && (
            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[var(--color-ep-red)]/10 border border-[var(--color-ep-red)]/30 text-[var(--color-ep-red)]">
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
        <p className="text-[10px] text-[var(--color-ep-light)]/35 mt-1">
          {article.journal}
          {article.pub_date ? ` · ${formatDate(article.pub_date)}` : ""}
        </p>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-[var(--color-ep-dark-red)]/15 pt-3 space-y-2">
          {article.authors && <p className="text-[11px] text-[var(--color-ep-light)]/40 italic">{article.authors}</p>}

          {article.summary_fr && (
            <div className="bg-[var(--color-ep-input)] border border-[var(--color-ep-dark-red)]/20 rounded-lg p-3">
              <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-ep-light)]/30 mb-1">
                À retenir
              </p>
              <p className="text-sm text-[var(--color-ep-light)]/70 leading-relaxed">{article.summary_fr}</p>
            </div>
          )}

          {article.abstract && (
            <p className="text-xs text-[var(--color-ep-light)]/45 leading-relaxed">{article.abstract}</p>
          )}

          <div className="flex items-center gap-3 pt-2 border-t border-[var(--color-ep-dark-red)]/10">
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-[var(--color-ep-red)] hover:text-[#ff4444] transition-colors"
            >
              <ExternalLink size={11} /> Voir sur PubMed
            </a>
            {article.doi && (
              <a
                href={`https://doi.org/${article.doi}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-semibold text-[var(--color-ep-light)]/30 hover:text-[var(--color-ep-light)]/55 transition-colors"
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
                className="ml-auto inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-[var(--color-ep-light)]/30 hover:text-red-400 transition-colors disabled:opacity-40"
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
