import Link from "next/link";
import { ChevronLeft, ChevronRight, Dumbbell, ClipboardCheck, Apple, Footprints, Moon, Scale, Trophy, Lightbulb } from "lucide-react";
import {
  addDaysToDate,
  buildInsights,
  formatSleepHours,
  formatWeekRange,
  formatWeightDelta,
  type WeeklyReviewData,
} from "@/lib/weekly-review-helpers";

// Revue de la semaine : purement présentationnel (pas de "use client"),
// tout est calculé côté serveur par lib/weekly-review.ts. Partagé entre
// l'espace membre (/dashboard/client/semaine), l'espace "Moi" du coach
// (/dashboard/coach/moi/semaine) et le check-in des membres coachés.

function scoreColor(score: number): string {
  if (score >= 90) return "#4ade80";
  if (score >= 70) return "#E01E1E";
  if (score >= 40) return "#fbbf24";
  if (score > 0) return "rgba(245,237,237,0.3)";
  return "rgba(245,237,237,0.12)";
}

const DOW_SHORT = ["L", "M", "M", "J", "V", "S", "D"];

function ScoreRing({ score }: { score: number | null }) {
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const value = score ?? 0;
  const offset = circumference * (1 - value / 100);
  const color = score != null ? scoreColor(value) : "rgba(245,237,237,0.2)";
  return (
    <div style={{ position: "relative", width: 72, height: 72, flexShrink: 0 }}>
      <svg width={72} height={72} style={{ transform: "rotate(-90deg)" }} aria-hidden>
        <circle cx={36} cy={36} r={radius} fill="none" stroke="rgba(245,237,237,0.08)" strokeWidth={7} />
        {score != null && (
          <circle
            cx={36} cy={36} r={radius} fill="none" stroke={color} strokeWidth={7}
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          />
        )}
      </svg>
      <div
        style={{
          position: "absolute", inset: 0, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", lineHeight: 1,
        }}
      >
        <span style={{ fontSize: 17, fontWeight: 900, color: "#F5EDED" }}>{score != null ? score : "?"}</span>
        <span style={{ fontSize: 8, fontWeight: 700, color: "rgba(245,237,237,0.35)", marginTop: 2 }}>SCORE</span>
      </div>
    </div>
  );
}

