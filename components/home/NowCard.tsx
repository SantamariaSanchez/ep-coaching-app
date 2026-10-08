import Link from "next/link";
import { ChevronRight } from "lucide-react";

// Une seule ligne « maintenant / ensuite » en haut de l'accueil (2026-10-08,
// retour direct : « l'onglet est devenu long, mets vraiment les choses
// utiles »). Remplace la carte « Ma journée » et ses cinq mini-cartes : ce
// qu'il faut faire tout de suite tient en une ligne, le reste est dans les
// tuiles « Je veux » juste en dessous.
export default function NowCard({
  href,
  current,
  next,
  labels,
}: {
  href: string;
  current: { label: string; until: string } | null;
  next: { label: string; at: string } | null;
  labels: { now: string; next: string; free: string; until: string; at: string };
}) {
  if (!current && !next) {
    return (
      <Link href={href} className="ep-press" style={row}>
        <span style={{ ...dot, background: "rgba(74,222,128,0.8)" }} />
        <span style={{ flex: 1, fontSize: 13, color: "rgba(245,237,237,0.6)" }}>{labels.free}</span>
        <ChevronRight size={15} style={{ color: "rgba(245,237,237,0.25)" }} />
      </Link>
    );
  }
  return (
    <Link href={href} className="ep-press" style={row}>
      <span style={{ ...dot, background: current ? "#E01E1E" : "rgba(251,146,60,0.9)", boxShadow: current ? "0 0 10px rgba(224,30,30,0.7)" : "none" }} />
      <span style={{ flex: 1, minWidth: 0 }}>
        {current ? (
          <>
            <span style={line}>
              <span style={tag}>{labels.now}</span>
              <strong style={{ fontWeight: 800 }}>{current.label}</strong>
              <span style={muted}> · {labels.until} {current.until}</span>
            </span>
            {next && (
              <span style={{ ...line, marginTop: 3, fontSize: 11.5, color: "rgba(245,237,237,0.45)" }}>
                {labels.next} : {next.label} · {next.at}
              </span>
            )}
          </>
        ) : (
          next && (
            <span style={line}>
              <span style={tag}>{labels.next}</span>
              <strong style={{ fontWeight: 800 }}>{next.label}</strong>
              <span style={muted}> · {labels.at} {next.at}</span>
            </span>
          )
        )}
      </span>
      <ChevronRight size={15} style={{ color: "rgba(245,237,237,0.25)", flexShrink: 0 }} />
    </Link>
  );
}

const row: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", minHeight: 52, marginBottom: 16,
  borderRadius: 14, background: "linear-gradient(160deg, #170101 0%, #0e0000 100%)", border: "1px solid rgba(137,4,4,0.3)",
  textDecoration: "none", color: "#F5EDED",
};
const dot: React.CSSProperties = { width: 8, height: 8, borderRadius: 999, flexShrink: 0 };
const line: React.CSSProperties = { display: "block", fontSize: 13.5, lineHeight: 1.35, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
const tag: React.CSSProperties = { fontSize: 9.5, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(245,237,237,0.4)", marginRight: 8 };
const muted: React.CSSProperties = { color: "rgba(245,237,237,0.45)", fontWeight: 600 };
