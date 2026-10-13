"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { useMemo, useState } from "react";
import { Copy, Check, Search } from "lucide-react";
import { SALES_CALL_LIBRARY } from "@/lib/sales-call-library";
import { fuzzyMatchAny } from "@/lib/fuzzy-search";

// Bibliothèque de questions de closing (retour direct 2026-09-18 : "met
// du contenu et plein de question à poser selon les situations, des
// vrai contenu dédié au closing, question par question, pas mot pour
// mot, organise bien"). Contenu statique (lib/sales-call-library.ts),
// même logique que la bibliothèque Hooks/CTA de Studio créatif : une
// question = une carte copiable, jamais un script à lire en continu.

function CopyButton({ text }: { text: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // Presse-papier indisponible, le texte reste sélectionnable à la main.
        }
      }}
      aria-label={t("Copier")}
      style={{
        display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
        background: copied ? "rgba(var(--ep-ok-rgb),0.15)" : "rgba(var(--ep-shade-rgb),0.3)",
        border: `1px solid ${copied ? "rgba(var(--ep-ok-rgb),0.4)" : "rgba(var(--ep-ink-rgb),0.15)"}`,
        borderRadius: 8, padding: "6px 10px", fontSize: 10.5, fontWeight: 700,
        color: copied ? "var(--ep-ok)" : "rgba(var(--ep-ink-rgb),0.5)", cursor: "pointer",
      }}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? t("Copié") : t("Copier")}
    </button>
  );
}

export default function SalesCallScripts() {
  const t = useT();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | "all">("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SALES_CALL_LIBRARY
      .filter((cat) => activeCategory === "all" || cat.id === activeCategory)
      .map((cat) => ({
        ...cat,
        questions: cat.questions.filter(
          (question) =>
            !q ||
            fuzzyMatchAny([question.text, question.note], q)
        ),
      }))
      .filter((cat) => cat.questions.length > 0);
  }, [query, activeCategory]);

  return (
    <div>
      <div style={{ position: "relative", marginBottom: 14 }}>
        <Search size={13} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "rgba(var(--ep-ink-rgb),0.3)" }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("Chercher une question (ex. prix, réfléchir, conjoint...)")}
          aria-label={t("Chercher une question de closing")}
          style={{
            width: "100%", background: "rgba(var(--ep-shade-rgb),0.4)", border: "1px solid rgba(var(--ep-accent-rgb),0.2)",
            borderRadius: "var(--radius-lg)", color: "var(--ep-ink)", padding: "12px 16px 12px 32px",
            fontSize: 13, outline: "none",
          }}
        />
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => setActiveCategory("all")}
          style={{
            fontSize: 11, fontWeight: 700, padding: "6px 12px", borderRadius: 999, cursor: "pointer",
            border: activeCategory === "all" ? "1px solid var(--ep-accent)" : "1px solid rgba(var(--ep-ink-rgb),0.15)",
            background: activeCategory === "all" ? "rgba(var(--ep-accent-rgb),0.16)" : "rgba(var(--ep-shade-rgb),0.25)",
            color: activeCategory === "all" ? "var(--ep-ink)" : "rgba(var(--ep-ink-rgb),0.55)",
          }}
        >
          {t("Tout")}
        </button>
        {SALES_CALL_LIBRARY.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat.id)}
            style={{
              fontSize: 11, fontWeight: 700, padding: "6px 12px", borderRadius: 999, cursor: "pointer",
              border: activeCategory === cat.id ? "1px solid var(--ep-accent)" : "1px solid rgba(var(--ep-ink-rgb),0.15)",
              background: activeCategory === cat.id ? "rgba(var(--ep-accent-rgb),0.16)" : "rgba(var(--ep-shade-rgb),0.25)",
              color: activeCategory === cat.id ? "var(--ep-ink)" : "rgba(var(--ep-ink-rgb),0.55)",
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-(--ep-s1) border border-dashed border-(--ep-line)/25 rounded-xl py-16 text-center">
          <p className="text-sm text-(--ep-ink)/35">{t("Aucune question ne correspond à \"")}{query}&quot;.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {filtered.map((cat) => (
            <div key={cat.id}>
              <p style={{ fontSize: 13, fontWeight: 800, color: "var(--ep-ink)", margin: "0 0 4px" }}>{cat.label}</p>
              <p style={{ fontSize: 11.5, color: "rgba(var(--ep-ink-rgb),0.4)", margin: "0 0 12px", lineHeight: 1.5 }}>{cat.intro}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {cat.questions.map((q, i) => (
                  <div key={i} className="ep-card" style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <p style={{ margin: 0, fontSize: 13, color: "var(--ep-ink)", lineHeight: 1.55, flex: 1 }}>{q.text}</p>
                      <CopyButton text={q.text} />
                    </div>
                    <p style={{ margin: "6px 0 0", fontSize: 11, color: "rgba(var(--ep-ink-rgb),0.4)", lineHeight: 1.5, fontStyle: "italic" }}>
                      {q.note}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