function Tile({
  icon: Icon,
  label,
  value,
  sub,
  tone = "neutral",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string | null;
  tone?: "neutral" | "good" | "warn";
}) {
  const valueColor = tone === "good" ? "#4ade80" : tone === "warn" ? "#fbbf24" : "#F5EDED";
  return (
    <div className="ep-card" style={{ padding: "12px 14px", minWidth: 0 }}>
      <p className="ep-label" style={{ margin: "0 0 6px", display: "flex", alignItems: "center", gap: 5, fontSize: 9 }}>
        <Icon size={11} style={{ color: "rgba(224,30,30,0.6)", flexShrink: 0 }} />
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
      </p>
      <p style={{ margin: 0, fontSize: 20, fontWeight: 900, letterSpacing: "-0.02em", color: valueColor, lineHeight: 1.1 }}>
        {value}
      </p>
      {sub && (
        <p style={{ margin: "4px 0 0", fontSize: 11, color: "rgba(245,237,237,0.38)", lineHeight: 1.35, overflowWrap: "anywhere" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

function fr(n: number, digits = 0): string {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export default function WeeklyReview({
  data,
  basePath,
  today,
  canGoNext,
  canGoPrev = true,
}: {
  data: WeeklyReviewData;
  /** Page qui porte la navigation ?semaine=. Null : pas de navigation (check-in). */
  basePath: string | null;
  today: string;
  canGoNext: boolean;
  canGoPrev?: boolean;
}) {
  const insights = buildInsights(data);
  const d = data;
  const days = d.daysElapsed;
  const prevWeek = addDaysToDate(d.weekStart, -7);
  const nextWeek = addDaysToDate(d.weekStart, 7);

  const sessionsTone =
    d.sessionsPlanned && d.sessionsDone >= d.sessionsPlanned ? "good" : d.missedLabels.length > 0 ? "warn" : "neutral";

  return (
    <div className="flex flex-col gap-3">
      {/* En-tête : semaine, plage de dates, score moyen */}
      <div className="ep-card-hero" style={{ padding: "18px" }}>
        <div className="flex items-center gap-4" style={{ position: "relative", zIndex: 1 }}>
          <ScoreRing score={d.avgHabit} />
          <div className="min-w-0 flex-1">
            <p className="ep-section-title" style={{ marginBottom: 2 }}>
              Semaine {d.weekNumber}{d.isCurrentWeek ? " · en cours" : ""}
            </p>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#F5EDED", lineHeight: 1.3 }}>
              {formatWeekRange(d.weekStart)}
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 11, color: "rgba(245,237,237,0.4)", lineHeight: 1.4 }}>
              {d.avgHabit != null
                ? `Score d'habitudes moyen sur ${d.isCurrentWeek ? "les jours écoulés" : "la semaine"}`
                : d.isCurrentWeek && days === 1
                  ? "Le score moyen apparaît dès demain, une fois la première journée terminée."
                  : "Pas encore assez de suivi pour un score moyen."}
            </p>
          </div>
        </div>

        {basePath && (
          <div className="flex items-center justify-between gap-2" style={{ marginTop: 14, position: "relative", zIndex: 1 }}>
            {canGoPrev ? (
              <Link
                href={`${basePath}?semaine=${prevWeek}`}
                className="ep-btn-secondary ep-press"
                style={{ padding: "8px 12px", fontSize: 11, display: "inline-flex", alignItems: "center", gap: 4 }}
              >
                <ChevronLeft size={13} /> Semaine précédente
              </Link>
            ) : (
              <span />
            )}
            {canGoNext && (
              <Link
                href={`${basePath}?semaine=${nextWeek}`}
                className="ep-btn-secondary ep-press"
                style={{ padding: "8px 12px", fontSize: 11, display: "inline-flex", alignItems: "center", gap: 4 }}
              >
                Suivante <ChevronRight size={13} />
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Tuiles chiffrées */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        <Tile
          icon={Dumbbell}
          label="Séances"
          value={d.sessionsPlanned ? `${d.sessionsDone}/${d.sessionsPlanned}` : `${d.sessionsDone}`}
          sub={
            d.missedLabels.length > 0
              ? `Manquée${d.missedLabels.length > 1 ? "s" : ""} : ${d.missedLabels.join(", ")}`
              : d.sessionsPlanned
                ? "prévues au programme"
                : d.sessionsDone > 0 ? "terminées" : "aucune terminée"
          }
          tone={sessionsTone}
        />
        <Tile
          icon={ClipboardCheck}
          label="Bilans"
          value={`${d.bilanDays}/${days}`}
          sub={d.isCurrentWeek ? "jours écoulés" : "jours"}
          tone={d.bilanDays >= days ? "good" : "neutral"}
        />
        <Tile
          icon={Apple}
          label="Nutrition"
          value={`${d.nutritionDays}/${days}`}
          sub={d.avgKcal != null ? `${fr(d.avgKcal)} kcal moy.${d.kcalTarget ? ` / ${fr(d.kcalTarget)}` : ""}` : "jours avec repas notés"}
        />
        <Tile
          icon={Footprints}
          label="Pas"
          value={d.avgSteps != null ? fr(d.avgSteps) : "Non noté"}
          sub={d.avgSteps != null ? (d.stepGoal ? `moy. / objectif ${fr(d.stepGoal)}` : "par jour en moyenne") : null}
          tone={d.avgSteps != null && d.stepGoal && d.avgSteps >= d.stepGoal ? "good" : "neutral"}
        />
        <Tile
          icon={Moon}
          label="Sommeil"
          value={d.avgSleep != null ? formatSleepHours(d.avgSleep) : "Non noté"}
          sub={d.bedtime ? `coucher moyen ${d.bedtime.avg}` : d.avgSleep != null ? "par nuit en moyenne" : null}
        />
        <Tile
          icon={Scale}
          label="Poids moyen"
          value={d.avgWeight != null ? `${fr(d.avgWeight, 1)} kg` : "Non noté"}
          sub={d.weightDelta != null ? `${formatWeightDelta(d.weightDelta)} vs semaine d'avant` : null}
        />
      </div>

      {/* Ce que disent les chiffres */}
      <div className="ep-card" style={{ padding: "16px 18px" }}>
        <p className="ep-section-title" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Lightbulb size={11} /> Ce que disent tes chiffres
        </p>
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
          {insights.map((line, i) => (
            <li key={i} style={{ display: "flex", gap: 8, fontSize: 13, lineHeight: 1.55, color: "rgba(245,237,237,0.75)" }}>
              <span aria-hidden style={{ width: 5, height: 5, borderRadius: 999, background: "#E01E1E", marginTop: 8, flexShrink: 0 }} />
              <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>{line}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Score d'habitudes jour par jour, du lundi au dimanche */}
      <div className="ep-card" style={{ padding: "14px 18px" }}>
        <p className="ep-label" style={{ margin: "0 0 10px", fontSize: 9 }}>Score d&apos;habitudes, jour par jour</p>
        <div className="flex items-end gap-2" style={{ height: 64 }}>
          {d.habitDays.map((p, i) => {
            const future = p.date > today;
            const isToday = p.date === today;
            const h = p.score != null ? Math.max(6, p.score) : 6;
            return (
              <div key={p.date} className="flex-1 flex flex-col items-center gap-1.5" style={{ height: "100%" }}>
                <div style={{ flex: 1, display: "flex", alignItems: "flex-end", width: "100%" }}>
                  <div
                    title={p.score != null ? `${p.score} %` : future ? "À venir" : "Rien de suivi"}
                    style={{
                      width: "100%",
                      height: `${h}%`,
                      borderRadius: 4,
                      background: p.score != null ? scoreColor(p.score) : "rgba(245,237,237,0.06)",
                      border: future ? "1px dashed rgba(245,237,237,0.12)" : "none",
                      opacity: isToday ? 0.7 : 1,
                    }}
                  />
                </div>
                <span style={{ fontSize: 9, fontWeight: isToday ? 900 : 700, color: isToday ? "#E01E1E" : "rgba(245,237,237,0.35)" }}>
                  {DOW_SHORT[i]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Records de la semaine */}
      {d.records.length > 0 && (
        <div className="ep-card" style={{ padding: "14px 18px" }}>
          <p className="ep-section-title" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Trophy size={11} /> Records battus
          </p>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
            {d.records.slice(0, 6).map((r, i) => (
              <li key={i} className="flex items-center justify-between gap-3" style={{ fontSize: 13 }}>
                <span style={{ color: "rgba(245,237,237,0.78)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.exercise}
                </span>
                <span style={{ fontWeight: 800, color: "#fbbf24", flexShrink: 0 }}>
                  {r.weightKg != null ? `${fr(r.weightKg, r.weightKg % 1 === 0 ? 0 : 1)} kg` : ""}
                  {r.reps ? ` x ${r.reps}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
