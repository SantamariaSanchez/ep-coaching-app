"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/Skeleton";
import { Users, TrendingUp, CalendarClock, Video, ChevronRight } from "lucide-react";

interface PendingCheckin {
  id: string;
  client_id: string;
  week_number: number;
  created_at: string;
  profiles: { full_name: string | null } | null;
}

interface Stats {
  activeCount:        number;
  weeklyCount:        number;
  pendingCount:       number;
  pendingCorrections: number;
  pendingReplies:     PendingCheckin[];
}

function StatTile({
  label,
  value,
  icon: Icon,
  sub,
  urgent = false,
  delay = 0,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  sub: string;
  urgent?: boolean;
  delay?: number;
}) {
  const isAlert = urgent && value > 0;
  return (
    <div
      className="animate-scale-in"
      style={{
        animationDelay: `${delay}ms`,
        background: isAlert
          ? "linear-gradient(160deg, var(--color-ep-card) 0%, var(--color-ep-deep) 100%)"
          : "linear-gradient(160deg, var(--color-ep-card) 0%, var(--color-ep-deep) 100%)",
        border: `1px solid ${isAlert ? "rgba(var(--color-ep-red-rgb),0.28)" : "rgba(var(--color-ep-red-rgb),0.09)"}`,
        borderRadius: "var(--radius-lg)",
        padding: "20px 18px 16px",
        position: "relative",
        overflow: "hidden",
        boxShadow: isAlert ? "0 0 24px rgba(var(--color-ep-red-rgb),0.08)" : "none",
      }}
    >
      {/* Top accent */}
      <div style={{
        position: "absolute",
        top: 0, left: 0, right: 0,
        height: 1,
        background: isAlert
          ? "linear-gradient(90deg, transparent, var(--color-ep-red), transparent)"
          : "linear-gradient(90deg, transparent, rgba(var(--color-ep-red-rgb),0.2), transparent)",
      }} />

      {/* Icon */}
      <div style={{
        position: "absolute",
        top: 14, right: 14,
        color: isAlert ? "rgba(var(--color-ep-red-rgb),0.7)" : "rgba(var(--color-ep-red-rgb),0.3)",
      }}>
        <Icon size={16} strokeWidth={1.8} />
      </div>

      <p className="ep-label" style={{ marginBottom: 10 }}>{label}</p>

      <p style={{
        fontSize: 40,
        fontWeight: 900,
        letterSpacing: "-0.05em",
        color: isAlert ? "var(--color-ep-red)" : "var(--color-ep-light)",
        margin: 0,
        lineHeight: 1,
        marginBottom: 6,
      }}>
        {value}
      </p>

      <p style={{
        fontSize: 11,
        color: "rgba(var(--color-ep-light-rgb),0.35)",
        margin: 0,
        fontWeight: 500,
      }}>
        {sub}
      </p>
    </div>
  );
}

export default function DashboardStats() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/coach/dashboard-stats")
      .then((r) => r.json())
      .then((d) => setStats(d))
      .catch(() => {});
  }, []);

  if (!stats) {
    return (
      <>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="ep-skeleton" style={{ height: 110, borderRadius: "var(--radius-lg)" }} />
          ))}
        </div>
        <div className="ep-skeleton" style={{ height: 80, borderRadius: "var(--radius-lg)", marginBottom: 24 }} />
      </>
    );
  }

  const tiles = [
    { label: "Clients actifs",    value: stats.activeCount,        icon: Users,         sub: stats.activeCount === 0 ? "aucun pour l'instant" : "suivis en cours",   urgent: false },
    { label: "Check-ins / sem.",  value: stats.weeklyCount,        icon: TrendingUp,    sub: stats.weeklyCount === 0 ? "aucun reçu"          : "reçus cette semaine", urgent: false },
    { label: "Sans réponse",      value: stats.pendingCount,       icon: CalendarClock, sub: stats.pendingCount === 0 ? "tout à jour ✓"       : "en attente",          urgent: true  },
    { label: "Corrections",       value: stats.pendingCorrections, icon: Video,         sub: stats.pendingCorrections === 0 ? "rien à corriger" : "vidéos à revoir",   urgent: true  },
  ];

  return (
    <>
      {/* Stats grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 12,
        marginBottom: 24,
      }}>
        {tiles.map(({ label, value, icon, sub, urgent }, i) => (
          <StatTile
            key={label}
            label={label}
            value={value}
            icon={icon}
            sub={sub}
            urgent={urgent}
            delay={i * 60}
          />
        ))}
      </div>

      {/* Pending replies list */}
      {stats.pendingReplies.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p className="ep-section-title">En attente de retour</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {stats.pendingReplies.map((c, i) => (
              <Link
                key={c.id}
                href={`/dashboard/coach/clients/${c.client_id}/checkins`}
                className="animate-fade-up"
                style={{
                  animationDelay: `${i * 50}ms`,
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "14px 18px",
                  background: "linear-gradient(160deg, #160101 0%, var(--color-ep-deep) 100%)",
                  border: "1px solid rgba(251,191,36,0.14)",
                  borderRadius: "var(--radius-lg)",
                  textDecoration: "none",
                  transition: "border-color 0.2s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(251,191,36,0.3)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(251,191,36,0.14)";
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  background: "linear-gradient(135deg, var(--color-ep-dark-red), var(--color-ep-black))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: 13,
                  color: "var(--color-ep-light)",
                  flexShrink: 0,
                }}>
                  {(c.profiles?.full_name ?? "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--color-ep-light)" }}>
                    {c.profiles?.full_name ?? "Client"}
                  </p>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(var(--color-ep-light-rgb),0.35)" }}>
                    Sem. {c.week_number} &nbsp;·&nbsp;{" "}
                    {new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(c.created_at))}
                  </p>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <span className="ep-badge-amber">Répondre</span>
                  <ChevronRight size={14} style={{ color: "rgba(var(--color-ep-light-rgb),0.2)" }} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
