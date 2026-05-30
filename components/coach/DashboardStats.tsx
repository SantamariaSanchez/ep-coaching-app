"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatCard } from "@/components/ui/StatCard";
import { Users, TrendingUp, CalendarClock, Video, Clock, ChevronRight } from "lucide-react";

interface PendingCheckin {
  id: string;
  client_id: string;
  week_number: number;
  created_at: string;
  profiles: { full_name: string | null } | null;
}

interface Stats {
  activeCount: number;
  weeklyCount: number;
  pendingCount: number;
  pendingCorrections: number;
  pendingReplies: PendingCheckin[];
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="mb-10 space-y-2">
          <Skeleton className="h-4 w-48" />
          {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-16" />)}
        </div>
      </>
    );
  }

  const statItems = [
    {
      label: "Clients actifs",
      value: stats.activeCount,
      icon: <Users size={18} />,
      sub: stats.activeCount === 0 ? "aucun client encore" : `${stats.activeCount} suivi${stats.activeCount > 1 ? "s" : ""} en cours`,
      urgent: false,
    },
    {
      label: "Check-ins semaine",
      value: stats.weeklyCount,
      icon: <TrendingUp size={18} />,
      sub: stats.weeklyCount === 0 ? "aucun reçu" : `reçu${stats.weeklyCount > 1 ? "s" : ""} cette semaine`,
      urgent: false,
    },
    {
      label: "Sans réponse",
      value: stats.pendingCount,
      icon: <CalendarClock size={18} />,
      sub: stats.pendingCount === 0 ? "tout à jour ✓" : "en attente de retour",
      urgent: true,
    },
    {
      label: "Corrections",
      value: stats.pendingCorrections,
      icon: <Video size={18} />,
      sub: stats.pendingCorrections === 0 ? "tout à jour ✓" : `vidéo${stats.pendingCorrections > 1 ? "s" : ""} à corriger`,
      urgent: true,
    },
  ];

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        {statItems.map(({ label, value, icon, sub, urgent }, i) => (
          <StatCard
            key={label}
            label={label}
            value={value}
            icon={icon}
            sub={sub}
            urgent={urgent}
            delay={i * 80}
          />
        ))}
      </div>

      {stats.pendingReplies.length > 0 && (
        <div className="mb-10">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Clock size={13} strokeWidth={2} style={{ color: "#fbbf24" }} />
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: "0.2em",
              textTransform: "uppercase", color: "rgba(251,191,36,0.8)",
            }}>
              Check-ins en attente de retour
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {stats.pendingReplies.map((c) => (
              <Link
                key={c.id}
                href={`/dashboard/coach/clients/${c.client_id}/checkins`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 20px",
                  background: "linear-gradient(135deg, #1A0101 0%, #0D0000 100%)",
                  border: "1px solid rgba(251,191,36,0.15)",
                  borderRadius: 12,
                  textDecoration: "none",
                  transition: "border-color 0.2s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(251,191,36,0.35)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(251,191,36,0.15)"; }}
              >
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#F5EDED", margin: 0 }}>
                    {c.profiles?.full_name ?? "Client"}
                  </p>
                  <p style={{ fontSize: 10, color: "rgba(245,237,237,0.35)", margin: "2px 0 0" }}>
                    Semaine {c.week_number} · soumis le{" "}
                    {new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(c.created_at))}
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="ep-badge-amber">Répondre</span>
                  <ChevronRight size={14} style={{ color: "rgba(245,237,237,0.2)" }} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
