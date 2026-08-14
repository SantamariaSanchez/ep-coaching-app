"use client";

import { useState } from "react";
import { Search, ExternalLink, Plus, X } from "lucide-react";
import type { PubMedSummary } from "@/lib/pubmed";
import { SCIENCE_TOPICS, ARTICLE_TYPE_LABELS, guessArticleType, type ScienceArticleType } from "@/utils/science-types";
import type { ImportArticleInput } from "@/app/dashboard/client/science/actions";

const inputCls =
  "w-full bg-[#150000] border border-[#890404]/30 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#F5EDED]/25 focus:outline-none focus:border-[#E01E1E]/60 transition-colors";

// Suggestions cliquables — PubMed n'indexe qu'en anglais, la plupart des
// clients ne savent pas quel terme medical taper. Mappe des sujets courants
// en francais vers une requete anglaise qui marche bien.
const QUICK_TOPICS: { label: string; query: string }[] = [
  { label: "Créatine", query: "creatine supplementation muscle strength" },
  { label: "Protéines & prise de muscle", query: "protein intake muscle hypertrophy" },
  { label: "Perte de gras", query: "fat loss caloric deficit resistance training" },
  { label: "Sommeil & récupération", query: "sleep recovery athletic performance" },
  { label: "Jeûne intermittent", query: "intermittent fasting body composition" },
  { label: "Cardio & santé", query: "cardiovascular exercise health outcomes" },
  { label: "Stress & cortisol", query: "cortisol stress exercise" },
  { label: "Cycle féminin & entraînement", query: "menstrual cycle resistance training performance" },
];

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
  const [articleType, setArticleType] = useState<ScienceArticleType>(guessArticleType(result.title));
  const [titleFr, setTitleFr] = useState("");
  const [summaryFr, setSummaryFr] = useState("");
  const [asActualite, setAsActualite] = useState(true);
  const [saving, setSaving] = useState(false);

  const canImport = titleFr.trim().length > 0 && summaryFr.trim().length > 0;

  return (
    <div className="bg-[#150000] border border-[#890404]/30 rounded-lg p-3 mt-2 space-y-2">
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
        placeholder="Titre en français (obligatoire, c'est ce que le client verra en premier)" aria-label="Titre en français (obligatoire, c'est ce que le client verra en premier)"
        className={inputCls}
      />
      <textarea
        value={summaryFr}
        onChange={(e) => setSummaryFr(e.target.value)}
        rows={2}
        placeholder="Résumé en langage simple, à quoi ça sert concrètement (obligatoire)…" aria-label="Résumé en langage simple, à quoi ça sert concrètement (obligatoire)…"
        className={`${inputCls} resize-none`}
      />
      <label className="flex items-center gap-2 text-[11px] text-[#F5EDED]/50">
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
              titleFr,
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
          disabled={saving || !canImport}
          title={canImport ? undefined : "Le titre FR et le résumé sont obligatoires"} aria-label={canImport ? undefined : "Le titre FR et le résumé sont obligatoires"}
          className="flex-1 py-2 text-xs font-black uppercase tracking-widest bg-[#E01E1E] hover:bg-[#B00202] disabled:opacity-50 text-white rounded-lg transition-colors"
        >
          {saving ? "Ajout…" : "Confirmer l'ajout"}
        </button>
        <button onClick={onCancel} aria-label="Annuler" className="px-3 py-2 text-xs font-bold uppercase tracking-widest border border-[#890404]/40 text-[#F5EDED]/50 hover:text-[#F5EDED]/80 rounded-lg transition-colors">
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
    <div className="bg-[#1f0101] border border-[#890404]/20 rounded-xl px-4 py-3.5">
      <p className="text-sm font-bold text-white leading-snug">{result.title}</p>
      <p className="text-[10px] text-[#F5EDED]/35 mt-1">{result.authors}</p>
      <p className="text-[10px] text-[#F5EDED]/35">
        {result.journal}{result.pubDate ? ` · ${formatDate(result.pubDate)}` : ""}
      </p>
      <div className="flex items-center gap-3 mt-2">
        <a
          href={result.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-[#E01E1E] hover:text-[#ff4444] transition-colors"
        >
          <ExternalLink size={11} /> Voir sur PubMed
        </a>
        {isCoach && importArticle && !imported && (
          <button
            onClick={() => setShowImport((v) => !v)}
            className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/40 hover:text-[#F5EDED]/70 transition-colors ml-auto"
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

  async function handleSearch(explicitQuery?: string) {
    const q = explicitQuery ?? query;
    if (!q.trim() || loading) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const res = await fetch(`/api/science/search?q=${encodeURIComponent(q.trim())}`);
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
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#F5EDED]/25" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Ex. creatine supplementation muscle hypertrophy…" aria-label="Ex. creatine supplementation muscle hypertrophy…"
            className={`${inputCls} pl-9`}
          />
        </div>
        <button
          onClick={() => handleSearch()}
          disabled={!query.trim() || loading}
          className="px-4 py-2 text-xs font-black uppercase tracking-widest bg-[#E01E1E] hover:bg-[#B00202] disabled:opacity-40 text-white rounded-lg transition-colors flex-shrink-0"
        >
          {loading ? "…" : "Rechercher"}
        </button>
      </div>
      <p className="text-[10px] text-[#F5EDED]/25">
        Recherche directement sur PubMed (NCBI) en anglais, la base de référence des publications scientifiques en santé. Consulte la source pour te faire ta propre opinion.
      </p>

      {!searched && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/25 mb-2">
            Pas d&apos;idée de recherche ? Sujets courants (déjà traduits pour PubMed) :
          </p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_TOPICS.map((t) => (
              <button
                key={t.label}
                onClick={() => {
                  setQuery(t.query);
                  handleSearch(t.query);
                }}
                className="px-3 py-1.5 rounded-full text-[11px] font-semibold bg-[#150000] border border-[#890404]/25 text-[#F5EDED]/60 hover:border-[#E01E1E]/50 hover:text-white transition-colors"
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="space-y-2">
        {results.map((r) => (
          <ResultCard key={r.pmid} result={r} isCoach={isCoach} importArticle={importArticle} />
        ))}
        {searched && !loading && results.length === 0 && !error && (
          <p className="text-xs text-[#F5EDED]/25 italic text-center py-10">Aucun résultat pour cette recherche.</p>
        )}
      </div>
    </div>
  );
}
