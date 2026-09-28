import { Target } from "lucide-react";
import { PHASE_COLORS, OBJECTIVE_TERM_COLORS } from "@/lib/roadmap-colors";
import { countRoadmapWeeks, diffDaysIso, formatIsoFr, roadmapWeekIndex } from "@/lib/roadmap-weeks";
import type { Roadmap, RoadmapPhase, RoadmapObjective } from "@/utils/roadmap";
import type { PhasePilot } from "@/lib/phase-pilot";

// Résumé de road map (semaine en cours, phase active, objectifs court /
// moyen / long terme), extrait de components/client/RoadmapView.tsx et
// components/coach/CoachMoiRoadmapView.tsx qui le dupliquaient.
//
// Audit 2026-09-28 :
// - "Semaine {n}" affichait la semaine ISO de l'ANNÉE (getISOWeek), sans
//   aucun rapport avec la road map : c'est maintenant "Semaine 7 sur 69",
//   la même numérotation que les "S7" du calendrier (lib/roadmap-weeks.ts) ;
// - la barre d'un objectif montrait uniquement le temps écoulé, jamais le
//   réel : pour un objectif de poids, elle suit désormais la vraie pesée
//   (poids de départ vers poids cible), sinon elle est libellée "Temps écoulé"
//   pour ne plus passer pour une progression.

export interface RoadmapData {
  roadmap: Roadmap;
  phases: RoadmapPhase[];
  objectives: RoadmapObjective[];
}

function fmt(iso: string, withYear = false): string {
  return formatIsoFr(iso, withYear ? { day: "numeric", month: "short", year: "numeric" } : { day: "numeric", month: "short" });
}

function nf(n: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(n);
}

