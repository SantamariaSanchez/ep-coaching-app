"use client";

import { useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";
import { useT } from "@/components/i18n/I18nProvider";

// Une demande toute prête pour Claude : un bouton copie le texte, l'autre
// ouvre claude.ai avec la demande déjà écrite. Aucune clé d'API côté
// utilisateur : il se sert de son propre compte Claude, et du connecteur
// EP Coaching s'il l'a ajouté (Paramètres > Claude, Notion et objets).
export default function ClaudePrompt({ title, hint, prompt, compact }: { title: string; hint?: string; prompt: string; compact?: boolean }) {
  const t = useT();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

  // Au delà d'une certaine taille, le lien serait tronqué : on ouvre une
  // conversation vide et la personne colle le texte déjà copié.
  const href = prompt.length <= 1800 ? `https://claude.ai/new?q=${encodeURIComponent(prompt)}` : "https://claude.ai/new";

  return (
    <div className="ep-card" style={{ padding: compact ? "12px 14px" : "14px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
      <div>
        <p style={{ margin: 0, fontSize: 13.5, fontWeight: 800, color: "#F5EDED" }}>{title}</p>
        {hint && <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "rgba(245,237,237,0.5)", lineHeight: 1.45 }}>{hint}</p>}
      </div>
      {!compact && (
        <p style={{ margin: 0, fontSize: 12, color: "rgba(245,237,237,0.7)", lineHeight: 1.55, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(245,237,237,0.06)", borderRadius: 10, padding: "8px 10px", maxHeight: 110, overflow: "hidden", whiteSpace: "pre-wrap" }}>
          {prompt.length > 320 ? `${prompt.slice(0, 320)}...` : prompt}
        </p>
      )}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={copy} className="ep-press" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 10, border: "1px solid rgba(245,237,237,0.12)", background: "rgba(245,237,237,0.05)", color: "#F5EDED", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>
          {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? t("Copié") : t("Copier")}
        </button>
        <a href={href} target="_blank" rel="noopener noreferrer" onClick={copy} className="ep-press" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 10, background: "#E01E1E", color: "#fff", fontSize: 12, fontWeight: 900, textDecoration: "none" }}>
          <ExternalLink size={13} /> {t("Ouvrir dans Claude")}
        </a>
      </div>
    </div>
  );
}
