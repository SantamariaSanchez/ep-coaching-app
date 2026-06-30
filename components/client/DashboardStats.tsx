"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/Skeleton";
import ProgressRing from "@/components/ui/ProgressRing";
import { ClipboardList, CheckCircle2, ChevronRight } from "lucide-react";

interface Stats {
  consumedCals: number;
  targetCals:   number;
  adherence:    number;
  daysWithLogs: number;
  stepsDisplay: string;
  sleepDisplay: string;
  hasCheckinThisWeek: boolean;
  weekNumber: number;
}

function SleepDisplay({ value }: { value: string }) {
  const hours = parseFloat(value) || 0;
  const pct = Math.min(hours / 9, 1);
  return (
    <ProgressRing
      value={Math.round(hours * 10) / 10}
      max={9}
      size={96}
      strokeWidth={7}
      color="#a78bfa"
      trackColor="rgba(167,139,250,0.07)"
      label="Sommeil"
      unit="h"
      delay={200}
    />
  );
}

function StepsDisplay({ value }: { value: string }) {
  const steps = parseInt(value.replace(/\D/g, "")) || 0;
  return (
    <ProgressRing
      value={steps}
      max={10000}
      size={96}
      strokeWidth={7}
      color="#60a5fa"
      trackColor="rgba(96,165,250,0.07)"
      label="Pas"
      asPercent={false}
      unit={value.includes("k") ? "k" : ""}
      sublabel={`/ 10k`}
      delay={300}
    />
  );
}

export default function ClientDashboardStats() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/client/dashboard-stats")
      .then((r) => r.json())
      .then((d) => setStats(d))
      .catch(() => {});
  }, []);

  if (!stats) {
    return (
      <div style={{ marginBottom: 28 }}>
        <div className="ep-skeleton" style={{ height: 180, marginBottom: 16, borderRadius: "var(--radius-xl)" }} />
        <div className="ep-skeleton" style={{ height: 100, borderRadius: "var(--radius-lg)" }} />
      </div>
    );
  }

  const calPct = stats.targetCals > 0
    ? Math.round((stats.consumedCals / stats.targetCals) * 100)
    : 0;
  const adherenceColor =
    stats.adherence >= 80 ? "#4ade80"
    : stats.adherence >= 50 ? "#fbbf24"
    : "var(--color-ep-red)";

  return (
    <>
      {/* ── Hero rings card ─────────────────────────────────────────────────── */}
      <div
        className="ep-card-hero animate-scale-in"
        style={{ padding: "28px 20px 24px", marginBottom: 16 }}
      >
        {/* Week badge */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
        }}>
          <span className="ep-badge-red">Semaine {stats.weekNumber}</span>
          {stats.hasCheckinThisWeek && (
            <span style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 10,
              fontWeight: 700,
              color: "#4ade80",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}>
              <CheckCircle2 size={12} />
              Check-in ✓
            </span>
          )}
        </div>

        {/* 3 rings */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 8,
          alignItems: "end",
          justifyItems: "center",
        }}>
          {/* Nutrition ring — main/largest */}
          <ProgressRing
            value={calPct}
            max={100}
            size={110}
            strokeWidth={9}
            color="var(--color-ep-red)"
            trackColor="rgba(var(--color-ep-red-rgb),0.07)"
            label="Nutrition"
            unit="%"
            sublabel={`${stats.consumedCals} / ${stats.targetCals} kcal`}
            delay={0}
          />

          {/* Adherence ring */}
          <ProgressRing
            value={stats.adherence}
            max={100}
            size={96}
            strokeWidth={7}
            color={adherenceColor}
            trackColor={`${adherenceColor}10`}
            label="Adhésion"
            unit="%"
            sublabel={`${stats.daysWithLogs}/7 jours`}
            delay={100}
          />

          {/* Sleep ring */}
          <SleepDisplay value={stats.sleepDisplay} />
        </div>
      </div>

      {/* ── Check-in CTA ────────────────────────────────────────────────────── */}
      {!stats.hasCheckinThisWeek && (
        <Link
          href="/dashboard/client/checkin"
          className="animate-slide-up"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "16px 20px",
            background: "linear-gradient(135deg, rgba(var(--color-ep-red-rgb),0.12) 0%, rgba(var(--color-ep-dark-red-rgb),0.08) 100%)",
            border: "1px solid rgba(var(--color-ep-red-rgb),0.22)",
            borderRadius: "var(--radius-lg)",
            textDecoration: "none",
            marginBottom: 16,
            animationDelay: "0.2s",
          }}
        >
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: "rgba(var(--color-ep-red-rgb),0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}>
            <ClipboardList size={18} style={{ color: "var(--color-ep-red)" }} strokeWidth={1.8} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--color-ep-light)" }}>
              Check-in semaine {stats.weekNumber}
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(var(--color-ep-light-rgb),0.4)" }}>
              Partage ton ressenti avec ton coach
            </p>
          </div>
          <ChevronRight size={16} style={{ color: "rgba(var(--color-ep-light-rgb),0.25)", flexShrink: 0 }} />
        </Link>
      )}
    </>
  );
}
