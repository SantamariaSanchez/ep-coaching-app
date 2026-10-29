import Link from "next/link";
import { Crosshair, ChevronRight } from "lucide-react";
import { getT } from "@/lib/i18n-server";
import { isPositioningDone, oneLiner, type Positioning } from "@/lib/positioning";

// Le positionnement se pose une fois : tant qu'il n'est pas fait, un bandeau
// invite à le poser ; ensuite il devient un résumé d'une ligne, modifiable.
export default async function PositioningSummaryCard({ positioning }: { positioning: Positioning }) {
  const t = await getT();
  const done = isPositioningDone(positioning);
  const line = done ? oneLiner(positioning) : "";
  return (
    <Link
      href="/dashboard/coach/positionnement"
      className="ep-card"
      style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", marginBottom: 14, textDecoration: "none", color: "inherit" }}
    >
      <Crosshair size={18} style={{ flexShrink: 0, color: "var(--ep-accent-hi2)" }} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "rgba(var(--ep-ink-rgb),0.5)" }}>
          {done ? t("Mon positionnement") : t("À poser une seule fois")}
        </p>
        <p style={{ margin: "2px 0 0", fontSize: 13.5, fontWeight: 700, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
          {done ? line : t("Pose ta niche et ton avatar en 5 minutes : tes scripts, ta bio et Claude s'en servent ensuite.")}
        </p>
      </div>
      <span style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 2, fontSize: 12, fontWeight: 800, color: "var(--ep-accent-hi2)" }}>
        {done ? t("Modifier") : t("Commencer")}
        <ChevronRight size={14} />
      </span>
    </Link>
  );
}
