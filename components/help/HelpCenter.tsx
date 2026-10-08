"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, PlayCircle, Search } from "lucide-react";
import { GUIDES, type HelpSpace } from "@/lib/help-content";
import { restartTour } from "@/components/help/WelcomeTour";
import { fuzzyMatchAny } from "@/lib/fuzzy-search";
import BackLink from "@/components/ui/BackLink";

// Aide et tutoriels (2026-09-30) : la visite en 5 écrans, puis des guides
// courts, pas à pas, filtrés selon le profil.

const COACH_PATHS: Record<string, string> = { agenda: "moi/agenda", bilan: "moi/bilan" };

export default function HelpCenter({ space }: { space: HelpSpace }) {
  const t = useT();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const base = `/dashboard/${space}`;
  const guides = GUIDES.filter((g) => g.for.includes(space)).filter((g) => !q || fuzzyMatchAny([g.title, g.steps.join(" ")], q));

  return (
    <div className="page-transition" style={{ padding: "22px 16px 110px", maxWidth: 720, margin: "0 auto" }}>
      <BackLink fallback={space === "staff" ? "/equipe" : `/dashboard/${space}/plus`} />
      <h1 className="ep-h1" style={{ marginBottom: 4 }}>{t("Aide et tutoriels")}</h1>
      <p style={{ fontSize: 13, color: "rgba(245,237,237,0.5)", margin: "0 0 16px" }}>{t("Tout ce qu'il faut pour utiliser l'appli sans te poser de question.")}</p>

      <button type="button" onClick={restartTour} className="ep-card-hero" style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", marginBottom: 16, cursor: "pointer", textAlign: "left", color: "#F5EDED" }}>
        <PlayCircle size={26} style={{ color: "#E01E1E", flexShrink: 0 }} />
        <span>
          <span style={{ display: "block", fontSize: 15, fontWeight: 900 }}>{t("Découvrir l'appli en 1 minute")}</span>
          <span style={{ display: "block", fontSize: 12, color: "rgba(245,237,237,0.55)" }}>{t("La visite guidée, écran par écran")}</span>
        </span>
      </button>

      <div className="ep-card" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", marginBottom: 12 }}>
        <Search size={16} style={{ color: "rgba(245,237,237,0.4)" }} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Chercher un tuto")} aria-label={t("Chercher un tuto")} style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#F5EDED", fontSize: 14 }} />
      </div>

      <div className="ep-card" style={{ padding: 0, overflow: "hidden" }}>
        {guides.map((g, idx) => {
          const isOpen = open === g.id;
          const href = g.href ? `${base}/${space === "coach" ? COACH_PATHS[g.href] ?? g.href : g.href}` : null;
          return (
            <div key={g.id} style={{ borderTop: idx ? "1px solid rgba(245,237,237,0.06)" : "none" }}>
              <button type="button" onClick={() => setOpen(isOpen ? null : g.id)} aria-expanded={isOpen} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "15px 14px", minHeight: 52, background: "none", border: "none", cursor: "pointer", color: "#F5EDED", textAlign: "left", fontSize: 14.5, fontWeight: 800 }}>
                <span style={{ flex: 1 }}>{g.title}</span>
                {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {isOpen && (
                <div style={{ padding: "0 14px 16px" }}>
                  <ol style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8 }}>
                    {g.steps.map((s, k) => (
                      <li key={k} style={{ fontSize: 13.5, color: "rgba(245,237,237,0.78)", lineHeight: 1.55 }}>{s}</li>
                    ))}
                  </ol>
                  {href && (
                    <Link href={href} style={{ display: "inline-block", marginTop: 12, padding: "10px 14px", borderRadius: 12, background: "#E01E1E", color: "#fff", fontSize: 12, fontWeight: 900, textDecoration: "none" }}>
                      {g.cta ?? t("Y aller")}
                    </Link>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {guides.length === 0 && <p style={{ padding: 16, fontSize: 13, color: "rgba(245,237,237,0.5)", margin: 0 }}>{t("Aucun tuto ne correspond.")}</p>}
      </div>
    </div>
  );
}
