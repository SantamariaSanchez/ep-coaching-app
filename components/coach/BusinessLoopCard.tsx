"use client";

import { useState } from "react";
import { ChevronDown, Workflow } from "lucide-react";
import { useT } from "@/components/i18n/I18nProvider";
import type { LoopReport } from "@/lib/business-loop";

const COLORS = { ok: "var(--ep-ok)", warn: "var(--ep-yellow)", bad: "var(--ep-bad)" } as const;

// Le circuit d'EP Coaching en un coup d'œil (26/11) : le maillon qui bloque
// en premier, son action, et le détail de tous les maillons en dessous.
export default function BusinessLoopCard({ report }: { report: LoopReport }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const b = report.bottleneck;
  return (
    <div className="ep-card" style={{ padding: "12px 14px", marginBottom: 12, border: b ? `1px solid ${COLORS[b.tone]}` : undefined }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{ width: "100%", display: "flex", alignItems: "flex-start", gap: 10, background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left", color: "var(--ep-ink)" }}
      >
        <Workflow size={16} style={{ color: b ? COLORS[b.tone] : "var(--ep-ok)", flexShrink: 0, marginTop: 2 }} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(var(--ep-ink-rgb),0.45)" }}>
            {t("Le maillon qui bloque ton business")}
          </span>
          <span style={{ display: "block", fontSize: 13.5, fontWeight: 800, marginTop: 2 }}>
            {b ? `${b.label} : ${b.value}` : t("Tout le circuit est au vert")}
          </span>
          {b?.action && <span style={{ display: "block", fontSize: 12, color: "rgba(var(--ep-ink-rgb),0.65)", marginTop: 3, lineHeight: 1.45 }}>{b.action}</span>}
        </span>
        <ChevronDown size={16} style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform .2s", color: "rgba(var(--ep-ink-rgb),0.4)" }} />
      </button>
      {open && (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
          {report.steps.map((s) => (
            <div key={s.key} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <span aria-hidden style={{ width: 8, height: 8, borderRadius: 999, background: COLORS[s.tone], marginTop: 5, flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 12.5, fontWeight: 800, color: "var(--ep-ink)" }}>
                  {s.label} <span style={{ fontWeight: 600, color: "rgba(var(--ep-ink-rgb),0.55)" }}>· {s.value}</span>
                </p>
                {s.action && <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "rgba(var(--ep-ink-rgb),0.55)", lineHeight: 1.4 }}>{s.owner === "claude" ? "Claude : " : ""}{s.action}</p>}
              </div>
            </div>
          ))}
          <p style={{ margin: "4px 0 0", fontSize: 11, color: "rgba(var(--ep-ink-rgb),0.45)", lineHeight: 1.45 }}>{report.writingReason}</p>
        </div>
      )}
    </div>
  );
}
