import type { Kpi } from "@/lib/staff-kpis";

const TONE: Record<NonNullable<Kpi["tone"]>, string> = {
  good: "#4ade80",
  warn: "#facc15",
  bad: "#f87171",
  neutral: "#F5EDED",
};

export default function KpiGrid({ kpis }: { kpis: Kpi[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 10 }}>
      {kpis.map((k) => (
        <div key={k.label} className="ep-card" style={{ padding: "14px 15px" }}>
          <p style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(245,237,237,0.4)", margin: "0 0 6px", lineHeight: 1.35 }}>
            {k.label}
          </p>
          <p style={{ fontSize: 19, fontWeight: 900, color: TONE[k.tone ?? "neutral"], margin: 0, lineHeight: 1.2, letterSpacing: "-0.02em" }}>
            {k.value}
          </p>
          {k.hint && <p style={{ fontSize: 10.5, color: "rgba(245,237,237,0.35)", margin: "5px 0 0", lineHeight: 1.4 }}>{k.hint}</p>}
        </div>
      ))}
    </div>
  );
}