export function RoadmapStatusLine({
  roadmap,
  phases,
  today,
  perspective = "self",
}: {
  roadmap: Roadmap;
  phases: RoadmapPhase[];
  today: string;
  /** "coach" : un coach regarde la road map d'un client (pas de tutoiement). */
  perspective?: "self" | "coach";
}) {
  const total = countRoadmapWeeks(roadmap.start_date, roadmap.end_date);
  const week = roadmapWeekIndex(roadmap.start_date, today);
  const own = perspective === "self";
  const text =
    today < roadmap.start_date
      ? `${own ? "Ta" : "La"} road map démarre le ${fmt(roadmap.start_date, true)}`
      : today > roadmap.end_date
      ? `Road map terminée le ${fmt(roadmap.end_date, true)}`
      : `Semaine ${week} sur ${total} de ${own ? "ta" : "sa"} road map`;

  const activePhase = phases.find((p) => p.start_date <= today && p.end_date >= today) ?? null;
  const cols = activePhase
    ? PHASE_COLORS[activePhase.type as keyof typeof PHASE_COLORS] ?? PHASE_COLORS.custom
    : null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <span style={{ fontSize: 12, color: "rgba(245,237,237,0.45)" }}>{text}</span>
      {cols && activePhase && (
        <span
          style={{
            background: cols.bg,
            border: `1px solid ${cols.border}`,
            color: cols.solid,
            borderRadius: 20,
            padding: "2px 10px",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            maxWidth: "100%",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {cols.icon} {activePhase.label || cols.label}
        </span>
      )}
    </div>
  );
}

export function ObjectiveCard({
  obj,
  roadmapStart,
  today,
  weights,
}: {
  obj: RoadmapObjective;
  roadmapStart: string;
  today: string;
  weights?: PhasePilot["weights"] | null;
}) {
  const color = OBJECTIVE_TERM_COLORS[obj.term];
  const termLabel = obj.term === "short" ? "Court terme" : obj.term === "medium" ? "Moyen terme" : "Long terme";
  const target = obj.target_value != null ? Number(obj.target_value) : null;

  // Vraie progression pour un objectif de poids : de la pesée de départ
  // (même règle que checkWeightObjectiveAchievements) vers la cible.
  let progressPct: number | null = null;
  let progressLabel: string | null = null;
  const startKg = weights?.roadmapStartKg ?? null;
  const latest = weights?.latest ?? null;
  if (!obj.is_achieved) {
    if (obj.type === "weight" && target != null && startKg != null && latest && target !== startKg) {
      progressPct = Math.min(100, Math.max(0, ((latest.kg - startKg) / (target - startKg)) * 100));
      progressLabel = `Réel : ${nf(latest.kg)} kg (départ ${nf(startKg)} kg)`;
    } else {
      const span = diffDaysIso(roadmapStart, obj.target_date);
      if (span > 0) {
        progressPct = Math.min(100, Math.max(0, (diffDaysIso(roadmapStart, today) / span) * 100));
        progressLabel = "Temps écoulé";
      }
    }
  }

  const daysLeft = obj.is_achieved ? 0 : diffDaysIso(today, obj.target_date);

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #1A0101 0%, #0D0000 100%)",
        border: `1px solid ${obj.is_achieved ? "rgba(74,222,128,0.2)" : "rgba(224,30,30,0.12)"}`,
        borderRadius: 12,
        padding: 16,
        opacity: obj.is_achieved ? 0.7 : 1,
        position: "relative",
        overflow: "hidden",
        minWidth: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0, left: 0, right: 0,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
        }}
      />

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
        <div style={{ minWidth: 0 }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color }}>
            {termLabel}
          </span>
          <p style={{
            fontSize: 15, fontWeight: 700, color: obj.is_achieved ? "#4ade80" : "#F5EDED",
            margin: "4px 0 0", letterSpacing: "-0.01em", overflowWrap: "anywhere",
          }}>
            {obj.is_achieved ? "✓ " : ""}{obj.label || "Objectif"}
          </p>
        </div>
        {target != null && (
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <p style={{ fontSize: 18, fontWeight: 800, color, margin: 0, letterSpacing: "-0.03em" }}>
              {nf(target)}
              <span style={{ fontSize: 11, fontWeight: 500, color: "rgba(245,237,237,0.4)" }}>
                {" "}{obj.target_unit ?? ""}
              </span>
            </p>
          </div>
        )}
      </div>

      {progressPct !== null && (
        <div style={{ marginBottom: 8 }}>
          <div
            role="progressbar"
            aria-label={progressLabel ?? "Progression"}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progressPct)}
            style={{ height: 4, background: "rgba(0,0,0,0.4)", borderRadius: 2, overflow: "hidden" }}
          >
            <div style={{
              height: "100%",
              width: `${progressPct}%`,
              background: color,
              borderRadius: 2,
              transition: "width 0.8s ease",
            }} />
          </div>
          {progressLabel && (
            <p style={{ fontSize: 9.5, color: "rgba(245,237,237,0.35)", margin: "4px 0 0" }}>{progressLabel}</p>
          )}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {obj.is_achieved && obj.achieved_at && (
          <span style={{ fontSize: 10, color: "rgba(74,222,128,0.7)" }}>
            ✓ Atteint le {fmt(obj.achieved_at)}
          </span>
        )}
        {!obj.is_achieved && (
          <span style={{ fontSize: 10, color: "rgba(245,237,237,0.35)" }}>
            {daysLeft > 0
              ? `Dans ${daysLeft} jour${daysLeft > 1 ? "s" : ""}`
              : daysLeft === 0
              ? "Aujourd'hui !"
              : `Dépassé de ${Math.abs(daysLeft)} jour${Math.abs(daysLeft) > 1 ? "s" : ""}`}
          </span>
        )}
        <span style={{ fontSize: 10, color: "rgba(245,237,237,0.2)", marginLeft: "auto" }}>
          {fmt(obj.target_date, true)}
        </span>
      </div>
    </div>
  );
}

export function RoadmapObjectivesSummary({
  roadmap,
  objectives,
  today,
  weights,
  title = "Mes objectifs",
}: {
  roadmap: Roadmap;
  objectives: RoadmapObjective[];
  today: string;
  weights?: PhasePilot["weights"] | null;
  title?: string;
}) {
  const pending = objectives.filter((o) => !o.is_achieved);
  const picks = [
    pending.find((o) => o.term === "short"),
    pending.find((o) => o.term === "medium"),
    pending.find((o) => o.term === "long"),
  ].filter((o): o is RoadmapObjective => !!o);

  if (picks.length === 0) return null;

  return (
    <section style={{ marginBottom: 28 }}>
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(224,30,30,0.6)", marginBottom: 10 }}>
        <Target size={11} style={{ display: "inline", marginRight: 5, verticalAlign: "middle" }} />
        {title}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
        {picks.map((obj) => (
          <ObjectiveCard key={obj.id} obj={obj} roadmapStart={roadmap.start_date} today={today} weights={weights} />
        ))}
      </div>
    </section>
  );
}
