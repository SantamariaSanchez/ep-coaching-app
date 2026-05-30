"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/Skeleton";
import MetricGauge from "@/components/ui/MetricGauge";
import ProgressBar from "@/components/ui/ProgressBar";
import { ClipboardList, CheckCircle2, Activity, Clock } from "lucide-react";

interface Stats {
  consumedCals: number;
  targetCals: number;
  adherence: number;
  daysWithLogs: number;
  stepsDisplay: string;
  sleepDisplay: string;
  hasCheckinThisWeek: boolean;
  weekNumber: number;
}

function MiniStat({ icon: Icon, value, label, color }: {
  icon: React.ElementType; value: string; label: string; color: string;
}) {
  return (
    <div
      style={{
        background: "rgba(0,0,0,0.3)",
        border: "1px solid var(--ep-border)",
        borderRadius: 12,
        padding: "12px 8px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
      }}
    >
      <Icon size={18} style={{ color }} strokeWidth={1.8} />
      <p style={{ fontSize: 16, fontWeight: 800, color: "#F5EDED", margin: 0, letterSpacing: "-0.02em" }}>
        {value}
      </p>
      <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(245,237,237,0.3)", margin: 0 }}>
        {label}
      </p>
    </div>
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
      <div style={{ marginBottom: 32 }}>
        <Skeleton className="h-3 w-28 mb-3" />
        <Skeleton className="h-40 mb-4" />
        <Skeleton className="h-3 w-28 mb-3" />
        <Skeleton className="h-44" />
      </div>
    );
  }

  const adherenceColor =
    stats.adherence >= 80 ? "green" : stats.adherence >= 60 ? "amber" : "red";

  return (
    <>
      {/* ── Aujourd'hui ──────────────────────────────────────────────────────── */}
      <section style={{ marginBottom: 28 }}>
        <span className="ep-section-title">Aujourd&apos;hui</span>
        <div className="ep-card" style={{ padding: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, alignItems: "center" }}>
            {/* Calories gauge */}
            <div style={{ display: "flex", justifyContent: "center", padding: "4px 0" }}>
              <MetricGauge
                value={stats.consumedCals}
                max={stats.targetCals}
                size={88}
                strokeWidth={7}
                label="obj."
                unit="kcal"
              />
            </div>
            <MiniStat icon={Activity} value={stats.stepsDisplay} label="Pas / jour" color="#60a5fa" />
            <MiniStat icon={Clock} value={stats.sleepDisplay} label="Sommeil" color="#a78bfa" />
          </div>
          {!stats.hasCheckinThisWeek && (
            <p style={{ marginTop: 12, textAlign: "center", fontSize: 10, color: "rgba(245,237,237,0.3)", letterSpacing: "0.05em" }}>
              Fais ton check-in hebdo pour voir tes stats
            </p>
          )}
        </div>
      </section>

      {/* ── Ma semaine ────────────────────────────────────────────────────────── */}
      <section style={{ marginBottom: 24 }}>
        <span className="ep-section-title">Ma semaine</span>
        <div className="ep-card" style={{ padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
            <span className="ep-badge-red">Semaine {stats.weekNumber}</span>
          </div>

          <div style={{ marginBottom: 20 }}>
            <ProgressBar
              value={stats.adherence}
              max={100}
              color={adherenceColor}
              label="Adhésion nutrition"
              showPercent
              height={8}
            />
            <p style={{ marginTop: 6, fontSize: 10, color: "rgba(245,237,237,0.3)" }}>
              {stats.daysWithLogs} / 7 jours avec logs nutrition
            </p>
          </div>

          {stats.hasCheckinThisWeek ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 16px",
                background: "rgba(74,222,128,0.07)",
                border: "1px solid rgba(74,222,128,0.2)",
                borderRadius: 10,
              }}
            >
              <CheckCircle2 size={15} style={{ color: "#4ade80", flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: "#4ade80", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Check-in envoyé ✓
              </span>
            </div>
          ) : (
            <Link href="/dashboard/client/checkin" className="ep-btn-primary" style={{ width: "100%", display: "flex" }}>
              <ClipboardList size={14} />
              Faire mon check-in
            </Link>
          )}
        </div>
      </section>
    </>
  );
}
