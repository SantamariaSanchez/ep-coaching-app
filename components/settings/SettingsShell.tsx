"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { useT } from "@/components/i18n/I18nProvider";
import { fuzzyMatchAny } from "@/lib/fuzzy-search";

export interface SettingsSection {
  id: string;
  title: string;
  /** Mots qu'une personne pourrait taper pour trouver ce réglage. */
  keywords: string;
  node: React.ReactNode;
}

// Page Paramètres rangée par rubriques (2026-10-07) : sommaire en pastilles
// pour sauter à une rubrique, et recherche tolérante aux fautes ("vibration",
// "langue", "mot de passe") qui ne garde que les rubriques concernées.
export default function SettingsShell({ sections }: { sections: SettingsSection[] }) {
  const t = useT();
  const [query, setQuery] = useState("");
  const visible = useMemo(() => {
    const q = query.trim();
    if (!q) return sections;
    return sections.filter((s) => fuzzyMatchAny([t(s.title), s.title, s.keywords, t(s.keywords)], q));
  }, [sections, query, t]);

  return (
    <div className="px-4 sm:px-6 py-8 max-w-2xl mx-auto pb-24 md:pb-8 page-transition">
      <div className="mb-5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">{t("Mon espace")}</p>
        <h1 className="text-3xl font-black uppercase tracking-tight">{t("Paramètres")}</h1>
      </div>

      <div style={{ position: "relative", marginBottom: 12 }}>
        <Search size={16} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "rgba(245,237,237,0.4)" }} />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("Chercher un réglage (langue, vibration, mot de passe...)")}
          aria-label={t("Chercher un réglage")}
          className="ep-input"
          style={{ width: "100%", paddingLeft: 38, paddingRight: query ? 38 : 12 }}
        />
        {query && (
          <button type="button" onClick={() => setQuery("")} aria-label={t("Effacer")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(245,237,237,0.5)", cursor: "pointer", padding: 6 }}>
            <X size={15} />
          </button>
        )}
      </div>

      {!query && (
        <nav aria-label={t("Rubriques")} style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 6, marginBottom: 8, touchAction: "pan-x" }}>
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              style={{ flexShrink: 0, padding: "7px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", textDecoration: "none", background: "rgba(245,237,237,0.05)", border: "1px solid rgba(245,237,237,0.08)", color: "rgba(245,237,237,0.7)" }}
            >
              {t(s.title)}
            </a>
          ))}
        </nav>
      )}

      {visible.length === 0 && (
        <p style={{ fontSize: 13, color: "rgba(245,237,237,0.5)", padding: "24px 0", textAlign: "center" }}>{t("Aucun réglage ne correspond.")}</p>
      )}

      {sections.map((s) => (
        <section key={s.id} id={s.id} style={{ scrollMarginTop: 80, marginTop: 30, display: visible.includes(s) ? "block" : "none" }}>
          <h2 style={{ display: "flex", alignItems: "center", gap: 10, margin: "0 0 12px", fontSize: 11, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "#E01E1E" }}>
            {t(s.title)}
            <span aria-hidden style={{ flex: 1, height: 1, background: "rgba(224,30,30,0.18)" }} />
          </h2>
          <div className="settings-section-body">{s.node}</div>
        </section>
      ))}
    </div>
  );
}
