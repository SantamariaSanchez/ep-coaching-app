import { Check, X } from "lucide-react";
import type { HabitScore } from "@/lib/habit-score";

// Purement présentationnel (aucune interaction), donc pas de "use client" —
// le score est déjà calculé côté serveur (voir lib/habit-score.ts) au
// moment du rendu de la page.
function ringColor(score: number): string {
  if (score >= 90) return "var(--ep-ok)";
  if (score >= 70) return "var(--ep-accent)";
  if (score >= 40) return "var(--ep-warn)";
  return "rgba(var(--ep-ink-rgb),0.3)";
}

export default function HabitScoreCard({ habitScore }: { habitScore: HabitScore }) {
  const { score, level, components } = habitScore;
  if (components.length === 0) return null;

  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);
  const color = ringColor(score);

  return (
    <div className="ep-card" style={{ padding: "16px 18px" }}>
      <div className="flex items-center gap-4">
        <div style={{ position: "relative", width: 72, height: 72, flexShrink: 0 }}>
          <svg width={72} height={72} style={{ transform: "rotate(-90deg)" }}>
            <circle cx={36} cy={36} r={radius} fill="none" stroke="rgba(var(--ep-ink-rgb),0.08)" strokeWidth={7} />
            <circle
              cx={36}
              cy={36}
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth={7}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 0.5s ease" }}
            />
          </svg>
          <div
            style={{
              position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 17, fontWeight: 900, color: "var(--ep-ink)",
            }}
          >
            {score}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(var(--ep-ink-rgb),0.35)", margin: "0 0 2px" }}>
            Score du jour
          </p>
          <p style={{ fontSize: 15, fontWeight: 900, color, margin: "0 0 8px" }}>{level}</p>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {components.map((c) => {
              const ok = c.ratio >= 1;
              const partial = c.ratio > 0 && c.ratio < 1;
              return (
                <span key={c.key} className="inline-flex items-center gap-1" style={{ fontSize: 10, color: ok ? "rgba(var(--ep-ok-rgb),0.85)" : "rgba(var(--ep-ink-rgb),0.35)" }}>
                  {ok ? <Check size={11} strokeWidth={2.5} /> : <X size={11} strokeWidth={2.5} />}
                  {c.label}
                  {partial && <span style={{ opacity: 0.7 }}>({Math.round(c.ratio * 100)}%)</span>}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
