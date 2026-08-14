"use client";

import { useState } from "react";
import { ExternalLink, Trash2, Pencil, X } from "lucide-react";
import type { ScienceArticle, ScienceArticleType } from "@/utils/science-types";
import { ARTICLE_TYPE_LABELS, SCIENCE_TOPICS, guessArticleType } from "@/utils/science-types";
import type { UpdateArticleInput } from "@/app/dashboard/client/science/actions";

const inputCls =
  "w-full bg-[#150000] border border-[#890404]/30 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#F5EDED]/25 focus:outline-none focus:border-[#E01E1E]/60 transition-colors";

function formatDate(d: string | null): string {
  if (!d) return "";
  try {
    const date = new Date(d);
    const formatted = date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
    // PubMed assigne parfois une date d'édition formelle future aux articles
    // publiés en avance en ligne (epub ahead of print) — un vrai "31 déc.
    // 2026" affiché tel quel a l'air d'un bug plutôt que d'une pratique
    // éditoriale normale, donc on le nomme explicitement.
    return date.getTime() > Date.now() ? `À paraître · ${formatted}` : formatted;
  } catch {
    return d;
  }
}

function ArticleEditForm({
  article,
  onSave,
  onCancel,
}: {
  article: ScienceArticle;
  // MASTERCLASS.md Axe B : Promise<void> empêchait d'afficher une erreur
  // serveur et de garder le formulaire ouvert en cas d'échec.
  onSave: (input: UpdateArticleInput) => Promise<{ error?: string }>;
  onCancel: () => void;
}) {
  const [titleFr, setTitleFr] = useState(article.title_fr ?? "");
  const [summaryFr, setSummaryFr] = useState(article.summary_fr ?? "");
  const [articleType, setArticleType] = useState<ScienceArticleType>(
    article.article_type && article.article_type !== "autre" ? article.article_type : guessArticleType(article.title)
  );
  const [topic, setTopic] = useState(article.topic);
  const [asActualite, setAsActualite] = useState(article.is_actualite);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="bg-[#150000] border border-[#890404]/30 rounded-lg p-3 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <select value={topic} onChange={(e) => setTopic(e.target.value)} className={inputCls}>
          {SCIENCE_TOPICS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select value={articleType} onChange={(e) => setArticleType(e.target.value as ScienceArticleType)} className={inputCls}>
          {Object.entries(ARTICLE_TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>
      <input
        value={titleFr}
        onChange={(e) => setTitleFr(e.target.value)}
        placeholder="Titre en français"
        className={inputCls}
      />
      <textarea
        value={summaryFr}
        onChange={(e) => setSummaryFr(e.target.value)}
        rows={3}
        placeholder="Résumé en langage simple, à quoi ça sert concrètement…"
        className={`${inputCls} resize-none`}
      />
      <label className="flex items-center gap-2 text-[11px] text-[#F5EDED]/50">
        <input type="checkbox" checked={asActualite} onChange={(e) => setAsActualite(e.target.checked)} />
        Afficher aussi dans Actualité
      </label>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={async () => {
            setSaving(true);
            setError(null);
            const result = await onSave({ titleFr, summaryFr, articleType, topic, asActualite });
            setSaving(false);
            if (result.error) setError(result.error);
          }}
          disabled={saving}
          className="flex-1 py-2 text-xs font-black uppercase tracking-widest bg-[#E01E1E] hover:bg-[#B00202] disabled:opacity-50 text-white rounded-lg transition-colors"
        >
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
        <button onClick={onCancel} className="px-3 py-2 text-xs font-bold uppercase tracking-widest border border-[#890404]/40 text-[#F5EDED]/50 hover:text-[#F5EDED]/80 rounded-lg transition-colors">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

export default function ArticleCard({
  article,
  isCoach,
  onUpdate,
  onDelete,
}: {
  article: ScienceArticle;
  isCoach: boolean;
  onUpdate?: (input: UpdateArticleInput) => Promise<{ error?: string }>;
  onDelete?: () => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
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
          {isCoach && !article.summary_fr && (
            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300">
              À relire
            </span>
          )}
        </div>
        <p className="text-sm font-bold text-white leading-snug">{article.title_fr || article.title}</p>
        {article.title_fr && (
          <p className="text-[10px] text-[#F5EDED]/25 italic mt-0.5 truncate">{article.title}</p>
        )}
        <p className="text-[10px] text-[#F5EDED]/35 mt-1">
          {article.journal}
          {article.pub_date ? ` · ${formatDate(article.pub_date)}` : ""}
        </p>
        {article.summary_fr && (
          <p className="text-xs text-[#F5EDED]/55 leading-relaxed mt-2 line-clamp-2">{article.summary_fr}</p>
        )}
      </button>

      {expanded && editing && onUpdate && (
        <div className="px-4 pb-4 border-t border-[#890404]/15 pt-3">
          <ArticleEditForm
            article={article}
            onSave={async (input) => {
              const result = await onUpdate(input);
              if (!result.error) setEditing(false);
              return result;
            }}
            onCancel={() => setEditing(false)}
          />
        </div>
      )}

      {expanded && !editing && (
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
            {isCoach && onUpdate && (
              <button
                onClick={() => setEditing(true)}
                className="ml-auto inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/40 hover:text-[#F5EDED]/70 transition-colors"
              >
                <Pencil size={11} /> Modifier
              </button>
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
                className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/30 hover:text-red-400 transition-colors disabled:opacity-40 ${onUpdate ? "" : "ml-auto"}`}
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
