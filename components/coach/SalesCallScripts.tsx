"use client";

import { useMemo, useState } from "react";
import { Copy, Check, Search } from "lucide-react";
import { SALES_CALL_LIBRARY } from "@/lib/sales-call-library";

// Bibliothèque de questions de closing (retour direct 2026-09-18 : "met
// du contenu et plein de question à poser selon les situations, des
// vrai contenu dédié au closing, question par question, pas mot pour
// mot, organise bien"). Contenu statique (lib/sales-call-library.ts),
// même logique que la bibliothèque Hooks/CTA de Studio créatif : une
// question = une carte copiable, jamais un script à lire en continu.

function CopyButton({ text }: { text: string }) {
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
      aria-label="Copier"
      style={{
        display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
        background: copied ? "rgba(74,222,128,0.15)" : "rgba(0,0,0,0.3)",
        border: `1px solid ${copied ? "rgba(74,222,128,0.4)" : "rgba(245,237,237,0.15)"}`,
        borderRadius: 8, padding: "6px 10px", fontSize: 10.5, fontWeight: 700,
        color: copied ? "#4ade80" : "rgba(245,237,237,0.5)", cursor: "pointer",
      }}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "Copié" : "Copier"}
    </button>
  );
}

export default function SalesCallScripts() {
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
            question.text.toLowerCase().includes(q) ||
            question.note.toLowerCase().includes(q)
        ),
      }))
      .filter((cat) => cat.questions.length > 0);
  }, [query, activeCategory]);

  return (
    <div>
      <div style={{ position: "relative", marginBottom: 14 }}>
        <Search size={13} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "rgba(245,237,237,0.3)" }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Chercher une question (ex. prix, réfléchir, conjoint...)"
          aria-label="Chercher une question de closing"
          style={{
            width: "100%", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(224,30,30,0.2)",
            borderRadius: "var(--radius-lg)", color: "#F5EDED", padding: "12px 16px 12px 32px",
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
            border: activeCategory === "all" ? "1px solid #E01E1E" : "1px solid rgba(245,237,237,0.15)",
            background: activeCategory === "all" ? "rgba(224,30,30,0.16)" : "rgba(0,0,0,0.25)",
            color: activeCategory === "all" ? "#F5EDED" : "rgba(245,237,237,0.55)",
          }}
        >
          Tout
        </button>
        {SALES_CALL_LIBRARY.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat.id)}
            style={{
              fontSize: 11, fontWeight: 700, padding: "6px 12px", borderRadius: 999, cursor: "pointer",
              border: activeCategory === cat.id ? "1px solid #E01E1E" : "1px solid rgba(245,237,237,0.15)",
              background: activeCategory === cat.id ? "rgba(224,30,30,0.16)" : "rgba(0,0,0,0.25)",
              color: activeCategory === cat.id ? "#F5EDED" : "rgba(245,237,237,0.55)",
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-[#1f0101] border border-dashed border-[#890404]/25 rounded-xl py-16 text-center">
          <p className="text-sm text-[#F5EDED]/35">Aucune question ne correspond à &quot;{query}&quot;.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {filtered.map((cat) => (
            <div key={cat.id}>
              <p style={{ fontSize: 13, fontWeight: 800, color: "#F5EDED", margin: "0 0 4px" }}>{cat.label}</p>
              <p style={{ fontSize: 11.5, color: "rgba(245,237,237,0.4)", margin: "0 0 12px", lineHeight: 1.5 }}>{cat.intro}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {cat.questions.map((q, i) => (
                  <div key={i} className="ep-card" style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <p style={{ margin: 0, fontSize: 13, color: "#F5EDED", lineHeight: 1.55, flex: 1 }}>{q.text}</p>
                      <CopyButton text={q.text} />
                    </div>
                    <p style={{ margin: "6px 0 0", fontSize: 11, color: "rgba(245,237,237,0.4)", lineHeight: 1.5, fontStyle: "italic" }}>
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
