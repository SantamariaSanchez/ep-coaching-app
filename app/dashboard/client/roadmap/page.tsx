"use client";

import { useEffect, useState } from "react";
import { createClientSupabase } from "@/lib/supabase-client";
import { Skeleton } from "@/components/ui/Skeleton";
import RoadmapCalendar from "@/components/roadmap/RoadmapCalendar";
import RoadmapEditor from "@/components/roadmap/RoadmapEditor";
import {
  PHASE_COLORS,
  OBJECTIVE_TERM_COLORS,
} from "@/lib/roadmap-colors";
import type { Roadmap, RoadmapPhase, RoadmapObjective } from "@/utils/roadmap";
import { Target, MapPin } from "lucide-react";
import TrainingSubNav from "@/components/ui/TrainingSubNav";

// Pure ISO week helper (no server imports)
function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

interface RoadmapData {
  roadmap: Roadmap;
  phases: RoadmapPhase[];
  objectives: RoadmapObjective[];
}

function ObjectiveCard({
  obj,
  roadmapStart,
}: {
  obj: RoadmapObjective;
  roadmapStart: string;
}) {
  const color = OBJECTIVE_TERM_COLORS[obj.term];
  const termLabel = obj.term === "short" ? "Court terme" : obj.term === "medium" ? "Moyen terme" : "Long terme";

  // Progress bar if quantifiable
  let progressPct: number | null = null;
  // For date-based progress
  if (!obj.is_achieved) {
    const now = Date.now();
    const start = new Date(roadmapStart).getTime();
    const target = new Date(obj.target_date).getTime();
    if (target > start) {
      progressPct = Math.min(100, ((now - start) / (target - start)) * 100);
    }
  }

  const daysLeft = obj.is_achieved
    ? 0
    : Math.ceil(
        (new Date(obj.target_date).getTime() - Date.now()) / 86400000
      );

  return (
    <div
      style={{
        background: "linear-gradient(135deg, var(--color-ep-card) 0%, var(--color-ep-deep) 100%)",
        border: `1px solid ${obj.is_achieved ? "rgba(74,222,128,0.2)" : "rgba(var(--color-ep-red-rgb),0.12)"}`,
        borderRadius: 12,
        padding: 16,
        opacity: obj.is_achieved ? 0.7 : 1,
        position: "relative",
        overflow: "hidden",
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

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
        <div>
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: "0.15em",
            textTransform: "uppercase", color,
          }}>
            {termLabel}
          </span>
          <p style={{
            fontSize: 15, fontWeight: 700, color: obj.is_achieved ? "#4ade80" : "var(--color-ep-light)",
            margin: "4px 0 0", letterSpacing: "-0.01em",
          }}>
            {obj.is_achieved ? "✓ " : ""}{obj.label}
          </p>
        </div>
        {obj.target_value && (
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 18, fontWeight: 800, color, margin: 0, letterSpacing: "-0.03em" }}>
              {obj.target_value}
              <span style={{ fontSize: 11, fontWeight: 500, color: "rgba(var(--color-ep-light-rgb),0.4)" }}>
                {" "}{obj.target_unit ?? ""}
              </span>
            </p>
          </div>
        )}
      </div>

      {progressPct !== null && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ height: 4, background: "rgba(0,0,0,0.4)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${progressPct}%`,
              background: color,
              borderRadius: 2,
              transition: "width 0.8s ease",
            }} />
          </div>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {obj.is_achieved && obj.achieved_at && (
          <span style={{ fontSize: 10, color: "rgba(74,222,128,0.7)" }}>
            ✓ Atteint le{" "}
            {new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(
              new Date(obj.achieved_at + "T12:00:00")
            )}
          </span>
        )}
        {!obj.is_achieved && (
          <span style={{ fontSize: 10, color: "rgba(var(--color-ep-light-rgb),0.35)" }}>
            {daysLeft > 0
              ? `Dans ${daysLeft} jour${daysLeft > 1 ? "s" : ""}`
              : daysLeft === 0
              ? "Aujourd'hui !"
              : `Dépassé de ${Math.abs(daysLeft)} jour${Math.abs(daysLeft) > 1 ? "s" : ""}`}
          </span>
        )}
        <span style={{ fontSize: 10, color: "rgba(var(--color-ep-light-rgb),0.2)", marginLeft: "auto" }}>
          {new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(
            new Date(obj.target_date + "T12:00:00")
          )}
        </span>
      </div>
    </div>
  );
}

