"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/Skeleton";
import ProgressRing from "@/components/ui/ProgressRing";
import {
  ClipboardList, CheckCircle2, ChevronRight, Apple, Dumbbell,
  ClipboardCheck, Flame, Circle,
} from "lucide-react";

interface Stats {
  consumedCals: number;
  targetCals:   number;
  adherence:    number;
  daysWithLogs: number;
  stepsDisplay: string;
  sleepDisplay: string;
  hasCheckinThisWeek: boolean;
  weekNumber: number;
  hasSessionToday: boolean;
  hasBilanToday: boolean;
  todayStr: string;
}

function SleepDisplay({ value }: { value: string }) {
  const hours = parseFloat(value) || 0;
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

interface DailyTask {
  done: boolean;
  label: string;
  sublabel: string;
  href: string;
  icon: React.ElementType;
  color: string;
}

function DailyTaskRow({ task }: { task: DailyTask }) {
  const Icon = task.icon;
  return (
    <Link
      href={task.href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "11px 14px",
        borderRadius: 12,
        background: task.done ? "rgba(74,222,128,0.05)" : "rgba(31,1,1,0.7)",
        border: task.done ? "1px solid rgba(74,222,128,0.18)" : "1px solid rgba(137,4,4,0.22)",
        textDecoration: "none",
        transition: "all 0.15s ease",
      }}
    >
      <div style={{
        width: 32,
        height: 32,
        borderRadius: 9,
        background: task.done ? "rgba(74,222,128,0.12)" : `${task.color}15`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}>
        {task.done
          ? <CheckCircle2 size={16} style={{ color: "#4ade80" }} strokeWidth={2} />
          : <Icon size={15} style={{ color: task.color }} strokeWidth={1.8} />
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          margin: 0,
          fontSize: 12,
          fontWeight: 700,
          color: task.done ? "rgba(245,237,237,0.5)" : "#F5EDED",
          textDecoration: task.done ? "line-through" : "none",
        }}>
          {task.label}
        </p>
        {!task.done && (
          <p style={{ margin: 0, fontSize: 10, color: "rgba(245,237,237,0.35)" }}>
            {task.sublabel}
          </p>
        )}
      </div>
      {!task.done && (
        <ChevronRight size={13} style={{ color: "rgba(245,237,237,0.2)", flexShrink: 0 }} />
      )}
    </Link>
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
        <div className="ep-skeleton" style={{ height: 180, marginBottom: 12, borderRadius: "var(--radius-xl)" }} />
        <div className="ep-skeleton" style={{ height: 120, borderRadius: "var(--radius-lg)" }} />
      </div>
    );
  }

  const calPct = stats.targetCals > 0
    ? Math.round((stats.consumedCals / stats.targetCals) * 100)
    : 0;
  const adherenceColor =
    stats.adherence >= 80 ? "#4ade80"
    : stats.adherence >= 50 ? "#fbbf24"
    : "#E01E1E";

  const dailyTasks: DailyTask[] = [
    {
      done: stats.consumedCals > 0,
      label: stats.consumedCals > 0
        ? `Nutrition loggée : ${stats.consumedCals}${stats.targetCals > 0 ? ` / ${stats.targetCals} kcal` : " kcal"}`
        : "Logger mes repas du jour",
      sublabel: stats.targetCals > 0
        ? `Objectif : ${stats.targetCals} kcal`
        : "Renseigne tes repas pour suivre tes kcal",
      href: "/dashboard/client/nutrition",
      icon: Apple,
      color: "#E01E1E",
    },
    {
      done: stats.hasSessionToday,
      label: stats.hasSessionToday ? "Séance terminée aujourd'hui" : "Démarrer ma séance",
      sublabel: "Lance ton logbook et suis ta progression",
      href: "/dashboard/client/logbook",
      icon: Dumbbell,
      color: "#60a5fa",
    },
    {
      done: stats.hasBilanToday,
      label: stats.hasBilanToday ? "Bilan du jour rempli" : "Remplir mon bilan du jour",
      sublabel: "Poids, sommeil, ressenti, 30 secondes",
      href: "/dashboard/client/bilan",
      icon: ClipboardCheck,
      color: "#fbbf24",
    },
  ];

  const doneCount = dailyTasks.filter((t) => t.done).length;

  return (
    <>
      {/* ── Daily checklist ─────────────────────────────────────────────────── */}
      <div className="animate-fade-up" style={{ marginBottom: 16 }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}>
          <p className="ep-section-title" style={{ margin: 0 }}>Aujourd&apos;hui</p>
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            color: doneCount === 3 ? "#4ade80" : "rgba(245,237,237,0.3)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}>
            {doneCount === 3 ? "✓ Tout fait" : `${doneCount}/3 actions`}
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {dailyTasks.map((task) => (
            <DailyTaskRow key={task.href} task={task} />
          ))}
        </div>
      </div>

      {/* ── Hero rings card ─────────────────────────────────────────────────── */}
      <div
        className="ep-card-hero animate-scale-in"
        style={{ padding: "24px 20px 20px", marginBottom: 16 }}
      >
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
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

        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 8,
          alignItems: "end",
          justifyItems: "center",
        }}>
          <ProgressRing
            value={calPct}
            max={100}
            size={110}
            strokeWidth={9}
            color="#E01E1E"
            trackColor="rgba(224,30,30,0.07)"
            label="Nutrition"
            unit="%"
            sublabel={`${stats.consumedCals} / ${stats.targetCals} kcal`}
            delay={0}
          />
          <ProgressRing
            value={stats.adherence}
            max={100}
            size={96}
            strokeWidth={7}
            color={adherenceColor}
            trackColor={`${adherenceColor}10`}
            label="Adhésion 7j"
            unit="%"
            sublabel={`${stats.daysWithLogs}/7 jours`}
            delay={100}
          />
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
            background: "linear-gradient(135deg, rgba(224,30,30,0.12) 0%, rgba(137,4,4,0.08) 100%)",
            border: "1px solid rgba(224,30,30,0.22)",
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
            background: "rgba(224,30,30,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}>
            <ClipboardList size={18} style={{ color: "#E01E1E" }} strokeWidth={1.8} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#F5EDED" }}>
              Check-in semaine {stats.weekNumber}
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(245,237,237,0.4)" }}>
              Partage ton ressenti avec ton coach
            </p>
          </div>
          <ChevronRight size={16} style={{ color: "rgba(245,237,237,0.25)", flexShrink: 0 }} />
        </Link>
      )}
    </>
  );
}
