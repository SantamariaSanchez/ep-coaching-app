"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, AlertCircle, RotateCw } from "lucide-react";
import type { Roadmap, RoadmapPhase, RoadmapObjective } from "@/utils/roadmap";
import {
  PHASE_COLORS,
  WEEK_PERFORMANCE_COLORS,
  OBJECTIVE_TERM_COLORS,
  WEEK_SCORE_LEGEND,
  type PerformanceKey,
} from "@/lib/roadmap-colors";
import { getWeekStats, type WeekStat } from "@/lib/roadmap-stats";
import {
  addDaysIso,
  buildRoadmapWeeks,
  diffDaysIso,
  formatIsoFr,
  isValidIsoDate,
  mondayOfIso,
  type RoadmapWeek,
} from "@/lib/roadmap-weeks";
import { todayInParis } from "@/lib/dates";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RoadmapCalendarProps {
  roadmap: Roadmap;
  phases: RoadmapPhase[];
  objectives: RoadmapObjective[];
  clientId: string;
  onWeekClick?: (weekStart: string) => void;
}

const DAYS_FR = ["L", "M", "M", "J", "V", "S", "D"];
const DAY_NAMES = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

// ── Helpers ────────────────────────────────────────────────────────────────
// Toutes les dates passent par lib/roadmap-weeks.ts (UTC sur des chaînes
// YYYY-MM-DD) : avant, ce fichier construisait ses semaines en heure locale
// pendant que lib/roadmap-stats.ts les construisait en UTC, et les deux se
// décalaient d'un jour après chaque changement d'heure.

function fmt(iso: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long" }): string {
  return formatIsoFr(iso, opts);
}

function nf(n: number, digits = 1): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: digits }).format(n);
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

function phaseColors(type: string) {
  return PHASE_COLORS[type as keyof typeof PHASE_COLORS] ?? PHASE_COLORS.custom;
}

// ── Phase timeline bar ────────────────────────────────────────────────────────