export default function ClientRoadmapPage() {
  const [data, setData] = useState<RoadmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [isFree, setIsFree] = useState(false);

  useEffect(() => {
    const supabase = createClientSupabase();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("subscription_status")
        .eq("id", user.id)
        .single();
      setIsFree((profile as { subscription_status: string } | null)?.subscription_status !== "active");

      const res = await fetch(`/api/roadmap/${user.id}`);
      const json = await res.json();
      if (json.roadmap) setData(json as RoadmapData);
      setLoading(false);
    });
  }, []);

  // Free community members build and edit their own road map — no coach review.
  if (!loading && isFree && userId) {
    return (
      <div style={{ padding: "24px 20px 80px", maxWidth: 900, margin: "0 auto" }}>
        <TrainingSubNav />
        <div style={{ marginBottom: 20 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(var(--color-ep-red-rgb),0.6)" }}>
            Road Map — Communauté
          </span>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.04em", color: "var(--color-ep-light)", margin: "4px 0 6px" }}>
            Ma Road Map
          </h1>
          <p style={{ fontSize: 13, color: "rgba(var(--color-ep-light-rgb),0.45)" }}>
            Construis toi-même tes phases et tes objectifs — autonome, sans suivi coach.
          </p>
        </div>
        <RoadmapEditor clientId={userId} />
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: "32px 20px", maxWidth: 700, margin: "0 auto" }}>
        <Skeleton className="h-4 w-24 mb-2" />
        <Skeleton className="h-8 w-48 mb-8" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 24 }}>
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: "32px 20px", maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
        <TrainingSubNav />
        <MapPin size={40} style={{ color: "rgba(var(--color-ep-red-rgb),0.3)", margin: "0 auto 16px" }} strokeWidth={1.5} />
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-ep-light)", letterSpacing: "-0.02em", marginBottom: 8 }}>
          Road Map non configurée
        </h1>
        <p style={{ fontSize: 13, color: "rgba(var(--color-ep-light-rgb),0.4)" }}>
          Ton coach n&apos;a pas encore configuré ta road map.
        </p>
      </div>
    );
  }

  const { roadmap, phases, objectives } = data;
  const today = new Date().toISOString().split("T")[0];

  // Active phase
  const activePhase = phases.find(
    (p) => p.start_date <= today && p.end_date >= today
  );
  const activePhaseCols = activePhase
    ? PHASE_COLORS[activePhase.type as keyof typeof PHASE_COLORS] ?? PHASE_COLORS.custom
    : null;

  const weekNumber = getISOWeek(new Date());

  // Motivation message based on recent perf (use first pending obj)
  const pendingObjectives = objectives.filter((o) => !o.is_achieved);
  const nextShort = pendingObjectives.find((o) => o.term === "short");
  const nextMedium = pendingObjectives.find((o) => o.term === "medium");
  const nextLong = pendingObjectives.find((o) => o.term === "long");

  return (
    <div style={{ padding: "24px 20px 80px", maxWidth: 700, margin: "0 auto" }}>
      <TrainingSubNav />
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(var(--color-ep-red-rgb),0.6)" }}>
          Road Map
        </span>
        <h1 style={{
          fontSize: 28, fontWeight: 800, letterSpacing: "-0.04em",
          color: "var(--color-ep-light)", margin: "4px 0 6px",
        }}>
          Ma Road Map
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: "rgba(var(--color-ep-light-rgb),0.4)" }}>
            Semaine {weekNumber}
          </span>
          {activePhaseCols && (
            <span style={{
              background: activePhaseCols.bg,
              border: `1px solid ${activePhaseCols.border}`,
              color: activePhaseCols.solid,
              borderRadius: 20,
              padding: "2px 10px",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}>
              {activePhaseCols.icon} {activePhase?.label ?? activePhaseCols.label}
            </span>
          )}
        </div>
      </div>

      {/* Objectives summary — 3 columns */}
      {(nextShort || nextMedium || nextLong) && (
        <section style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(var(--color-ep-red-rgb),0.6)", marginBottom: 10 }}>
            <Target size={11} style={{ display: "inline", marginRight: 5, verticalAlign: "middle" }} />
            Mes objectifs
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
            {[nextShort, nextMedium, nextLong].map((obj, i) => {
              if (!obj) return null;
              return (
                <ObjectiveCard key={obj.id} obj={obj} roadmapStart={roadmap.start_date} />
              );
            })}
          </div>
        </section>
      )}

      {/* Calendar */}
      <section>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(var(--color-ep-red-rgb),0.6)", marginBottom: 12 }}>
          Calendrier
        </p>
        <div className="ep-card" style={{ padding: 16 }}>
          {userId && (
            <RoadmapCalendar
              roadmap={roadmap}
              phases={phases}
              objectives={objectives}
              clientId={userId}
              readOnly={true}
            />
          )}
        </div>
      </section>
    </div>
  );
}
