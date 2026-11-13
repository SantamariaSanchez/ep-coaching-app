"use client";

import { useMemo, useState } from "react";
import { Copy, Check } from "lucide-react";
import { SALES_CALL_LIBRARY } from "@/lib/sales-call-library";

// Bibliothèque de questions de closing (retour direct 2026-09-18 : "met
// du contenu et plein de question à poser selon les situations, des
// vrai contenu dédié au closing, question par question, pas mot pour
// mot, organise bien"). Contenu statique (lib/sales-call-library.ts),
// même logique que la bibliothèque Hooks/CTA de Studio créatif : une
// question = une carte copiable, jamais un script à lire en continu.

// Version courte (audit 2026-11-13) : une catégorie à la fois, la question
// seule, un tap copie. L'explication reste en infobulle.
export default function SalesCallScripts() {
  const [active, setActive] = useState(SALES_CALL_LIBRARY[0]?.id ?? "");
  const [copied, setCopied] = useState<string | null>(null);
  const cat = useMemo(() => SALES_CALL_LIBRARY.find((c) => c.id === active) ?? SALES_CALL_LIBRARY[0], [active]);
  async function copy(t: string) {
    try { await navigator.clipboard.writeText(t); setCopied(t); setTimeout(() => setCopied(null), 1500); } catch { /* refusé */ }
  }
  return (
    <div>
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, marginBottom: 12 }}>
        {SALES_CALL_LIBRARY.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setActive(c.id)}
            style={{
              flexShrink: 0, whiteSpace: "nowrap", fontSize: 12, fontWeight: 800, padding: "7px 12px", borderRadius: 999, cursor: "pointer",
              border: c.id === cat?.id ? "1px solid var(--ep-accent)" : "1px solid rgba(var(--ep-ink-rgb),0.12)",
              background: c.id === cat?.id ? "rgba(var(--ep-accent-rgb),0.16)" : "transparent",
              color: c.id === cat?.id ? "var(--ep-ink)" : "rgba(var(--ep-ink-rgb),0.55)",
            }}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {cat?.questions.map((q) => (
          <button
            key={q.text}
            type="button"
            title={q.note}
            onClick={() => copy(q.text)}
            style={{
              display: "flex", alignItems: "center", gap: 10, textAlign: "left", width: "100%", cursor: "pointer",
              padding: "11px 12px", borderRadius: 12, border: "1px solid rgba(var(--ep-line-rgb),0.15)",
              background: copied === q.text ? "rgba(var(--ep-ok-rgb),0.1)" : "rgba(var(--ep-shade-rgb),0.25)", color: "var(--ep-ink)",
            }}
          >
            <span style={{ flex: 1, fontSize: 13, lineHeight: 1.45 }}>{q.text}</span>
            {copied === q.text ? <Check size={14} style={{ color: "var(--ep-ok)", flexShrink: 0 }} /> : <Copy size={13} style={{ color: "rgba(var(--ep-ink-rgb),0.3)", flexShrink: 0 }} />}
          </button>
        ))}
      </div>
    </div>
  );
}
