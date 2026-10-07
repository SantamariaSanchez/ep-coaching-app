"use client";

import { useT } from "@/components/i18n/I18nProvider";
import Link from "next/link";
import { Compass, Scale, Utensils, Dumbbell } from "lucide-react";
import type { PhasePilot, PilotTone, WeightPoint } from "@/lib/phase-pilot";
import { diffDaysIso, formatIsoFr } from "@/lib/roadmap-weeks";
import RoadmapLoadError from "@/components/roadmap/RoadmapLoadError";

// Pilote de phase (audit 2026-09-28, voir lib/phase-pilot.ts) : en 5
// secondes, où en est la phase en cours et est-ce que les suivis vont dans
// le sens de l'objectif. Calculé côté serveur (utils/phase-pilot.ts), ce
// composant ne fait qu'afficher. Il vit dans les vues road map uniquement.

const TONE_COLORS: Record<PilotTone, string> = {
  ok: "#4ade80",
  warn: "#fbbf24",
  bad: "#E01E1E",
  info: "rgba(245,237,237,0.35)",
};

const TONE_LABELS: Record<PilotTone, string> = {
  ok: "dans le repère",
  warn: "à surveiller",
  bad: "en retrait",
  info: "indicatif",
};

const VERDICT_BG: Record<"ok" | "warn" | "info", { bg: string; border: string }> = {
  ok: { bg: "rgba(74,222,128,0.07)", border: "rgba(74,222,128,0.25)" },
  warn: { bg: "rgba(251,191,36,0.07)", border: "rgba(251,191,36,0.28)" },
  info: { bg: "rgba(245,237,237,0.035)", border: "rgba(245,237,237,0.1)" },
};

const CTA_ICONS = { bilan: Scale, nutrition: Utensils, logbook: Dumbbell } as const;

function fmtDate(iso: string, withYear = false): string {
  return formatIsoFr(iso, withYear ? { day: "numeric", month: "short", year: "numeric" } : { day: "numeric", month: "short" });
}

function nf(n: number, digits = 1): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: digits }).format(n);
}

// ── Courbe des pesées + couloir repère ────────────────────────────────────────