function PhaseTimelineBar({ phases, startDate, endDate }: {
  phases: RoadmapPhase[];
  startDate: string;
  endDate: string;
}) {
  const totalDays = Math.max(1, diffDaysIso(startDate, endDate));
  const valid = phases.filter((p) => isValidIsoDate(p.start_date) && isValidIsoDate(p.end_date));

  return (
    <div style={{ display: "flex", height: 28, borderRadius: 8, overflow: "hidden", marginBottom: 8 }}>
      {valid.map((phase) => {
        const pStart = Math.max(0, diffDaysIso(startDate, phase.start_date));
        const pEnd = Math.min(totalDays, diffDaysIso(startDate, phase.end_date));
        const width = Math.max(0, ((pEnd - pStart) / totalDays) * 100);
        const colors = phaseColors(phase.type);

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
  week,
  phases,
  objectives,
  stat,
  prevStat,
  today,
  onClose,
}: {
  week: RoadmapWeek;
  phases: RoadmapPhase[];
  objectives: RoadmapObjective[];
  stat: WeekStat | null;
  prevStat: WeekStat | null;
  today: string;
  onClose: () => void;
}) {
  const t = useT();
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const phase = getPhaseForDate(phases, week.weekStart);
  const weekObjectives = getObjectivesForWeek(objectives, week.weekStart, week.weekEnd);
  const isFuture = week.weekStart > today;
  const perf: PerformanceKey = isFuture ? "future" : stat?.performanceKey ?? "empty";
  const perfData = WEEK_PERFORMANCE_COLORS[perf];

  // Fermeture au clavier (Échap), focus sur le bouton Fermer à l'ouverture,
  // puis retour du focus sur la semaine touchée à la fermeture (sinon le
  // clavier repart du haut de la page).
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      opener?.focus();
    };
  }, [onClose]);

  const days = Array.from({ length: 7 }, (_, i) => addDaysIso(week.weekStart, i));
  const elapsed = stat?.daysElapsed ?? 7;
  const dailyTarget = Math.min(5, Math.max(1, elapsed));
  const planned = stat?.sessionsPlanned ?? null;

  const tiles = stat
    ? [
        {
          label: "Bilans",
          display: `${stat.bilanDays}/7`,
          ok: stat.bilanDays >= dailyTarget || stat.checkinExists,
        },
        {
          label: "Nutrition",
          display: `${stat.nutritionDays}/7`,
          ok: stat.nutritionDays >= dailyTarget,
        },
        {
          label: "Séances",
          display: planned ? `${stat.sessionsDone}/${planned}` : `${stat.sessionsDone}`,
          ok: planned ? stat.sessionsDone >= (planned * elapsed) / 7 - 0.01 : stat.sessionsDone > 0,
        },
      ]
    : [];

  const weightDelta =
    stat?.avgWeight != null && prevStat?.avgWeight != null ? stat.avgWeight - prevStat.avgWeight : null;

  // Portail vers <body> : le calendrier est toujours rendu dans une .ep-card
  // (backdrop-filter + overflow hidden) sous .page-transition (transform
  // laissé par l'animation). Les deux font de l'ancêtre le repère d'un
  // position: fixed : la feuille s'ouvrait en bas de la CARTE, rognée, souvent
  // hors écran sur mobile, et sous la nav du bas (même raison que
  // components/client/ExercisePicker.tsx). La modale n'existe qu'après un
  // clic, donc document est toujours défini ici.
  return createPortal(
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
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(224,30,30,0.6)", margin: 0 }}>
              {t("Semaine")}{" "}{week.index}{" "}{t("de la road map")}
            </p>
            <h3 id={titleId} style={{ fontSize: 16, fontWeight: 800, color: "#F5EDED", letterSpacing: "-0.02em", margin: "2px 0 0" }}>
              {fmt(week.weekStart)}{" "}{t("au")}{" "}{fmt(week.weekEnd)}
            </h3>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t("Fermer")}
            style={{ background: "none", border: "none", color: "rgba(245,237,237,0.5)", cursor: "pointer", padding: 4, flexShrink: 0 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Phase badge */}
        {phase && (
          <div style={{ marginBottom: 16 }}>
            {(() => {
              const c = phaseColors(phase.type);
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

        {/* Performance */}
        <div style={{
          background: "rgba(0,0,0,0.3)",
          borderRadius: 10,
          padding: "12px 16px",
          marginBottom: 16,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: tiles.length ? 10 : 0 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(245,237,237,0.35)" }}>
              {stat?.isCurrent ? t("Semaine en cours") : t("Performance")}
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

          {tiles.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
              {tiles.map((item) => (
                <div key={item.label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: item.ok ? "#4ade80" : "#fbbf24", marginBottom: 2 }}>
                    {item.display}
                  </div>
                  <div style={{ fontSize: 9, color: "rgba(245,237,237,0.35)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          )}

          {stat && (stat.avgWeight != null || stat.avgSleep != null || stat.avgKcal != null) && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 12, fontSize: 12, color: "rgba(245,237,237,0.7)" }}>
              {stat.avgWeight != null && (
                <span>
                  {t("Poids moyen")}{" "}{nf(stat.avgWeight)}{" "}{t("kg")}
                  {weightDelta != null && (
                    <span style={{ color: "rgba(245,237,237,0.4)" }}>
                      {" "}({weightDelta >= 0 ? "+" : "-"}{nf(Math.abs(weightDelta))}{" "}{t("kg vs semaine d'avant)")}
                    </span>
                  )}
                </span>
              )}
              {stat.avgSleep != null && <span>{t("Sommeil moyen")}{" "}{nf(stat.avgSleep)} h</span>}
              {stat.avgKcal != null && <span>{t("Calories moyennes")}{" "}{nf(stat.avgKcal, 0)}{" "}{t("kcal (jours logués)")}</span>}
            </div>
          )}
          {stat?.checkinExists && (
            <p style={{ fontSize: 11, color: "#4ade80", margin: "8px 0 0" }}>{t("✓ Check-in hebdo envoyé")}</p>
          )}
          {isFuture && (
            <p style={{ fontSize: 12, color: "rgba(245,237,237,0.4)", margin: "8px 0 0" }}>{t("Semaine à venir : pas encore de données.")}</p>
          )}
        </div>

        {/* Objectives this week */}
        {weekObjectives.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(245,237,237,0.35)", marginBottom: 8 }}>
              {t("Objectifs de la semaine")}
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
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#F5EDED", margin: 0, overflowWrap: "anywhere" }}>
                      {obj.is_achieved ? "✓ " : ""}{obj.label}
                    </p>
                    {obj.target_value != null && (
                      <p style={{ fontSize: 10, color: "rgba(245,237,237,0.4)", margin: "2px 0 0" }}>
                        {t("Objectif :")}{" "}{obj.target_value} {obj.target_unit ?? ""}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 7-day breakdown */}
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(245,237,237,0.35)", marginBottom: 8 }}>
            {t("Jour par jour")}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {days.map((day, i) => {
              const d = stat?.perDay[day];
              const parts: string[] = [];
              if (d?.weight != null) parts.push(`${nf(d.weight)} kg`);
              if (d?.sleep != null) parts.push(`${nf(d.sleep)} h de sommeil`);
              if (d?.kcal != null) parts.push(`${nf(d.kcal, 0)} kcal`);
              if (d?.hasBilan && d.weight == null && d.sleep == null) parts.push("bilan");
              const future = day > today;
              return (
                <div key={day} style={{
                  display: "flex",
                  alignItems: "center",
                  flexWrap: "wrap",
                  columnGap: 10,
                  rowGap: 2,
                  padding: "7px 10px",
                  borderRadius: 6,
                  background: day === today ? "rgba(224,30,30,0.08)" : "rgba(0,0,0,0.2)",
                }}>
                  <span style={{ fontSize: 11, color: "rgba(245,237,237,0.6)", width: 64, flexShrink: 0 }}>
                    {DAY_NAMES[i]}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(245,237,237,0.35)", width: 44, flexShrink: 0 }}>
                    {fmt(day, { day: "numeric", month: "short" })}
                  </span>
                  <span style={{ fontSize: 11, color: parts.length ? "rgba(245,237,237,0.75)" : "rgba(245,237,237,0.25)", flex: "1 1 140px", minWidth: 0 }}>
                    {future ? t("à venir") : parts.length ? parts.join(" · ") : t("pas de donnée")}
                  </span>
                  {d?.sessionDone && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#4ade80", flexShrink: 0 }}>{t("● Séance")}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Main calendar ─────────────────────────────────────────────────────────────

export default function RoadmapCalendar({
  roadmap,
  phases,
  objectives,
  clientId,
  onWeekClick,
}: RoadmapCalendarProps) {
  const t = useT();
  const [selectedWeek, setSelectedWeek] = useState<RoadmapWeek | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  // Stats rangées avec la clé de ce qui les a produites : "en chargement" se
  // déduit d'une clé qui ne correspond plus, sans setState synchrone dans
  // l'effet (react-hooks/set-state-in-effect).
  const [statsState, setStatsState] = useState<{ key: string; stats: WeekStat[]; error: string | null } | null>(null);

  const scrollBoxRef = useRef<HTMLDivElement | null>(null);
  const currentWeekRef = useRef<HTMLDivElement | null>(null);
  const didCenterRef = useRef(false);

  const today = todayInParis();
  const currentWeekStart = mondayOfIso(today);
  const allWeeks = useMemo(
    () => buildRoadmapWeeks(roadmap.start_date, roadmap.end_date),
    [roadmap.start_date, roadmap.end_date]
  );

  const statsKey = `${clientId}|${roadmap.start_date}|${roadmap.end_date}|${reloadKey}`;
  const hasWeeks = allWeeks.length > 0;

  useEffect(() => {
    if (!hasWeeks) return;
    let cancelled = false;
    // Petit délai : dans l'éditeur, les dates changent à chaque frappe.
    const timer = setTimeout(() => {
      getWeekStats(clientId, roadmap.start_date, roadmap.end_date)
        .then((stats) => {
          if (!cancelled) setStatsState({ key: statsKey, stats, error: null });
        })
        .catch((e) => {
          console.error("RoadmapCalendar stats error:", e);
          if (!cancelled) {
            setStatsState((prev) => ({
              key: statsKey,
              stats: prev?.stats ?? [],
              error: "Impossible de charger les stats des semaines.",
            }));
          }
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [statsKey, hasWeeks, clientId, roadmap.start_date, roadmap.end_date]);

  const loadingStats = hasWeeks && statsState?.key !== statsKey;
  const statsError = statsState?.key === statsKey ? statsState.error : null;
  const statByWeek = useMemo(() => {
    const m = new Map<string, WeekStat>();
    for (const s of statsState?.stats ?? []) m.set(s.weekStart, s);
    return m;
  }, [statsState]);

  // Avant : scrollIntoView de la FENÊTRE 400 ms après le chargement, la page
  // sautait par-dessus le résumé et le pilote. Désormais le calendrier a sa
  // propre boîte de défilement, centrée une seule fois sur la semaine en cours.
  useEffect(() => {
    if (didCenterRef.current) return;
    const box = scrollBoxRef.current;
    const row = currentWeekRef.current;
    if (!box || !row) return;
    didCenterRef.current = true;
    box.scrollTop = Math.max(0, row.offsetTop - box.clientHeight / 2 + row.offsetHeight / 2);
  });

  // Group by month
  const monthGroups: { month: number; year: number; weeks: RoadmapWeek[] }[] = [];
  for (const week of allWeeks) {
    const last = monthGroups[monthGroups.length - 1];
    if (!last || last.month !== week.month || last.year !== week.year) {
      monthGroups.push({ month: week.month, year: week.year, weeks: [week] });
    } else {
      last.weeks.push(week);
    }
  }

  const activePhase = getPhaseForDate(phases, today);
  const presentPhaseTypes = [...new Set(phases.map((p) => p.type))];

  // Stable : l'effet Échap/focus de la modale ne se relance pas à chaque rendu.
  const closeWeek = useCallback(() => setSelectedWeek(null), []);

  const handleWeekClick = (week: RoadmapWeek) => {
    setSelectedWeek(week);
    onWeekClick?.(week.weekStart);
  };

  if (!hasWeeks) {
    return (
      <p style={{ fontSize: 12.5, color: "rgba(245,237,237,0.45)", margin: 0 }}>
        {t("Calendrier indisponible : vérifie les dates de début et de fin (période de 10 ans maximum).")}
      </p>
    );
  }

  const selectedStat = selectedWeek ? statByWeek.get(selectedWeek.weekStart) ?? null : null;
  const prevStat = selectedWeek ? statByWeek.get(addDaysIso(selectedWeek.weekStart, -7)) ?? null : null;
  const totalDays = Math.max(1, diffDaysIso(roadmap.start_date, roadmap.end_date));

  return (
    <div style={{ fontFamily: "var(--font-montserrat, 'Montserrat'), sans-serif" }}>

      {/* ── Legend ────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
        {presentPhaseTypes.map((type) => {
          const c = phaseColors(type);
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
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 12px", alignItems: "center", marginBottom: 6 }}>
        {(["excellent", "good", "average", "poor", "empty", "future"] as PerformanceKey[]).map((k) => (
          <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10, color: "rgba(245,237,237,0.45)" }}>
            <span aria-hidden="true" style={{
              width: 10,
              height: 10,
              borderRadius: 2,
              background: WEEK_PERFORMANCE_COLORS[k].bg,
              border: "1px solid rgba(245,237,237,0.1)",
              flexShrink: 0,
            }} />
            {WEEK_PERFORMANCE_COLORS[k].label}
          </span>
        ))}
      </div>
      <p style={{ fontSize: 10, lineHeight: 1.5, color: "rgba(245,237,237,0.3)", margin: "0 0 16px" }}>
        {WEEK_SCORE_LEGEND}{" "}{t("Touche un numéro de semaine pour le détail jour par jour.")}
      </p>

      {statsError && (
        <div role="alert" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", background: "rgba(224,30,30,0.08)", border: "1px solid rgba(224,30,30,0.25)", borderRadius: 8, padding: "10px 12px", marginBottom: 16 }}>
          <AlertCircle size={14} style={{ color: "#E01E1E", flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: "#FDC4C4", flex: "1 1 180px" }}>{statsError}{" "}{t("Les couleurs des semaines ne sont pas à jour.")}</span>
          <button type="button" onClick={() => setReloadKey((k) => k + 1)} className="ep-btn-secondary" style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 5 }}>
            <RotateCw size={12} />{" "}{t("Réessayer")}
          </button>
        </div>
      )}

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
            {objectives.filter((o) => isValidIsoDate(o.target_date)).map((obj) => {
              const pct = Math.max(0, Math.min(100, (diffDaysIso(roadmap.start_date, obj.target_date) / totalDays) * 100));
              return (
                <span
                  key={obj.id}
                  title={`${obj.label} : ${fmt(obj.target_date, { day: "numeric", month: "short", year: "numeric" })}${obj.target_value != null ? ` (${obj.target_value}${obj.target_unit ? " " + obj.target_unit : ""})` : ""}`}
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
      <div
        ref={scrollBoxRef}
        style={{ position: "relative", maxHeight: "min(560px, 70vh)", overflowY: "auto", overflowX: "hidden", paddingRight: 2 }}
      >
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
            <div style={{ display: "grid", gridTemplateColumns: "44px repeat(7, minmax(0, 1fr))", gap: 3, marginBottom: 3 }}>
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
              const stat = statByWeek.get(week.weekStart) ?? null;
              const isFutureWeek = week.weekStart > today;
              const perfKey: PerformanceKey = isFutureWeek ? "future" : stat?.performanceKey ?? "empty";
              const phase = getPhaseForDate(phases, week.weekStart);
              const phaseColor = phase ? phaseColors(phase.type).solid : null;
              const weekObjs = getObjectivesForWeek(objectives, week.weekStart, week.weekEnd);
              const isCurrentWeek = week.weekStart === currentWeekStart;
              const showPending = loadingStats && !stat && !isFutureWeek;

              const days7 = Array.from({ length: 7 }, (_, i) => addDaysIso(week.weekStart, i));

              return (
                <div
                  key={week.weekStart}
                  ref={isCurrentWeek ? currentWeekRef : undefined}
                  style={{ marginBottom: 3 }}
                >
                  <div style={{ display: "grid", gridTemplateColumns: "44px repeat(7, minmax(0, 1fr))", gap: 3 }}>
                    {/* Numéro de semaine : un vrai bouton (clavier + lecteur d'écran). */}
                    <button
                      type="button"
                      onClick={() => handleWeekClick(week)}
                      aria-label={`Semaine ${week.index}, du ${fmt(week.weekStart)} au ${fmt(week.weekEnd)} : ${
                        showPending ? "stats en chargement" : WEEK_PERFORMANCE_COLORS[perfKey].label
                      }${isCurrentWeek ? ", semaine en cours" : ""}`}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        height: 44,
                        padding: 0,
                        font: "inherit",
                        borderRadius: 6,
                        cursor: "pointer",
                        background: showPending ? "rgba(245,237,237,0.04)" : WEEK_PERFORMANCE_COLORS[perfKey].bg,
                        border: isCurrentWeek
                          ? "2px solid rgba(224,30,30,0.7)"
                          : "1px solid rgba(245,237,237,0.06)",
                        position: "relative",
                        overflow: "hidden",
                        transition: "transform 0.1s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.05)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                    >
                      {/* Phase overlay */}
                      {phaseColor && (
                        <span aria-hidden="true" style={{
                          position: "absolute",
                          inset: 0,
                          background: phaseColor,
                          opacity: 0.12,
                          pointerEvents: "none",
                        }} />
                      )}
                      <span aria-hidden="true" style={{
                        fontSize: 9,
                        fontWeight: 800,
                        color: isCurrentWeek ? "#E01E1E" : "rgba(245,237,237,0.6)",
                        letterSpacing: "0.05em",
                        position: "relative",
                      }}>
                        S{week.index}
                      </span>
                      {weekObjs.length > 0 && (
                        <span aria-hidden="true" style={{ fontSize: 8, color: OBJECTIVE_TERM_COLORS[weekObjs[0].term], position: "relative" }}>
                          ◆
                        </span>
                      )}
                    </button>

                    {/* 7 day cells */}
                    {days7.map((day) => {
                      const isFuture = day > today;
                      const dayPhase = getPhaseForDate(phases, day);
                      const dayColor = dayPhase ? phaseColors(dayPhase.type).solid : null;
                      const isToday = day === today;

                      return (
                        <div
                          key={day}
                          title={fmt(day, { weekday: "long", day: "numeric", month: "long" })}
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
                          {Number(day.slice(8, 10))}
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
          week={selectedWeek}
          phases={phases}
          objectives={objectives}
          stat={selectedStat}
          prevStat={prevStat}
          today={today}
          onClose={closeWeek}
        />
      )}
    </div>
  );
}
