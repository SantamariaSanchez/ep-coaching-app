"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, X, ChevronRight, Clock, BookOpen, ListChecks, HelpCircle, LayoutGrid, SlidersHorizontal } from "lucide-react";
import type { LeadMagnet, LeadMagnetFormat } from "@/lib/lead-magnets";
import { RESOURCE_CATEGORIES, RESOURCE_SUBCATEGORIES, type ResourceCategory } from "@/lib/resource-categories";
import { getMagnetIcon } from "@/components/ressources/lead-magnet-icons";

const FORMAT_LABELS: Record<LeadMagnetFormat, { label: string; icon: typeof BookOpen }> = {
  guide: { label: "Guide", icon: BookOpen },
  checklist: { label: "Checklist", icon: ListChecks },
  quiz: { label: "Quiz", icon: HelpCircle },
};

const RECENT_SEARCHES_KEY = "ep-lead-magnets-recent-searches";
const LAST_CATEGORY_KEY = "ep-lead-magnets-last-category";
const MAX_RECENT_SEARCHES = 5;
const PAGE_SIZE = 24;

function readRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(term: string) {
  try {
    const trimmed = term.trim();
    if (trimmed.length < 2) return;
    const current = readRecentSearches().filter((s) => s.toLowerCase() !== trimmed.toLowerCase());
    const next = [trimmed, ...current].slice(0, MAX_RECENT_SEARCHES);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
  } catch {
    // stockage indisponible, tant pis
  }
}

