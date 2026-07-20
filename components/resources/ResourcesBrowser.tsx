"use client";

import { useMemo, useState } from "react";
import { Search, FileText, Video, Music, Image as ImageIcon, Archive, Download, BookOpen } from "lucide-react";
import type { ResourceItem } from "@/lib/resource-categories";
import { getResourceHref, getResourceKind, type ResourceKind } from "@/lib/resource-href";

const KIND_ICON: Record<ResourceKind, React.ElementType> = {
  pdf: FileText,
  video: Video,
  audio: Music,
  image: ImageIcon,
  archive: Archive,
  doc: FileText,
};

const UNCATEGORIZED = "Autres";

export default function ResourcesBrowser({ resources }: { resources: ResourceItem[] }) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categories = useMemo(() => {
    const set = new Set<string>();
    resources.forEach((r) => set.add(r.category?.trim() || UNCATEGORIZED));
    return Array.from(set).sort((a, b) => (a === UNCATEGORIZED ? 1 : b === UNCATEGORIZED ? -1 : a.localeCompare(b, "fr")));
  }, [resources]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return resources.filter((r) => {
      const cat = r.category?.trim() || UNCATEGORIZED;
      if (activeCategory && cat !== activeCategory) return false;
      if (q && !r.title.toLowerCase().includes(q) && !(r.description ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [resources, search, activeCategory]);

  const grouped = useMemo(() => {
    const map = new Map<string, ResourceItem[]>();
    filtered.forEach((r) => {
      const cat = r.category?.trim() || UNCATEGORIZED;
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(r);
    });
    return Array.from(map.entries()).sort(([a], [b]) =>
      a === UNCATEGORIZED ? 1 : b === UNCATEGORIZED ? -1 : a.localeCompare(b, "fr")
    );
  }, [filtered]);

  if (resources.length === 0) {
    return (
      <div className="bg-[#1f0101] border border-dashed border-[#890404]/25 rounded-xl py-16 text-center">
        <BookOpen size={26} className="text-[#F5EDED]/15 mx-auto mb-3" strokeWidth={1.5} />
        <p className="text-sm text-[#F5EDED]/35">
          Les guides et ressources gratuites arrivent bientôt ici.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#F5EDED]/25" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher une ressource…"
          className="w-full bg-[#150000] border border-[#890404]/25 rounded-xl pl-10 pr-3 py-2.5 text-sm text-white placeholder:text-[#F5EDED]/25 focus:outline-none focus:border-[#E01E1E]/50 transition-colors"
        />
      </div>

      {/* Category pills */}
      {categories.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-colors ${
              activeCategory === null
                ? "bg-[#E01E1E] border-[#E01E1E] text-white"
                : "bg-[#150000] border-[#890404]/25 text-[#F5EDED]/50 hover:border-[#890404]/50"
            }`}
          >
            Tout
          </button>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setActiveCategory(c)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-colors ${
                activeCategory === c
                  ? "bg-[#E01E1E] border-[#E01E1E] text-white"
                  : "bg-[#150000] border-[#890404]/25 text-[#F5EDED]/50 hover:border-[#890404]/50"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-[#F5EDED]/30 text-center py-10">Aucune ressource ne correspond à ta recherche.</p>
      ) : (
        <div className="space-y-7">
          {grouped.map(([category, items]) => (
            <div key={category}>
              {categories.length > 1 && (
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/30 mb-2.5">
                  {category}
                </p>
              )}
              <div className="space-y-2">
                {items.map((r) => {
                  const Icon = KIND_ICON[getResourceKind(r.file_url)];
                  return (
                    <a
                      key={r.id}
                      href={getResourceHref(r)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 bg-[#1f0101] border border-[#890404]/20 hover:border-[#890404]/40 rounded-xl px-4 py-3.5 transition-colors group"
                    >
                      <div className="w-9 h-9 rounded-lg bg-[#890404]/10 flex items-center justify-center flex-shrink-0">
                        <Icon size={15} className="text-[#890404]" strokeWidth={1.8} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{r.title}</p>
                        {r.description && (
                          <p className="text-[10px] text-[#F5EDED]/35 truncate">{r.description}</p>
                        )}
                      </div>
                      <Download
                        size={15}
                        className="text-[#F5EDED]/25 group-hover:text-[#F5EDED]/50 transition-colors flex-shrink-0"
                        strokeWidth={1.8}
                      />
                    </a>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