function WeightSparkline({ pilot, accent }: { pilot: PhasePilot; accent: string }) {
  const points = pilot.weightSeries;
  const trend = pilot.weightTrend;
  if (points.length < 2) return null;

  const W = 300;
  const H = 72;
  const PAD = 8;
  const day0 = points[0].date;
  const lastDay = diffDaysIso(day0, points[points.length - 1].date) || 1;

  // Couloir : un éventail qui part du poids ajusté au premier point et
  // s'ouvre entre les pentes min et max du repère de la phase.
  const band =
    trend && pilot.corridor
      ? (() => {
          const anchor = trend.intercept + trend.slopePerDay * diffDaysIso(trend.day0, day0);
          const weeks = lastDay / 7;
          return {
            anchor,
            lo: anchor * (1 + (pilot.corridor.min / 100) * weeks),
            hi: anchor * (1 + (pilot.corridor.max / 100) * weeks),
          };
        })()
      : null;
  const trendEnds = trend
    ? {
        a: trend.intercept + trend.slopePerDay * diffDaysIso(trend.day0, day0),
        b: trend.intercept + trend.slopePerDay * diffDaysIso(trend.day0, points[points.length - 1].date),
      }
    : null;

  const values = [
    ...points.map((p) => p.kg),
    ...(band ? [band.anchor, band.lo, band.hi] : []),
    ...(trendEnds ? [trendEnds.a, trendEnds.b] : []),
  ];
  let min = Math.min(...values);
  let max = Math.max(...values);
  // Au moins 2 kg d'amplitude : des pesées au kilo près dessineraient
  // sinon des montagnes russes pour une variation normale d'un jour à l'autre.
  if (max - min < 2) {
    const mid = (max + min) / 2;
    min = mid - 1;
    max = mid + 1;
  }
  const x = (date: string) => PAD + (diffDaysIso(day0, date) / lastDay) * (W - 2 * PAD);
  const y = (kg: number) => PAD + ((max - kg) / (max - min)) * (H - 2 * PAD);

  const first = points[0];
  const last = points[points.length - 1];
  const ariaLabel = `${points.length} pesées du ${fmtDate(first.date)} au ${fmtDate(last.date)}, de ${nf(first.kg)} à ${nf(last.kg)} kg${
    trend ? `, tendance ${trend.kgPerWeek >= 0 ? "plus" : "moins"} ${nf(Math.abs(trend.kgPerWeek), 2)} kg par semaine` : ""
  }`;

  return (
    <div role="img" aria-label={ariaLabel} style={{ position: "relative", height: H, width: "100%", margin: "4px 0 2px" }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        width="100%"
        height={H}
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, overflow: "visible" }}
      >
        {band && (
          <polygon
            points={`${x(day0)},${y(band.anchor)} ${x(last.date)},${y(band.hi)} ${x(last.date)},${y(band.lo)}`}
            fill="rgba(224,30,30,0.08)"
            stroke="rgba(224,30,30,0.18)"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        )}
        <polyline
          points={points.map((p) => `${x(p.date)},${y(p.kg)}`).join(" ")}
          fill="none"
          stroke="rgba(245,237,237,0.25)"
          strokeWidth={1.2}
          vectorEffect="non-scaling-stroke"
        />
        {trendEnds && (
          <line
            x1={x(day0)}
            y1={y(trendEnds.a)}
            x2={x(last.date)}
            y2={y(trendEnds.b)}
            stroke={accent}
            strokeWidth={1.6}
            strokeDasharray="4 3"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
      {/* Points en HTML : le SVG est étiré (preserveAspectRatio none), des
          cercles SVG deviendraient des ellipses. */}
      {points.map((p: WeightPoint, i) => {
        const isLast = i === points.length - 1;
        return (
          <span
            key={p.date}
            aria-hidden="true"
            title={`${fmtDate(p.date)} : ${nf(p.kg)} kg`}
            style={{
              position: "absolute",
              left: `${(x(p.date) / W) * 100}%`,
              top: y(p.kg),
              width: isLast ? 8 : 5,
              height: isLast ? 8 : 5,
              borderRadius: "50%",
              transform: "translate(-50%, -50%)",
              background: isLast ? accent : "rgba(245,237,237,0.55)",
              boxShadow: isLast ? `0 0 8px ${accent}` : "none",
            }}
          />
        );
      })}
    </div>
  );
}

// ── Carte ─────────────────────────────────────────────────────────────────────

export default function PhasePilotCard({
  pilot,
  error,
  basePath,
}: {
  pilot: PhasePilot | null;
  error?: string | null;
  /** Préfixe des liens d'action (bilan, nutrition, logbook). null : aucun lien. */
  basePath: string | null;
}) {
  const tr = useT();
  if (error) return <RoadmapLoadError message={error} hint="La road map reste consultable plus bas." />;
  if (!pilot) return null;

  const phase = pilot.activePhase;
  const accent = phase?.colors.solid ?? pilot.nextPhase?.colors.solid ?? "#E01E1E";
  const verdictStyle = VERDICT_BG[pilot.verdict.tone];

  return (
    <section
      className="ep-card-hero"
      aria-label={tr("Pilote de phase")}
      style={{ padding: "18px 16px 16px", marginBottom: 24, borderColor: `${accent}55` }}
    >
      {/* Liseré et halo à la couleur de la phase, par-dessus la brume rouge. */}
      <div aria-hidden="true" style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />
      <div aria-hidden="true" style={{ position: "absolute", top: -90, left: -70, width: 240, height: 240, background: `radial-gradient(circle, ${accent}26 0%, transparent 70%)`, pointerEvents: "none" }} />

      <div style={{ position: "relative" }}>
        <p style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(224,30,30,0.65)", margin: "0 0 10px" }}>
          <Compass size={12} />{" "}{tr("Pilote de phase")}
        </p>

        {/* En-tête : phase + semaine */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
          <div style={{ minWidth: 0, flex: "1 1 180px" }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "#F5EDED", letterSpacing: "-0.02em", margin: 0, overflowWrap: "anywhere" }}>
              {phase ? `${phase.colors.icon} ${phase.label || phase.colors.label}` : pilot.headline}
            </h2>
            {phase && pilot.weekIndex != null && pilot.totalWeeks != null && (
              <p style={{ fontSize: 12, color: "rgba(245,237,237,0.5)", margin: "3px 0 0" }}>
                {tr("Semaine")}{" "}{pilot.weekIndex}{" "}{tr("sur")}{" "}{pilot.totalWeeks}{" "}{tr("· fin le")}{" "}{fmtDate(phase.end_date, true)}
              </p>
            )}
          </div>
          {pilot.competition && (
            <span
              title={`${pilot.competition.label}, le ${fmtDate(pilot.competition.date, true)}`}
              style={{
                flexShrink: 0,
                background: "rgba(234,179,8,0.12)",
                border: "1px solid rgba(234,179,8,0.45)",
                color: "#eab308",
                borderRadius: 20,
                padding: "4px 10px",
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.03em",
                whiteSpace: "nowrap",
              }}
            >
              🏆 J-{pilot.competition.daysLeft}{" "}{tr("compét")}
            </span>
          )}
        </div>

        {/* Progression dans la phase */}
        {phase && pilot.phaseProgressPct != null && (
          <div style={{ marginBottom: 14 }}>
            <div
              role="progressbar"
              aria-label={tr("Avancement de la phase")}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(pilot.phaseProgressPct)}
              style={{ height: 6, background: "rgba(0,0,0,0.45)", borderRadius: 3, overflow: "hidden" }}
            >
              <div style={{ width: `${pilot.phaseProgressPct}%`, height: "100%", background: accent, borderRadius: 3, boxShadow: `0 0 10px ${accent}80` }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginTop: 6, fontSize: 10.5, color: "rgba(245,237,237,0.4)" }}>
              <span>
                {pilot.nextPhase
                  ? `J-${pilot.nextPhase.startsInDays} avant ${pilot.nextPhase.label}`
                  : `${pilot.daysLeftInPhase ?? 0} jour${(pilot.daysLeftInPhase ?? 0) > 1 ? "s" : ""} avant la fin de la phase`}
              </span>
              {pilot.competition && <span style={{ color: "rgba(234,179,8,0.7)" }}>{pilot.competition.label}</span>}
            </div>
          </div>
        )}

        {/* Verdict */}
        <div
          role="status"
          style={{
            background: verdictStyle.bg,
            border: `1px solid ${verdictStyle.border}`,
            borderRadius: 10,
            padding: "10px 12px",
            marginBottom: 12,
          }}
        >
          <p style={{ fontSize: 13, lineHeight: 1.5, color: "#F5EDED", margin: 0 }}>{pilot.verdict.text}</p>
          {pilot.weightTrend?.projectedEndKg != null && (
            <p style={{ fontSize: 11, color: "rgba(245,237,237,0.45)", margin: "6px 0 0" }}>
              {tr("À ce rythme : environ")}{" "}{nf(pilot.weightTrend.projectedEndKg)}{" "}{tr("kg en fin de phase (projection, pas un objectif).")}
            </p>
          )}
        </div>

        {/* Courbe */}
        {pilot.weightSeries.length >= 2 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
              <span className="ep-label">
                {tr("Pesées du")}{" "}{fmtDate(pilot.weightSeries[0].date)}{" "}{tr("au")}{" "}{fmtDate(pilot.weightSeries[pilot.weightSeries.length - 1].date)}
              </span>
              {pilot.corridor && pilot.weightTrend && (
                <span style={{ fontSize: 9.5, color: "rgba(224,30,30,0.6)", whiteSpace: "nowrap" }}>{tr("zone rouge : couloir repère")}</span>
              )}
            </div>
            <WeightSparkline pilot={pilot} accent={accent} />
          </div>
        )}

        {/* Tuiles */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8, marginBottom: 12 }}>
          {pilot.tiles.map((t) => (
            <div
              key={t.key}
              style={{
                background: "rgba(0,0,0,0.32)",
                border: "1px solid rgba(245,237,237,0.05)",
                borderRadius: 10,
                padding: "10px 11px",
                minWidth: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, marginBottom: 4 }}>
                <span className="ep-label" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.label}</span>
                <span
                  role="img"
                  aria-label={TONE_LABELS[t.tone]}
                  title={TONE_LABELS[t.tone]}
                  style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: TONE_COLORS[t.tone], boxShadow: t.tone === "info" ? "none" : `0 0 6px ${TONE_COLORS[t.tone]}` }}
                />
              </div>
              <p style={{ fontSize: 17, fontWeight: 800, color: "#F5EDED", letterSpacing: "-0.02em", margin: 0, overflowWrap: "anywhere" }}>{t.value}</p>
              <p style={{ fontSize: 10.5, lineHeight: 1.4, color: "rgba(245,237,237,0.4)", margin: "3px 0 0", overflowWrap: "anywhere" }}>{t.sub}</p>
            </div>
          ))}
        </div>

        {/* Repère de décharge */}
        {pilot.deloadHint && (
          <p
            style={{
              fontSize: 12,
              lineHeight: 1.5,
              color: pilot.deloadHint.tone === "warn" ? "#fbbf24" : "rgba(245,237,237,0.55)",
              margin: "0 0 12px",
              paddingLeft: 10,
              borderLeft: `2px solid ${pilot.deloadHint.tone === "warn" ? "#fbbf24" : "rgba(139,92,246,0.6)"}`,
            }}
          >
            🔄 {pilot.deloadHint.text}
          </p>
        )}

        {/* Actions */}
        {basePath && pilot.ctas.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            {pilot.ctas.map((c) => {
              const Icon = CTA_ICONS[c.key];
              return (
                <Link
                  key={c.key}
                  href={`${basePath}/${c.key}`}
                  className="ep-btn-secondary"
                  style={{ fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}
                >
                  <Icon size={13} /> {c.label}
                </Link>
              );
            })}
          </div>
        )}

        <p style={{ fontSize: 9.5, lineHeight: 1.5, color: "rgba(245,237,237,0.28)", margin: 0 }}>
          {tr("Repères indicatifs (Iraki et al. 2019 pour la prise de masse, Helms et al. 2014 pour la sèche), jamais une consigne. Calculé sur les pesées du bilan, le tracker nutrition, les séances terminées et le sommeil noté.")}
        </p>
      </div>
    </section>
  );
}
