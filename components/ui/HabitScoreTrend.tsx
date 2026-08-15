import type { DailyHabitPoint } from "@/lib/habit-score";

// Complète HabitScoreCard.tsx (score du jour) avec une vue sur 7 jours et
// un streak — la partie "reste pour une prochaine passe" notée au moment
// où le score du jour a été livré (2026-08-15). Purement présentationnel,
// pas de "use client" : tout est déjà calculé côté serveur.

function barColor(score: number): string {
  if (score >= 90) return "#4ade80";
  if (score >= 70) return "#E01E1E";
  if (score >= 40) return "#fbbf24";
  if (score > 0) return "rgba(245,237,237,0.25)";
  return "rgba(245,237,237,0.1)";
}

const DOW_LABELS = ["D", "L", "M", "M", "J", "V", "S"];

function dowLabel(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return DOW_LABELS[d.getDay()];
}

export default function HabitScoreTrend({
  points,
  streak,
}: {
  points: DailyHabitPoint[];
  streak: number;
}) {
  if (points.length === 0) return null;
  const today = points[points.length - 1]?.date;

  return (
    <div className="ep-card" style={{ padding: "14px 18px" }}>
      <div className="flex items-center justify-between mb-3">
        <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(245,237,237,0.35)", margin: 0 }}>
          7 derniers jours
        </p>
        {streak > 0 && (
          <span
            style={{
              fontSize: 10, fontWeight: 800, color: "#fbbf24",
              background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.25)",
              borderRadius: 999, padding: "2px 8px",
            }}
          >
            🔥 {streak}j de suite
          </span>
        )}
      </div>
      <div className="flex items-end gap-2" style={{ height: 56 }}>
        {points.map((p) => {
          const isToday = p.date === today;
          const heightPct = Math.max(6, p.score);
          return (
            <div key={p.date} className="flex-1 flex flex-col items-center gap-1.5" style={{ height: "100%" }}>
              <div style={{ flex: 1, display: "flex", alignItems: "flex-end", width: "100%" }}>
                <div
                  title={`${p.score}%`}
                  style={{
                    width: "100%",
                    height: `${heightPct}%`,
                    minHeight: 4,
                    borderRadius: 4,
                    background: barColor(p.score),
                    border: isToday ? "1px solid rgba(245,237,237,0.5)" : "none",
                    transition: "height 0.4s ease",
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: 9, fontWeight: isToday ? 800 : 600,
                  color: isToday ? "#F5EDED" : "rgba(245,237,237,0.3)",
                }}
              >
                {dowLabel(p.date)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
