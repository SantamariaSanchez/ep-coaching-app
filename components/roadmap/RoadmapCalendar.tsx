"use client";

import { useEffect, useRef, useState } from "react";
import { X, CheckCircle2, XCircle, ChevronRight } from "lucide-react";
import type { Roadmap, RoadmapPhase, RoadmapObjective } from "@/utils/roadmap";
import {
  PHASE_COLORS,
  WEEK_PERFORMANCE_COLORS,
  OBJECTIVE_TERM_COLORS,
  getWeekPerformanceColor,
  type PerformanceKey,
} from "@/lib/roadmap-colors";
import { getWeekStats, type WeekStat } from "@/lib/roadmap-stats";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RoadmapCalendarProps {
  roadmap: Roadmap;
  phases: RoadmapPhase[];
  objectives: RoadmapObjective[];
  weekStats?: WeekStat[];
  clientId: string;
  readOnly?: boolean;
  onWeekClick?: (weekStart: Date) => void;
}

const DAYS_FR = ["L", "M", "M", "J", "V", "S", "D"];
const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

// ── Helpers ────────────────────────────────────────────────────────────────

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function toISO(d: Date): string {
  return d.toISOString().split("T")[0];
}

function getPhaseForDate(phases: RoadmapPhase[], dateStr: string): RoadmapPhase | null {
  return phases.find((p) => p.start_date <= dateStr && p.end_date >= dateStr) ?? null;
}

function getObjectivesForWeek(
  objectives: RoadmapObjective[],
  weekStart: string,
  weekEnd: string
): RoadmapObjective[] {
  return objectives.filter(
    (o) => o.target_date >= weekStart && o.target_date <= weekEnd
  );
}

function getMondayOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  return monday;
}

// Build array of all weeks between start_date and end_date
function buildWeeks(start: string, end: string) {
  const weeks: { weekStart: string; weekEnd: string; month: number; year: number }[] = [];
  let current = getMondayOfWeek(new Date(start));
  const endDate = new Date(end);

  while (current <= endDate) {
    const weekEnd = addDays(current, 6);
    // Use the Monday's month for grouping
    weeks.push({
      weekStart: toISO(current),
      weekEnd: toISO(weekEnd),
      month: current.getMonth(),
      year: current.getFullYear(),
    });
    current = addDays(current, 7);
  }
  return weeks;
}

// ── Phase timeline bar ────────────────────────────────────────────────────────

