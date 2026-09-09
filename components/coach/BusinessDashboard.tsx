"use client";

import { Users, TrendingUp, Wallet, Target, Network, CheckSquare, ArrowRight } from "lucide-react";
import type { BusinessGoal } from "@/lib/coach-business-goals";

// Tableau de bord business (Axe 6, passe "masterclass" 2026-09-09) : les 6
// autres sections de cet espace (objectifs, roadmap, modèle économique,
// funnel, réseau, checklist) sont chacune un vrai outil, mais rien ne
// résumait l'état d'ensemble d'un coup d'oeil avant d'ouvrir un onglet en
// particulier. Chaque carte est cliquable et amène directement à la
// section concernée.

function eur(n: number): string {
  return n.toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + "€";
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + "T12:00:00").getTime();
  return Math.ceil((target - Date.now()) / (24 * 60 * 60 * 1000));
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="ep-card text-left w-full group" style={{ padding: "16px 18px" }}>
      <div className="flex items-center justify-between mb-2">
        <div className="w-8 h-8 rounded-lg bg-[#E01E1E]/12 flex items-center justify-center flex-shrink-0">
          <Icon size={15} className="text-[#E01E1E]" strokeWidth={2} />
        </div>
        <ArrowRight size={13} className="text-[#F5EDED]/15 group-hover:text-[#E01E1E] transition-colors" />
      </div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-0.5">{label}</p>
      <p className="text-xl font-black text-white">{value}</p>
      {sub && <p className="text-[10.5px] text-[#F5EDED]/35 mt-0.5">{sub}</p>}
    </button>
  );
}

export default function BusinessDashboard({
  activeClientsCount,
  newClientsThisMonth,
  revenueThisMonth,
  checklistDone,
  checklistTotal,
  roadmapMilestonesDone,
  roadmapMilestonesTotal,
  nearestGoal,
  networkActiveCount,
  networkTotalCount,
  onNavigate,
}: {
  activeClientsCount: number;
  newClientsThisMonth: number;
  revenueThisMonth: number;
  checklistDone: number;
  checklistTotal: number;
  roadmapMilestonesDone: number;
  roadmapMilestonesTotal: number;
  nearestGoal: { goal: BusinessGoal; currentValue: number } | null;
  networkActiveCount: number;
  networkTotalCount: number;
  onNavigate: (tab: string) => void;
}) {
  const nearestPct = nearestGoal
    ? Math.min(100, Math.round((nearestGoal.currentValue / nearestGoal.goal.target_value) * 100))
    : 0;

  return (
    <div>
      {nearestGoal && (
        <button
          onClick={() => onNavigate("objectifs")}
          className="ep-card w-full text-left mb-4 group"
          style={{ padding: "18px 20px", borderColor: "rgba(224,30,30,0.3)" }}
        >
          <div className="flex items-center justify-between mb-2.5">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/40">
              <Target size={12} className="text-[#E01E1E]" /> Prochain objectif
            </p>
            {nearestGoal.goal.target_date && (
              <span className="text-[10px] font-bold text-[#F5EDED]/35">
                dans {daysUntil(nearestGoal.goal.target_date)}j
              </span>
            )}
          </div>
          <p className="text-base font-black text-white mb-2">{nearestGoal.goal.title}</p>
          <div className="h-2 bg-[#150000] rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-[#E01E1E] transition-all" style={{ width: `${nearestPct}%` }} />
          </div>
          <p className="text-[10.5px] text-[#F5EDED]/35 mt-1.5">{nearestPct}% atteint</p>
        </button>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        <KpiCard
          icon={Users}
          label="Clients actifs"
          value={String(activeClientsCount)}
          sub={newClientsThisMonth > 0 ? `+${newClientsThisMonth} ce mois-ci` : undefined}
          onClick={() => onNavigate("dashboard")}
        />
        <KpiCard
          icon={Wallet}
          label="Revenu du mois"
          value={eur(revenueThisMonth)}
          sub="Journal Revenus & dépenses"
          onClick={() => onNavigate("dashboard")}
        />
        <KpiCard
          icon={TrendingUp}
          label="Objectifs en cours"
          value={String(nearestGoal ? 1 : 0)}
          sub={nearestGoal ? `${nearestPct}% du plus proche` : "Aucun objectif fixé"}
          onClick={() => onNavigate("objectifs")}
        />
        <KpiCard
          icon={Network}
          label="Réseau actif"
          value={`${networkActiveCount}/${networkTotalCount}`}
          sub="Partenaires, affiliés, influenceurs"
          onClick={() => onNavigate("reseau")}
        />
        <KpiCard
          icon={CheckSquare}
          label="Marque personnelle"
          value={`${checklistDone}/${checklistTotal}`}
          sub="Checklist de construction"
          onClick={() => onNavigate("checklist")}
        />
        <KpiCard
          icon={Target}
          label="Jalons roadmap"
          value={`${roadmapMilestonesDone}/${roadmapMilestonesTotal}`}
          sub="Vision 1/3/10/20 ans"
          onClick={() => onNavigate("roadmap")}
        />
      </div>
    </div>
  );
}
