"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { CHANNEL_LABELS, type StaffTemplate } from "@/lib/staff-templates";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          window.prompt("Copie le texte :", text);
        }
      }}
      style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "1px solid rgba(224,30,30,0.35)", borderRadius: 8, color: copied ? "#4ade80" : "#F5EDED", fontSize: 11, fontWeight: 700, padding: "6px 10px", cursor: "pointer", flexShrink: 0 }}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "Copié" : "Copier"}
    </button>
  );
}

// Les modèles fournis pour le métier (en lecture, prêts à copier). Les
// modèles perso de la personne sont gérés juste en dessous, dans la liste
// éditable habituelle.
export default function TemplatesLibrary({ templates }: { templates: StaffTemplate[] }) {
  if (templates.length === 0) return null;
  return (
    <section style={{ marginBottom: 26 }}>
      <p className="ep-label" style={{ marginBottom: 8 }}>Modèles de ton métier ({templates.length})</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 10 }}>
        {templates.map((t) => (
          <div key={t.title} className="ep-card" style={{ padding: "13px 15px", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 6 }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13.5, fontWeight: 800, color: "#F5EDED", margin: "0 0 2px" }}>{t.title}</p>
                <p style={{ fontSize: 11, color: "rgba(245,237,237,0.45)", margin: 0 }}>
                  {CHANNEL_LABELS[t.channel]} · {t.when}
                </p>
              </div>
              <CopyButton text={t.body} />
            </div>
            <p style={{ fontSize: 12.5, color: "rgba(245,237,237,0.72)", lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap", padding: "10px 12px", borderRadius: 10, background: "rgba(0,0,0,0.25)", border: "1px solid rgba(245,237,237,0.05)" }}>{t.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
