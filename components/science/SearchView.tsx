"use client";

import { useState } from "react";
import { Search, ExternalLink, Plus, X } from "lucide-react";
import type { PubMedSummary } from "@/lib/pubmed";
import { SCIENCE_TOPICS, ARTICLE_TYPE_LABELS, type ScienceArticleType } from "@/utils/science-types";
import type { ImportArticleInput } from "@/app/dashboard/client/science/actions";

const inputCls =
  "w-full bg-[var(--color-ep-input)] border border-[var(--color-ep-dark-red)]/30 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[var(--color-ep-light)]/25 focus:outline-none focus:border-[var(--color-ep-red)]/60 transition-colors";

function formatDate(d: string | null): string {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return d;
  }
}

function ImportForm({ result, onImport, onCancel }: {
  result: PubMedSummary;
  onImport: (input: ImportArticleInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [topic, setTopic] = useState<string>(SCIENCE_TOPICS[0]);
  const [articleType, setArticleType] = useState<ScienceArticleType>("autre");
  const [summaryFr, setSummaryFr] = useState("");
  const [asActualite, setAsActualite] = useState(true);
  const [saving, setSaving] = useState(false);

  return (
    <div className="bg-[var(--color-ep-input)] border border-[var(--color-ep-dark-red)]/30 rounded-lg p-3 mt-2 space-y-2">
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
      <textarea
        value={summaryFr}
        onChange={(e) => setSummaryFr(e.target.value)}
        rows={2}
        placeholder="Résumé en langage simple (optionnel)…"
        className={`${inputCls} resize-none`}
      />
      <label className="flex items-center gap-2 text-[11px] text-[var(--color-ep-light)]/50">
        <input type="checkbox" checked={asActualite} onChange={(e) => setAsActualite(e.target.checked)} />
        Afficher aussi dans Actualité
      </label>
      <div className="flex gap-2">
        <button
          onClick={async () => {
            setSaving(true);
            await onImport({
              pmid: result.pmid,
              doi: result.doi,
              title: result.title,
              authors: result.authors,
              journal: result.journal,
              pubDate: result.pubDate,
              url: result.url,
              pmcId: result.pmcId,
              topic,
              articleType,
              summaryFr,
              asActualite,
            });
            setSaving(false);
          }}
          disabled={saving}
          className="flex-1 py-2 text-xs font-black uppercase tracking-widest bg-[var(--color-ep-red)] hover:bg-[var(--color-ep-med-red)] disabled:opacity-50 text-white rounded-lg transition-colors"
        >
          {saving ? "Ajout…" : "Confirmer l'ajout"}
        </button>
        <button onClick={onCancel} className="px-3 py-2 text-xs font-bold uppercase tracking-widest border border-[var(--color-ep-dark-red)]/40 text-[var(--color-ep-light)]/50 hover:text-[var(--color-ep-light)]/80 rounded-lg transition-colors">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

function ResultCard({ result, isCoach, importArticle }: {
  result: PubMedSummary;
  isCoach: boolean;
  importArticle?: (input: ImportArticleInput) => Promise<{ error?: string }>;
}) {
  const [showImport, setShowImport] = useState(false);
  const [imported, setImported] = useState(false);

  return (
    <div className="bg-[var(--color-ep-card)] border border-[var(--color-ep-dark-red)]/20 rounded-xl px-4 py-3.5">
      <p className="text-sm font-bold text-white leading-snug">{result.title}</p>
      <p className="text-[10px] text-[var(--color-ep-light)]/35 mt-1">{result.authors}</p>
      <p className="text-[10px] text-[var(--color-ep-light)]/35">
        {result.journal}{result.pubDate ? ` · ${formatDate(result.pubDate)}` : ""}
      </p>
      <div className="flex items-center gap-3 mt-2">
        <a
          href={result.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-[var(--color-ep-red)] hover:text-[#ff4444] transition-colors"
        >
          <ExternalLink size={11} /> Voir sur PubMed
        </a>
        {isCoach && importArticle && !imported && (
          <button
            onClick={() => setShowImport((v) => !v)}
            className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-[var(--color-ep-light)]/40 hover:text-[var(--color-ep-light)]/70 transition-colors ml-auto"
          >
            <Plus size={11} /> Ajouter à la biblio
          </button>
        )}
        {imported && <span className="ml-auto text-[10px] font-bold text-green-400">Ajouté ✓</span>}
      </div>
      {showImport && importArticle && (
        <ImportForm
          result={result}
          onCancel={() => setShowImport(false)}
          onImport={async (input) => {
            const res = await importArticle(input);
            if (!res.error) {
              setImported(true);
              setShowImport(false);
            }
          }}
        />
      )}
    </div>
  );
}

export default function SearchView({ isCoach, importArticle }: {
  isCoach: boolean;
  importArticle?: (input: ImportArticleInput) => Promise<{ error?: string }>;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PubMedSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  async function handleSearch() {
    if (!query.trim() || loading) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const res = await fetch(`/api/science/search?q=${encodeURIComponent(query.trim())}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Erreur lors de la recherche.");
        setResults([]);
      } else {
        setResults(json.results ?? []);
      }
    } catch {
      setError("Erreur lors de la recherche.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ep-light)]/25" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Ex. creatine supplementation muscle hypertrophy…"
            className={`${inputCls} pl-9`}
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={!query.trim() || loading}
          className="px-4 py-2 text-xs font-black uppercase tracking-widest bg-[var(--color-ep-red)] hover:bg-[var(--color-ep-med-red)] disabled:opacity-40 text-white rounded-lg transition-colors flex-shrink-0"
        >
          {loading ? "…" : "Rechercher"}
        </button>
      </div>
      <p className="text-[10px] text-[var(--color-ep-light)]/25">
        Recherche directement sur PubMed (NCBI) en anglais — la base de référence des publications scientifiques en santé. Consulte la source pour te faire ta propre opinion.
      </p>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="space-y-2">
        {results.map((r) => (
          <ResultCard key={r.pmid} result={r} isCoach={isCoach} importArticle={importArticle} />
        ))}
        {searched && !loading && results.length === 0 && !error && (
          <p className="text-xs text-[var(--color-ep-light)]/25 italic text-center py-10">Aucun résultat pour cette recherche.</p>
        )}
      </div>
    </div>
  );
}
