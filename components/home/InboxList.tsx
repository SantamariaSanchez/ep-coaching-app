import Link from "next/link";
import { AlertTriangle, AlertCircle, MessageCircle, ClipboardCheck, ChevronRight, CheckCircle2 } from "lucide-react";

export interface InboxItem {
  id: string;
  kind: "alert-high" | "alert" | "message" | "bilan";
  title: string;
  sub: string;
  href: string;
}

const ICON = { "alert-high": AlertTriangle, alert: AlertCircle, message: MessageCircle, bilan: ClipboardCheck } as const;
const COLOR = { "alert-high": "#f87171", alert: "#fbbf24", message: "#E01E1E", bilan: "#fbbf24" } as const;

// « À traiter » : une seule liste courte qui regroupe ce qui attend une
// action (alertes clients, messages non lus, bilans sans réponse) au lieu de
// trois sections empilées. Rien à traiter : une ligne discrète, pas une carte.
export default function InboxList({ title, items, total, moreHref, moreLabel, emptyLabel }: { title: string; items: InboxItem[]; total: number; moreHref: string; moreLabel: string; emptyLabel: string }) {
  if (items.length === 0) {
    return (
      <p style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "rgba(245,237,237,0.45)", margin: "4px 2px 0" }}>
        <CheckCircle2 size={14} style={{ color: "rgba(74,222,128,0.7)" }} /> {emptyLabel}
      </p>
    );
  }
  return (
    <section aria-label={title}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <p className="ep-label" style={{ margin: 0 }}>
          {title} <span style={{ color: "rgba(245,237,237,0.35)" }}>({total})</span>
        </p>
        {total > items.length && (
          <Link href={moreHref} style={{ fontSize: 12, fontWeight: 700, color: "rgba(245,237,237,0.55)", textDecoration: "none", padding: "6px 2px" }}>
            {moreLabel}
          </Link>
        )}
      </div>
      <div className="ep-card" style={{ padding: 4 }}>
        {items.map((it, i) => {
          const Icon = ICON[it.kind];
          return (
            <Link
              key={it.id}
              href={it.href}
              className="ep-press"
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 10px", minHeight: 52, textDecoration: "none", color: "#F5EDED", borderTop: i === 0 ? "none" : "1px solid rgba(137,4,4,0.18)" }}
            >
              <Icon size={15} style={{ color: COLOR[it.kind], flexShrink: 0 }} strokeWidth={2} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 13, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.title}</span>
                <span style={{ display: "block", fontSize: 11.5, color: "rgba(245,237,237,0.5)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.sub}</span>
              </span>
              <ChevronRight size={14} style={{ color: "rgba(245,237,237,0.22)", flexShrink: 0 }} />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
