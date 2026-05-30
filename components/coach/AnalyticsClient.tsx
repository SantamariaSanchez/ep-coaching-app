"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  AlertTriangle,
  AlertCircle,
  Info,
  Trophy,
  CheckCircle2,
  TrendingUp,
  Zap,
  Star,
  FileText,
  Moon,
  Dumbbell,
  Apple,
  Flame,
  Minus,
  Users,
  BarChart2,
  RefreshCw,
} from "lucide-react";
import type { CoachDashboardData, ClientAnalytics } from "@/lib/coach-analytics";

// ── Icon map ──────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  AlertTriangle, AlertCircle, Info, Trophy, CheckCircle2, TrendingUp,
  Zap, Star, FileText, Moon, Dumbbell, Apple, Flame, Minus,
};

function AlertIcon({ name, severity }: { name: string; severity: string }) {
  const Icon = ICON_MAP[name] ?? AlertCircle;
  const color = severity === "high" ? "text-red-400" : severity === "medium" ? "text-amber-400" : "text-[#F5EDED]/30";
  return <Icon size={13} className={`${color} flex-shrink-0 mt-0.5`} strokeWidth={2} />;
}

function HighlightIcon({ name }: { name: string }) {
  const Icon = ICON_MAP[name] ?? CheckCircle2;
  return <Icon size={13} className="text-green-400 flex-shrink-0 mt-0.5" strokeWidth={2} />;
}

function alertHref(clientId: string, alertType: string): string {
  const map: Record<string, string> = {
    checkin_missing: `/dashboard/coach/clients/${clientId}/checkins`,
    weight_stagnation: `/dashboard/coach/clients/${clientId}`,
    nutrition_adherence: `/dashboard/coach/clients/${clientId}/nutrition`,
    calories_low: `/dashboard/coach/clients/${clientId}/nutrition`,
    training_missed: `/dashboard/coach/clients/${clientId}/logbook`,
    technique_low: `/dashboard/coach/clients/${clientId}/logbook`,
    recovery_poor: `/dashboard/coach/clients/${clientId}/checkins`,
    bilan_missing: `/dashboard/coach/bilan`,
  };
  return map[alertType] ?? `/dashboard/coach/clients/${clientId}`;
}

