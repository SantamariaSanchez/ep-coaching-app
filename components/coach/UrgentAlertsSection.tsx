"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, AlertCircle, ChevronRight, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import type { TopAlert } from "@/lib/coach-analytics";

export default function UrgentAlertsSection() {
  const [alerts, setAlerts] = useState<TopAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/coach/urgent-alerts")
      .then((r) => r.json())
      .then((data) => {
        setAlerts(data.alerts ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-3.5 w-3.5 rounded-full" />
          <Skeleton className="h-3.5 w-32" />
        </div>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
        </div>
      </section>
    );
  }

  if (alerts.length === 0) return null;

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} className="text-red-400" />
          <h2 className="text-sm font-black uppercase tracking-widest text-red-400/80">
            Alertes urgentes
          </h2>
          <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/25">
            {alerts.length}
          </span>
        </div>
        <Link
          href="/dashboard/coach/clients"
          className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 hover:text-[#F5EDED]/70 transition-colors"
        >
          Voir tout
          <ChevronRight size={12} />
        </Link>
      </div>

      <div className="space-y-2">
        {alerts.map((item, i) => (
          <Link
            key={i}
            href={`/dashboard/coach/clients/${item.clientId}`}
            className="flex items-start gap-3 bg-[#1f0101] border border-red-500/15 hover:border-red-500/30 rounded-xl px-4 py-3.5 transition-colors group"
          >
            {item.alert.severity === "high" ? (
              <AlertTriangle size={13} className="text-red-400 flex-shrink-0 mt-0.5" strokeWidth={2} />
            ) : (
              <AlertCircle size={13} className="text-amber-400 flex-shrink-0 mt-0.5" strokeWidth={2} />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-white">{item.clientName ?? "Client"}</p>
              <p className="text-[10px] text-[#F5EDED]/50 mt-0.5 leading-snug">{item.alert.label}</p>
            </div>
            <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border flex-shrink-0 ${
              item.alert.severity === "high"
                ? "bg-red-500/10 text-red-400 border-red-500/20"
                : "bg-amber-500/10 text-amber-400 border-amber-500/20"
            }`}>
              {item.alert.severity === "high" ? "Critique" : "Attention"}
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-3 text-center">
        <Link
          href="/dashboard/coach/clients"
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#F5EDED]/30 hover:text-[#E01E1E] transition-colors"
        >
          <Users size={12} />
          Voir tous les clients
        </Link>
      </div>
    </section>
  );
}