function PhaseTimelineBar({ phases, startDate, endDate }: {
  phases: RoadmapPhase[];
  startDate: string;
  endDate: string;
}) {
  const totalDays = Math.max(
    1,
    (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000
  );

  return (
    <div style={{ display: "flex", height: 28, borderRadius: 8, overflow: "hidden", marginBottom: 8 }}>
      {phases.map((phase) => {
        const pStart = Math.max(
          0,
          (new Date(phase.start_date).getTime() - new Date(startDate).getTime()) / 86400000
        );
        const pEnd = Math.min(
          totalDays,
          (new Date(phase.end_date).getTime() - new Date(startDate).getTime()) / 86400000
        );
        const width = Math.max(0, ((pEnd - pStart) / totalDays) * 100);
        const colors = PHASE_COLORS[phase.type as keyof typeof PHASE_COLORS] ?? PHASE_COLORS.custom;

        return (
          <div
            key={phase.id}
            title={`${colors.icon} ${phase.label}`}
            style={{
              width: `${width}%`,
              background: colors.solid,
              opacity: 0.85,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              fontWeight: 700,
              color: "#fff",
              overflow: "hidden",
              whiteSpace: "nowrap",
              borderRight: "1px solid rgba(0,0,0,0.2)",
            }}
          >
            {width > 8 ? `${colors.icon} ${phase.label}` : ""}
          </div>
        );
      })}
    </div>
  );
}

// ── Week detail modal ─────────────────────────────────────────────────────────

function WeekDetailModal({
  weekStart,
  weekEnd,
  phases,
  objectives,
  stat,
  readOnly,
  onClose,
  onToggleObjective,
}: {
  weekStart: string;
  weekEnd: string;
  phases: RoadmapPhase[];
  objectives: RoadmapObjective[];
  stat: WeekStat | null;
  readOnly: boolean;
  onClose: () => void;
  onToggleObjective?: (id: string, achieved: boolean) => void;
}) {
  const phase = getPhaseForDate(phases, weekStart);
  const weekObjectives = getObjectivesForWeek(objectives, weekStart, weekEnd);
  const perf = stat?.performanceKey ?? "empty";
  const perfData = WEEK_PERFORMANCE_COLORS[perf];

  const fmt = (d: string) =>
    new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" }).format(
      new Date(d + "T12:00:00")
    );

  // Build 7 days
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(new Date(weekStart + "T12:00:00"), i);
    return toISO(d);
  });

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        background: "rgba(0,0,0,0.7)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          background: "linear-gradient(135deg, #1A0101 0%, #0D0000 100%)",
          border: "1px solid rgba(224,30,30,0.2)",
          borderRadius: "16px 16px 0 0",
          padding: "24px 20px 32px",
          maxHeight: "85vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(224,30,30,0.6)" }}>
              Détail de la semaine
            </p>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: "#F5EDED", letterSpacing: "-0.02em", margin: "2px 0 0" }}>
              {fmt(weekStart)} à {fmt(weekEnd)}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "rgba(245,237,237,0.4)", cursor: "pointer", padding: 4 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Phase badge */}
        {phase && (
          <div style={{ marginBottom: 16 }}>
            {(() => {
              const c = PHASE_COLORS[phase.type as keyof typeof PHASE_COLORS] ?? PHASE_COLORS.custom;
              return (
                <span style={{
                  background: c.bg,
                  border: `1px solid ${c.border}`,
                  color: c.solid,
                  borderRadius: 20,
                  padding: "3px 12px",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase" as const,
                }}>
                  {c.icon} {phase.label}
                </span>
              );
            })()}
          </div>
        )}

        {/* Performance score */}
        <div style={{
          background: "rgba(0,0,0,0.3)",
          borderRadius: 10,
          padding: "12px 16px",
          marginBottom: 16,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(245,237,237,0.35)" }}>
              Performance
            </span>
            <span style={{
              background: perfData.bg,
              borderRadius: 20,
              padding: "2px 10px",
              fontSize: 10,
              fontWeight: 700,
              color: "#fff",
            }}>
              {perfData.label}
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {[
              {
                label: "Check-in",
                ok: stat?.checkinExists,
                display: stat?.checkinExists ? "✓ Soumis" : "✗ Manquant",
              },
              {
                label: "Nutrition",
                ok: (stat?.nutritionDays ?? 0) >= 5,
                display: `${stat?.nutritionDays ?? 0}/7 jours`,
              },
              {
                label: "Entraînement",
                ok: (stat?.sessionsPlanned ?? 0) === 0 || (stat?.sessionsDone ?? 0) >= (stat?.sessionsPlanned ?? 0),
                display: `${stat?.sessionsDone ?? 0}/${stat?.sessionsPlanned ?? 0}`,
              },
            ].map((item) => (
              <div key={item.label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: item.ok ? "#4ade80" : "#ef4444", marginBottom: 2 }}>
                  {item.display}
                </div>
                <div style={{ fontSize: 9, color: "rgba(245,237,237,0.3)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Objectives this week */}
        {weekObjectives.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(245,237,237,0.35)", marginBottom: 8 }}>
              Objectifs de la semaine
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {weekObjectives.map((obj) => (
                <div key={obj.id} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: "rgba(0,0,0,0.3)",
                  borderRadius: 8,
                  padding: "10px 12px",
                  opacity: obj.is_achieved ? 0.6 : 1,
                }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: OBJECTIVE_TERM_COLORS[obj.term],
                    flexShrink: 0,
                  }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#F5EDED", margin: 0 }}>
                      {obj.is_achieved ? "✓ " : ""}{obj.label}
                    </p>
                    {obj.target_value && (
                      <p style={{ fontSize: 10, color: "rgba(245,237,237,0.4)", margin: "2px 0 0" }}>
                        Objectif : {obj.target_value} {obj.target_unit ?? ""}
                      </p>
                    )}
                  </div>
                  {!readOnly && onToggleObjective && (
                    <button
                      onClick={() => onToggleObjective(obj.id, !obj.is_achieved)}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}
                    >
                      {obj.is_achieved
                        ? <CheckCircle2 size={16} style={{ color: "#4ade80" }} />
                        : <XCircle size={16} style={{ color: "rgba(245,237,237,0.2)" }} />
                      }
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 7-day breakdown */}
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(245,237,237,0.35)", marginBottom: 8 }}>
            Jours de la semaine
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {days.map((day, i) => {
              const dayName = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"][i];
              return (
                <div key={day} style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "6px 10px",
                  borderRadius: 6,
                  background: "rgba(0,0,0,0.2)",
                }}>
                  <span style={{ fontSize: 11, color: "rgba(245,237,237,0.5)", width: 80 }}>
                    {dayName}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(245,237,237,0.4)" }}>
                    {new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(day + "T12:00:00"))}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main calendar ─────────────────────────────────────────────────────────────

export default function RoadmapCalendar({
  roadmap,
  phases,
  objectives,
  weekStats: initialStats,
  clientId,
  readOnly = false,
  onWeekClick,
}: RoadmapCalendarProps) {
  const [weekStats, setWeekStats] = useState<WeekStat[]>(initialStats ?? []);
  const [loadingStats, setLoadingStats] = useState(!initialStats);
  const [selectedWeek, setSelectedWeek] = useState<{ weekStart: string; weekEnd: string } | null>(null);
  const currentWeekRef = useRef<HTMLDivElement | null>(null);

  const today = toISO(new Date());

  // Load week stats if not provided
  useEffect(() => {
    if (initialStats) return;
    setLoadingStats(true);
    getWeekStats(clientId, roadmap.start_date, roadmap.end_date)
      .then((stats) => {
        setWeekStats(stats);
        setLoadingStats(false);
      })
      .catch(() => setLoadingStats(false));
  }, [clientId, roadmap.start_date, roadmap.end_date, initialStats]);

  // Scroll to current week on mount
  useEffect(() => {
    setTimeout(() => {
      currentWeekRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 400);
  }, [weekStats]);

  const allWeeks = buildWeeks(roadmap.start_date, roadmap.end_date);

  // Group by month
  const monthGroups: { month: number; year: number; weeks: typeof allWeeks }[] = [];
  for (const week of allWeeks) {
    const last = monthGroups[monthGroups.length - 1];
    if (!last || last.month !== week.month || last.year !== week.year) {
      monthGroups.push({ month: week.month, year: week.year, weeks: [week] });
    } else {
      last.weeks.push(week);
    }
  }

  // Get current week
  const currentWeekStart = toISO(getMondayOfWeek(new Date()));

  // Get active phase for today
  const activePhase = getPhaseForDate(phases, today);
  const activePhaseColors = activePhase
    ? PHASE_COLORS[activePhase.type as keyof typeof PHASE_COLORS] ?? PHASE_COLORS.custom
    : null;

  // Present phases in roadmap
  const presentPhaseTypes = [...new Set(phases.map((p) => p.type))];

  const getStatForWeek = (weekStart: string): WeekStat | null =>
    weekStats.find((s) => s.weekStart === weekStart) ?? null;

  const handleWeekClick = (weekStart: string, weekEnd: string) => {
    setSelectedWeek({ weekStart, weekEnd });
    onWeekClick?.(new Date(weekStart + "T12:00:00"));
  };

  const selectedStat = selectedWeek
    ? getStatForWeek(selectedWeek.weekStart)
    : null;

  return (
    <div style={{ fontFamily: "var(--font-montserrat, 'Montserrat'), sans-serif" }}>

      {/* ── Legend ────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        {presentPhaseTypes.map((type) => {
          const c = PHASE_COLORS[type as keyof typeof PHASE_COLORS] ?? PHASE_COLORS.custom;
          const isActive = activePhase?.type === type;
          return (
            <span key={type} style={{
              background: c.bg,
              border: `1px solid ${isActive ? c.solid : c.border}`,
              color: c.solid,
              borderRadius: 20,
              padding: "3px 10px",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              boxShadow: isActive ? `0 0 8px ${c.solid}40` : "none",
            }}>
              {c.icon} {c.label}
              {isActive && " ◀"}
            </span>
          );
        })}
        <div style={{ display: "flex", gap: 6, alignItems: "center", marginLeft: "auto" }}>
          {(["excellent", "good", "average", "poor", "empty", "future"] as PerformanceKey[]).map((k) => (
            <div key={k} title={WEEK_PERFORMANCE_COLORS[k].label} style={{
              width: 12,
              height: 12,
              borderRadius: 2,
              background: WEEK_PERFORMANCE_COLORS[k].bg,
              border: "1px solid rgba(245,237,237,0.1)",
            }} />
          ))}
        </div>
      </div>

      {/* ── Phase timeline bar ────────────────────────────────────────────── */}
      {phases.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <PhaseTimelineBar
            phases={phases}
            startDate={roadmap.start_date}
            endDate={roadmap.end_date}
          />
          {/* Objective markers */}
          <div style={{ position: "relative", height: 16 }}>
            {objectives.map((obj) => {
              const totalDays = Math.max(
                1,
                (new Date(roadmap.end_date).getTime() - new Date(roadmap.start_date).getTime()) / 86400000
              );
              const dayOffset =
                (new Date(obj.target_date).getTime() - new Date(roadmap.start_date).getTime()) / 86400000;
              const pct = Math.max(0, Math.min(100, (dayOffset / totalDays) * 100));
              return (
                <span
                  key={obj.id}
                  title={`${obj.label} : ${obj.target_date}${obj.target_value ? ` (${obj.target_value}${obj.target_unit ? " " + obj.target_unit : ""})` : ""}`}
                  style={{
                    position: "absolute",
                    left: `${pct}%`,
                    top: 0,
                    transform: "translateX(-50%)",
                    fontSize: 12,
                    color: OBJECTIVE_TERM_COLORS[obj.term],
                    opacity: obj.is_achieved ? 0.4 : 1,
                  }}
                >
                  ◆
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Calendar grid ────────────────────────────────────────────────── */}
      <div style={{ overflowX: "auto" }}>
        {monthGroups.map(({ month, year, weeks }) => (
          <div key={`${year}-${month}`} style={{ marginBottom: 24 }}>
            {/* Month header */}
            <p style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "rgba(224,30,30,0.6)",
              marginBottom: 6,
            }}>
              {MONTHS_FR[month]} {year}
            </p>

            {/* Day headers */}
            <div style={{ display: "grid", gridTemplateColumns: "48px repeat(7, 1fr)", gap: 3, marginBottom: 3 }}>
              <div />
              {DAYS_FR.map((d, i) => (
                <div key={i} style={{
                  textAlign: "center",
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "rgba(245,237,237,0.25)",
                  padding: "2px 0",
                }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Weeks */}
            {weeks.map((week) => {
              const stat = loadingStats ? null : getStatForWeek(week.weekStart);
              const perfKey = stat?.performanceKey ?? (loadingStats ? "empty" : "future");
              const perfColor = WEEK_PERFORMANCE_COLORS[perfKey].bg;
              const phase = getPhaseForDate(phases, week.weekStart);
              const phaseColor = phase
                ? (PHASE_COLORS[phase.type as keyof typeof PHASE_COLORS] ?? PHASE_COLORS.custom).solid
                : null;
              const weekObjs = getObjectivesForWeek(objectives, week.weekStart, week.weekEnd);
              const isCurrentWeek = week.weekStart === currentWeekStart;

              const days7 = Array.from({ length: 7 }, (_, i) =>
                toISO(addDays(new Date(week.weekStart + "T12:00:00"), i))
              );

              return (
                <div
                  key={week.weekStart}
                  ref={isCurrentWeek ? currentWeekRef : undefined}
                  style={{ marginBottom: 3 }}
                >
                  <div style={{ display: "grid", gridTemplateColumns: "48px repeat(7, 1fr)", gap: 3 }}>
                    {/* Week number */}
                    <div
                      onClick={() => handleWeekClick(week.weekStart, week.weekEnd)}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        height: 44,
                        borderRadius: 6,
                        cursor: "pointer",
                        background: loadingStats
                          ? "rgba(245,237,237,0.04)"
                          : perfColor,
                        border: isCurrentWeek
                          ? "2px solid rgba(224,30,30,0.7)"
                          : "1px solid rgba(245,237,237,0.06)",
                        position: "relative",
                        overflow: "hidden",
                        transition: "transform 0.1s",
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "scale(1.05)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "scale(1)"; }}
                    >
                      {/* Phase overlay */}
                      {phaseColor && (
                        <div style={{
                          position: "absolute",
                          inset: 0,
                          background: phaseColor,
                          opacity: 0.12,
                          pointerEvents: "none",
                        }} />
                      )}
                      <span style={{
                        fontSize: 9,
                        fontWeight: 800,
                        color: isCurrentWeek ? "#E01E1E" : "rgba(245,237,237,0.5)",
                        letterSpacing: "0.05em",
                        position: "relative",
                      }}>
                        S{weekStats.find((s) => s.weekStart === week.weekStart)?.weekNumber ?? ""}
                      </span>
                      {weekObjs.length > 0 && (
                        <span style={{ fontSize: 8, color: OBJECTIVE_TERM_COLORS[weekObjs[0].term], position: "relative" }}>
                          ◆
                        </span>
                      )}
                    </div>

                    {/* 7 day cells */}
                    {days7.map((day) => {
                      const isFuture = day > today;
                      const dayPhase = getPhaseForDate(phases, day);
                      const dayColor = dayPhase
                        ? (PHASE_COLORS[dayPhase.type as keyof typeof PHASE_COLORS] ?? PHASE_COLORS.custom).solid
                        : null;
                      const isToday = day === today;

                      return (
                        <div
                          key={day}
                          title={day}
                          style={{
                            height: 44,
                            borderRadius: 4,
                            background: dayColor
                              ? `${dayColor}18`
                              : isFuture
                              ? "rgba(245,237,237,0.02)"
                              : "rgba(245,237,237,0.04)",
                            border: isToday
                              ? "1px solid rgba(224,30,30,0.5)"
                              : "1px solid rgba(245,237,237,0.04)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 9,
                            color: isToday ? "#E01E1E" : "rgba(245,237,237,0.2)",
                            fontWeight: isToday ? 800 : 400,
                          }}
                        >
                          {new Date(day + "T12:00:00").getDate()}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* ── Week detail modal ─────────────────────────────────────────────── */}
      {selectedWeek && (
        <WeekDetailModal
          weekStart={selectedWeek.weekStart}
          weekEnd={selectedWeek.weekEnd}
          phases={phases}
          objectives={objectives}
          stat={selectedStat}
          readOnly={readOnly}
          onClose={() => setSelectedWeek(null)}
        />
      )}
    </div>
  );
}