function StatCard({ label, value, sub, color = "text-white", icon: Icon }: {
  label: string; value: string | number; sub?: string; color?: string; icon: React.ElementType;
}) {
  return (
    <div className="bg-[#1f0101] border border-[#890404]/30 rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35">{label}</p>
        <Icon size={14} className="text-[#890404]" strokeWidth={1.8} />
      </div>
      <p className={`text-4xl font-black ${color}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-[#F5EDED]/30">{sub}</p>}
    </div>
  );
}

function cellColor(value: number | null, thresholds: { ok: number; warn: number }): string {
  if (value == null) return "text-[#F5EDED]/25";
  if (value >= thresholds.ok) return "text-green-400 font-bold";
  if (value >= thresholds.warn) return "text-amber-400 font-bold";
  return "text-red-400 font-bold";
}

function AlertCard({ client }: { client: ClientAnalytics }) {
  const high = client.alerts.filter((a) => a.severity === "high").length;
  const med = client.alerts.filter((a) => a.severity === "medium").length;
  const low = client.alerts.length - high - med;
  return (
    <div className="bg-[#1a0000] border border-[#890404]/25 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#890404]/15">
        <Link href={`/dashboard/coach/clients/${client.id}`} className="text-sm font-black text-white hover:text-[#E01E1E] transition-colors">
          {client.full_name ?? "Client"}
        </Link>
        <div className="flex items-center gap-1.5">
          {high > 0 && <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/25">{high} critique{high > 1 ? "s" : ""}</span>}
          {med > 0 && <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25">{med} moyen</span>}
          {low > 0 && <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-[#F5EDED]/10 text-[#F5EDED]/30 border border-[#F5EDED]/10">{low} faible</span>}
        </div>
      </div>
      <div className="divide-y divide-[#890404]/10">
        {client.alerts.map((alert, i) => (
          <div key={i} className="flex items-start gap-3 px-4 py-3">
            <AlertIcon name={alert.icon} severity={alert.severity} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[#F5EDED]/80 leading-snug">{alert.label}</p>
              <p className="text-[10px] text-[#F5EDED]/35 mt-0.5 leading-snug">💡 {alert.suggestion}</p>
            </div>
            <Link href={alertHref(client.id, alert.type)} className="text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-[#890404]/20 hover:bg-[#890404]/40 text-[#F5EDED]/50 hover:text-[#F5EDED]/80 transition-colors flex-shrink-0">
              Agir
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

function HighlightCard({ client }: { client: ClientAnalytics }) {
  return (
    <div className="bg-[#001a00] border border-green-500/15 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-green-500/10">
        <Link href={`/dashboard/coach/clients/${client.id}`} className="text-sm font-black text-white hover:text-green-400 transition-colors">
          {client.full_name ?? "Client"}
        </Link>
      </div>
      <div className="divide-y divide-green-500/10">
        {client.highlights.map((h, i) => (
          <div key={i} className="flex items-start gap-3 px-4 py-2.5">
            <HighlightIcon name={h.icon} />
            <div>
              <p className="text-xs text-[#F5EDED]/75 leading-snug">{h.label}</p>
              {h.detail && <p className="text-[10px] text-[#F5EDED]/35 mt-0.5">{h.detail}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SkeletonAnalytics() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-40" />
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-40" />
        {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
    </div>
  );
}

export default function AnalyticsClient() {
  const [data, setData] = useState<CoachDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);

  function load() {
    setLoading(true);
    fetch("/api/coach/analytics-data")
      .then((r) => r.json())
      .then((d: CoachDashboardData) => {
        setData(d);
        setLoadedAt(new Date());
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  const clients = data?.clients ?? [];
  const totalAlerts = data?.totalAlerts ?? 0;
  const clientsWithAlerts = clients.filter((c) => (c.alerts ?? []).length > 0);
  const clientsWithHighlights = clients.filter((c) => (c.highlights ?? []).length > 0);

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto pb-16 page-transition">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
            Analytics — 21 jours
          </p>
          <h1 className="text-3xl font-black uppercase tracking-tight flex items-center gap-3">
            Tableau de Bord
            {totalAlerts > 0 && (
              <span className="text-lg font-black px-2.5 py-0.5 rounded-full bg-[#E01E1E] text-white">
                {totalAlerts}
              </span>
            )}
          </h1>
          {loadedAt && (
            <p className="text-[9px] text-[#F5EDED]/20 mt-1">
              Mis à jour {new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(loadedAt)}
            </p>
          )}
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/30 hover:text-[#F5EDED]/60 transition-colors disabled:opacity-30"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          Actualiser
        </button>
      </div>

      {loading && !data ? (
        <SkeletonAnalytics />
      ) : !data ? (
        <div className="text-center py-16 text-[#F5EDED]/30">Erreur de chargement</div>
      ) : (
        <>
          {/* Global stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
            <StatCard label="Clients actifs" value={data?.activeCount ?? 0} sub={`${data?.activeCount ?? 0} suivi${(data?.activeCount ?? 0) > 1 ? "s" : ""}`} icon={Users} />
            <StatCard label="Alertes critiques" value={data?.criticalAlerts ?? 0} sub={(data?.criticalAlerts ?? 0) === 0 ? "tout va bien" : "nécessitent action"} color={(data?.criticalAlerts ?? 0) > 0 ? "text-red-400" : "text-white"} icon={AlertTriangle} />
            <StatCard label="Adhésion nutrition" value={`${data?.avgAdherence ?? 0}%`} sub="moyenne 7 derniers jours" color={(data?.avgAdherence ?? 0) >= 80 ? "text-green-400" : (data?.avgAdherence ?? 0) >= 60 ? "text-amber-400" : "text-red-400"} icon={Apple} />
            <StatCard label="PR cette semaine" value={data?.prThisWeek ?? 0} sub="tous clients confondus" color={(data?.prThisWeek ?? 0) > 0 ? "text-amber-400" : "text-white"} icon={Trophy} />
          </div>

          {/* Alerts */}
          <section className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={14} className="text-red-400" />
              <h2 className="text-sm font-black uppercase tracking-widest text-red-400/80">Points d&apos;attention</h2>
              {totalAlerts > 0 && (
                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/25">{totalAlerts}</span>
              )}
            </div>
            {clientsWithAlerts.length === 0 ? (
              <div className="bg-[#1f0101] border border-[#890404]/20 rounded-xl px-5 py-8 text-center">
                <CheckCircle2 size={24} className="text-green-400 mx-auto mb-3" strokeWidth={1.5} />
                <p className="text-sm font-bold text-green-400">Aucune alerte — tout roule !</p>
                <p className="text-xs text-[#F5EDED]/30 mt-1">Tous tes clients sont dans les clous</p>
              </div>
            ) : (
              <div className="space-y-3">{clientsWithAlerts.map((c) => <AlertCard key={c.id} client={c} />)}</div>
            )}
          </section>

          {/* Highlights */}
          <section className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 size={14} className="text-green-400" />
              <h2 className="text-sm font-black uppercase tracking-widest text-green-400/80">Ce qui fonctionne</h2>
              {clientsWithHighlights.length > 0 && (
                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/25">
                  {clientsWithHighlights.reduce((s, c) => s + c.highlights.length, 0)}
                </span>
              )}
            </div>
            {clientsWithHighlights.length === 0 ? (
              <div className="bg-[#1f0101] border border-[#890404]/20 rounded-xl px-5 py-6 text-center">
                <p className="text-xs text-[#F5EDED]/30">Les points positifs apparaîtront ici</p>
              </div>
            ) : (
              <div className="space-y-3">{clientsWithHighlights.map((c) => <HighlightCard key={c.id} client={c} />)}</div>
            )}
          </section>

          {/* Overview table */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <BarChart2 size={14} className="text-[#F5EDED]/50" />
              <h2 className="text-sm font-black uppercase tracking-widest text-[#F5EDED]/50">Vue d&apos;ensemble — 21 jours</h2>
            </div>
            {clients.length === 0 ? (
              <div className="bg-[#1f0101] border border-[#890404]/20 rounded-xl px-5 py-8 text-center">
                <p className="text-xs text-[#F5EDED]/30">Aucun client actif</p>
              </div>
            ) : (
              <div className="bg-[#1f0101] border border-[#890404]/25 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[#890404]/20">
                        {["Client", "Alertes", "Highlights", "Poids 21j", "Adhésion", "Séances/sem", "Dernière activité"].map((h) => (
                          <th key={h} className="text-[8px] font-bold uppercase tracking-widest text-[#F5EDED]/30 py-3 px-3 text-left whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {clients.map((c) => (
                        <tr key={c.id} className="border-b border-[#890404]/10 hover:bg-[#890404]/5 transition-colors">
                          <td className="py-3 px-3">
                            <Link href={`/dashboard/coach/clients/${c.id}`} className="font-black text-white hover:text-[#E01E1E] transition-colors whitespace-nowrap">
                              {c.full_name ?? "—"}
                            </Link>
                          </td>
                          <td className="py-3 px-3">{c.alerts.length > 0 ? <span className="font-black text-red-400">{c.alerts.length}</span> : <span className="text-green-400 font-bold">0 ✓</span>}</td>
                          <td className="py-3 px-3">{c.highlights.length > 0 ? <span className="font-black text-green-400">{c.highlights.length}</span> : <span className="text-[#F5EDED]/25">—</span>}</td>
                          <td className="py-3 px-3">
                            {c.weightVar21d != null ? (
                              <span className="text-[#F5EDED]/70 font-bold">{c.weightVar21d > 0 ? "+" : ""}{c.weightVar21d} kg</span>
                            ) : <span className="text-[#F5EDED]/25">—</span>}
                          </td>
                          <td className="py-3 px-3"><span className={cellColor(c.nutritionAdherence7d, { ok: 80, warn: 60 })}>{c.nutritionAdherence7d != null ? `${c.nutritionAdherence7d}%` : "—"}</span></td>
                          <td className="py-3 px-3"><span className={cellColor(c.sessionsThisWeek, { ok: 3, warn: 1 })}>{c.sessionsThisWeek}</span></td>
                          <td className="py-3 px-3 text-[#F5EDED]/40 whitespace-nowrap">
                            {c.lastActivity ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(c.lastActivity + "T12:00:00")) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