// Recherche/filtre par catégorie, sous-catégorie et format, pensée pour
// grossir jusqu'à plusieurs centaines d'entrées sans devenir illisible : le
// filtre par catégorie réduit d'abord le champ, les sous-catégories
// n'apparaissent que pour la catégorie choisie (pas de mur de 40 chips
// d'un coup), et la recherche texte reste une couche par dessus, pas la
// seule porte d'entrée. Tout tourne côté client (le tableau complet est
// déjà chargé) : à l'échelle visée (jusqu'à ~1000 lead magnets), filtrer un
// tableau en mémoire reste de l'ordre de la milliseconde, pas besoin d'un
// aller retour serveur par frappe.
export default function LeadMagnetsExplorer({ magnets }: { magnets: LeadMagnet[] }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<ResourceCategory | null>(null);
  const [subcategory, setSubcategory] = useState<string | null>(null);
  const [format, setFormat] = useState<LeadMagnetFormat | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // localStorage n'existe pas côté serveur : lire ces valeurs pendant le
  // rendu (même via un initialiseur "lazy") produirait un mismatch
  // d'hydratation (le HTML serveur ne peut pas connaître ce que ce
  // navigateur a stocké) — même compromis assumé ailleurs dans l'appli
  // (PermissionsCard, DashboardNav, LeadMagnetLanding).
  useEffect(() => {
    setRecentSearches(readRecentSearches());
    try {
      const lastCategory = localStorage.getItem(LAST_CATEGORY_KEY);
      if (lastCategory && (RESOURCE_CATEGORIES as readonly string[]).includes(lastCategory)) {
        setCategory(lastCategory as ResourceCategory);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      if (category) localStorage.setItem(LAST_CATEGORY_KEY, category);
      else localStorage.removeItem(LAST_CATEGORY_KEY);
    } catch {
      // ignore
    }
  }, [category]);

  // Une catégorie n'apparaît comme filtre que si elle contient déjà du
  // contenu — évite d'afficher des chips vides pendant que la production
  // continue de démarrer sur certains thèmes.
  const categoriesWithContent = useMemo(() => {
    const present = new Set(magnets.map((m) => m.category));
    return RESOURCE_CATEGORIES.filter((c) => present.has(c));
  }, [magnets]);

  const subcategoriesForCurrent = useMemo(() => {
    if (!category) return [];
    const present = new Set(magnets.filter((m) => m.category === category).map((m) => m.subcategory));
    return RESOURCE_SUBCATEGORIES[category].filter((sc) => present.has(sc));
  }, [magnets, category]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return magnets.filter((m) => {
      if (category && m.category !== category) return false;
      if (subcategory && m.subcategory !== subcategory) return false;
      if (format && m.format !== format) return false;
      if (q && !(m.title.toLowerCase().includes(q) || m.hook.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [magnets, search, category, subcategory, format]);

  function runSearch(term: string) {
    setSearch(term);
    setVisibleCount(PAGE_SIZE);
    if (term.trim()) saveRecentSearch(term);
    setRecentSearches(readRecentSearches());
  }

  function selectCategory(next: ResourceCategory | null) {
    setCategory(next);
    setSubcategory(null);
    setVisibleCount(PAGE_SIZE);
  }

  const activeFilterCount = (category ? 1 : 0) + (subcategory ? 1 : 0) + (format ? 1 : 0);
  const visible = filtered.slice(0, visibleCount);

  return (
    <section style={{ marginBottom: 32 }}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35">Gratuit, sans compte</p>
        {magnets.length > 0 && (
          <span className="text-[10px] font-semibold text-[#F5EDED]/25">{magnets.length} ressources</span>
        )}
      </div>
      <h2 style={{ fontSize: 18, fontWeight: 900, color: "#F5EDED", margin: "0 0 14px" }}>
        Guides, checklists et quiz
      </h2>

      {/* Recherche */}
      <div className="relative mb-3">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#F5EDED]/30" strokeWidth={1.8} />
        <input
          value={search}
          onChange={(e) => runSearch(e.target.value)}
          placeholder="Rechercher un guide, une checklist, un quiz..."
          className="w-full bg-[#1f0101] border border-[#890404]/25 rounded-xl pl-10 pr-9 py-2.5 text-sm text-white placeholder:text-[#F5EDED]/25 focus:outline-none focus:border-[#E01E1E]/40"
        />
        {search && (
          <button
            onClick={() => runSearch("")}
            aria-label="Effacer la recherche"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#F5EDED]/30 hover:text-[#F5EDED]/60 transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Recherches récentes, visibles seulement champ vide */}
      {!search && recentSearches.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap mb-3">
          <span className="text-[10px] text-[#F5EDED]/25 mr-0.5">Récent :</span>
          {recentSearches.map((term) => (
            <button
              key={term}
              onClick={() => runSearch(term)}
              className="text-[11px] text-[#F5EDED]/50 hover:text-[#F5EDED]/80 bg-[#1f0101] border border-[#890404]/20 rounded-full px-2.5 py-1 transition-colors"
            >
              {term}
            </button>
          ))}
        </div>
      )}

      {/* Catégories */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 mb-2" style={{ WebkitOverflowScrolling: "touch" }}>
        <button
          onClick={() => selectCategory(null)}
          className="flex-shrink-0 text-[11px] font-bold uppercase tracking-wide px-3 py-1.5 rounded-full transition-colors"
          style={{
            background: category === null ? "#E01E1E" : "#1f0101",
            border: `1px solid ${category === null ? "#E01E1E" : "rgba(137,4,4,0.25)"}`,
            color: category === null ? "#fff" : "rgba(245,237,237,0.55)",
          }}
        >
          Tout
        </button>
        {categoriesWithContent.map((c) => (
          <button
            key={c}
            onClick={() => selectCategory(c)}
            className="flex-shrink-0 text-[11px] font-bold uppercase tracking-wide px-3 py-1.5 rounded-full transition-colors"
            style={{
              background: category === c ? "#E01E1E" : "#1f0101",
              border: `1px solid ${category === c ? "#E01E1E" : "rgba(137,4,4,0.25)"}`,
              color: category === c ? "#fff" : "rgba(245,237,237,0.55)",
            }}
          >
            {c}
          </button>
        ))}
        <button
          onClick={() => setFiltersOpen((v) => !v)}
          className="flex-shrink-0 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide px-3 py-1.5 rounded-full transition-colors"
          style={{
            background: filtersOpen || format ? "rgba(224,30,30,0.12)" : "#1f0101",
            border: `1px solid ${filtersOpen || format ? "rgba(224,30,30,0.4)" : "rgba(137,4,4,0.25)"}`,
            color: filtersOpen || format ? "#E01E1E" : "rgba(245,237,237,0.55)",
          }}
        >
          <SlidersHorizontal size={11} /> Format
        </button>
      </div>

      {/* Sous-catégories, seulement si une catégorie qui en a est choisie */}
      {subcategoriesForCurrent.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 mb-2" style={{ WebkitOverflowScrolling: "touch" }}>
          <button
            onClick={() => setSubcategory(null)}
            className="flex-shrink-0 text-[10.5px] px-2.5 py-1 rounded-full transition-colors"
            style={{
              background: subcategory === null ? "rgba(224,30,30,0.15)" : "transparent",
              border: "1px solid rgba(137,4,4,0.2)",
              color: subcategory === null ? "#E01E1E" : "rgba(245,237,237,0.4)",
            }}
          >
            Tous les sous-thèmes
          </button>
          {subcategoriesForCurrent.map((sc) => (
            <button
              key={sc}
              onClick={() => setSubcategory(sc === subcategory ? null : sc)}
              className="flex-shrink-0 text-[10.5px] px-2.5 py-1 rounded-full transition-colors"
              style={{
                background: subcategory === sc ? "rgba(224,30,30,0.15)" : "transparent",
                border: "1px solid rgba(137,4,4,0.2)",
                color: subcategory === sc ? "#E01E1E" : "rgba(245,237,237,0.4)",
              }}
            >
              {sc}
            </button>
          ))}
        </div>
      )}

      {/* Filtre format, replié par défaut */}
      {filtersOpen && (
        <div className="flex items-center gap-1.5 mb-3">
          {(Object.keys(FORMAT_LABELS) as LeadMagnetFormat[]).map((f) => {
            const { label, icon: Icon } = FORMAT_LABELS[f];
            const active = format === f;
            return (
              <button
                key={f}
                onClick={() => setFormat(active ? null : f)}
                className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-colors"
                style={{
                  background: active ? "rgba(224,30,30,0.12)" : "#1f0101",
                  border: `1px solid ${active ? "rgba(224,30,30,0.4)" : "rgba(137,4,4,0.2)"}`,
                  color: active ? "#E01E1E" : "rgba(245,237,237,0.5)",
                }}
              >
                <Icon size={12} /> {label}
              </button>
            );
          })}
        </div>
      )}

      {activeFilterCount > 0 && (
        <button
          onClick={() => {
            selectCategory(null);
            setFormat(null);
          }}
          className="text-[10.5px] text-[#F5EDED]/35 hover:text-[#F5EDED]/60 underline mb-3 inline-block"
        >
          Réinitialiser les filtres
        </button>
      )}

      {/* Résultats */}
      {filtered.length === 0 ? (
        <div className="bg-[#1f0101] border border-dashed border-[#890404]/25 rounded-xl py-14 text-center">
          <LayoutGrid size={24} className="text-[#F5EDED]/15 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-sm text-[#F5EDED]/35">Aucune ressource ne correspond à ces critères.</p>
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
            {visible.map((m) => {
              const Icon = getMagnetIcon(m.icon);
              const fmt = FORMAT_LABELS[m.format];
              const FormatIcon = fmt.icon;
              return (
                <Link
                  key={m.slug}
                  href={`/ressources/${m.slug}`}
                  className="group"
                  style={{
                    display: "flex", flexDirection: "column", gap: 10, padding: 16, borderRadius: 14,
                    background: "#1f0101", border: "1px solid rgba(137,4,4,0.25)", textDecoration: "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div
                      style={{
                        width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                        background: "rgba(224,30,30,0.12)", display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      <Icon size={16} style={{ color: "#E01E1E" }} strokeWidth={1.8} />
                    </div>
                    <span
                      style={{
                        display: "flex", alignItems: "center", gap: 4, fontSize: 9, fontWeight: 800,
                        letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(245,237,237,0.35)",
                      }}
                    >
                      <FormatIcon size={10} /> {fmt.label}
                    </span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13.5, fontWeight: 800, color: "#F5EDED", lineHeight: 1.35, margin: "0 0 4px" }}>
                      {m.title}
                    </p>
                    <p style={{ fontSize: 11, color: "rgba(245,237,237,0.4)", lineHeight: 1.5, margin: 0 }}>{m.hook}</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "rgba(245,237,237,0.3)" }}>
                      <Clock size={10} /> {m.readTime}
                    </span>
                    <ChevronRight size={14} className="text-[#F5EDED]/20 group-hover:text-[#E01E1E] transition-colors" />
                  </div>
                </Link>
              );
            })}
          </div>

          {visibleCount < filtered.length && (
            <button
              onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
              className="w-full mt-4 text-center text-[11px] font-bold uppercase tracking-widest text-[#F5EDED]/45 hover:text-[#F5EDED]/70 bg-[#1f0101] border border-[#890404]/20 rounded-xl py-3 transition-colors"
            >
              Voir plus ({filtered.length - visibleCount} de plus)
            </button>
          )}
        </>
      )}
    </section>
  );
}
