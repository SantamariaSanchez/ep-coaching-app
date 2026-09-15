"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Gauge, Target, Compass, LayoutGrid, Layers, Network, CheckSquare,
  Sparkles, GraduationCap, ArrowRight,
} from "lucide-react";
import type { RoadmapHorizon } from "@/lib/coach-roadmap";
import { FUNNEL_STAGES, BUSINESS_CHECKLIST } from "@/lib/coach-business";
import type { BusinessGoal } from "@/lib/coach-business-goals";
import type { BusinessCanvas } from "@/lib/coach-business-canvas";
import type { NetworkContact } from "@/lib/coach-network";
import BusinessDashboard from "./BusinessDashboard";
import BusinessGoals from "./BusinessGoals";
import BusinessCanvasEditor from "./BusinessCanvasEditor";
import NetworkTracker from "./NetworkTracker";
import RoadmapPlanner, { type RoadmapMilestone } from "./RoadmapPlanner";
import FunnelIdeaCard from "./FunnelIdeaCard";
import BusinessChecklist from "./BusinessChecklist";

// Hub "Développer mon business" (Axe 6, passe "masterclass" 2026-09-09) —
// demande directe : "pas juste un petit onglet avec des cases à cocher
// mais une incroyable architecture... plein plein de fonctionnalités".
// 7 sections réelles plutôt qu'une page qui défile à l'infini : chacune se
// suffit à elle-même, un onglet grille (même esprit que ClientProfileTabs)
// plutôt qu'une navigation cachée dans un menu.

const TABS = [
  { key: "dashboard", label: "Tableau de bord", icon: Gauge },
  { key: "objectifs", label: "Objectifs", icon: Target },
  { key: "roadmap", label: "Roadmap", icon: Compass },
  { key: "canvas", label: "Modèle éco.", icon: LayoutGrid },
  { key: "funnel", label: "Funnel", icon: Layers },
  { key: "reseau", label: "Réseau", icon: Network },
  { key: "checklist", label: "Marque perso", icon: CheckSquare },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function BusinessHub({
  activeClientsCount,
  newClientsThisMonth,
  revenueThisMonth,
  goalsWithProgress,
  initialVisions,
  initialMilestones,
  canvas,
  networkContacts,
  checklistDone,
}: {
  activeClientsCount: number;
  newClientsThisMonth: number;
  revenueThisMonth: number;
  goalsWithProgress: { goal: BusinessGoal; currentValue: number }[];
  initialVisions: Partial<Record<RoadmapHorizon, string>>;
  initialMilestones: RoadmapMilestone[];
  canvas: BusinessCanvas | null;
  networkContacts: NetworkContact[];
  checklistDone: string[];
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("dashboard");

  const activeGoals = goalsWithProgress.filter((g) => g.goal.status === "active");
  const nearestGoal =
    [...activeGoals]
      .filter((g) => g.goal.target_date)
      .sort((a, b) => (a.goal.target_date! < b.goal.target_date! ? -1 : 1))[0] ??
    activeGoals[0] ??
    null;

  const roadmapMilestonesDone = initialMilestones.filter((m) => m.done).length;
  const networkActiveCount = networkContacts.filter((c) => c.status === "actif").length;

  return (
    <div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2 mb-6">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`relative flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl border text-center transition-colors ${
              activeTab === key
                ? "bg-[#E01E1E]/12 border-[#E01E1E]/40 text-[#E01E1E]"
                : "bg-[#1f0101] border-[#890404]/20 text-[#F5EDED]/45 hover:border-[#890404]/40 hover:text-[#F5EDED]/70"
            }`}
          >
            <Icon size={17} strokeWidth={activeTab === key ? 2.2 : 1.7} />
            <span className="text-[9px] font-bold uppercase tracking-wider leading-tight">{label}</span>
          </button>
        ))}
      </div>

      {/*
        Repasse 2026-09-15 : même piège de démontage déjà trouvé et corrigé
        ailleurs ce jour-là (MASTERCLASS.md Axe BW) — le canvas business
        annonce lui-même "s'enregistre tout seul quand tu cliques ailleurs"
        (autosave sur blur), un démontage en plein milieu d'une saisie
        pourrait couper cet autosave avant qu'il ne se déclenche. Les 7
        onglets restent désormais montés en permanence, seule la
        visibilité change.
      */}
      <div hidden={activeTab !== "dashboard"}>
        <BusinessDashboard
          activeClientsCount={activeClientsCount}
          newClientsThisMonth={newClientsThisMonth}
          revenueThisMonth={revenueThisMonth}
          checklistDone={checklistDone.length}
          checklistTotal={BUSINESS_CHECKLIST.length}
          roadmapMilestonesDone={roadmapMilestonesDone}
          roadmapMilestonesTotal={initialMilestones.length}
          nearestGoal={nearestGoal}
          networkActiveCount={networkActiveCount}
          networkTotalCount={networkContacts.length}
          onNavigate={(tab) => setActiveTab(tab as TabKey)}
        />
      </div>

      <div hidden={activeTab !== "objectifs"}>
        <BusinessGoals goalsWithProgress={goalsWithProgress} />
      </div>

      <div hidden={activeTab !== "roadmap"}>
        <p className="text-[12px] text-[#F5EDED]/40 leading-relaxed mb-4 max-w-xl">
          Un horizon différent appelle une question différente : dans 1 an c&apos;est l&apos;exécution,
          dans 20 c&apos;est ce qui reste si tu t&apos;arrêtes. Écris, coche des jalons, révise régulièrement.
        </p>
        <RoadmapPlanner initialVisions={initialVisions} initialMilestones={initialMilestones} />
      </div>

      <div hidden={activeTab !== "canvas"}>
        <p className="text-[12px] text-[#F5EDED]/40 leading-relaxed mb-4 max-w-xl">
          Les 9 blocs classiques du Business Model Canvas, adaptés à un business de coach individuel.
          Chaque bloc s&apos;enregistre tout seul quand tu cliques ailleurs.
        </p>
        <BusinessCanvasEditor canvas={canvas} />
      </div>

      <div hidden={activeTab !== "funnel"}>
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p className="text-[12px] text-[#F5EDED]/40 leading-relaxed max-w-xl">
            Une idée qui te plaît ? Ajoute-la directement à ton Studio créatif pour la transformer en script.
          </p>
          <Link
            href="/dashboard/coach/studio"
            className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#E01E1E] hover:text-[#ff4444] flex-shrink-0"
          >
            <Sparkles size={12} /> Ouvrir le Studio <ArrowRight size={11} />
          </Link>
        </div>
        <div className="space-y-3">
          {FUNNEL_STAGES.map((stage) => (
            <div key={stage.key} className="ep-card" style={{ padding: "18px 20px" }}>
              <p className="text-sm font-black text-white mb-1">{stage.label}</p>
              <p className="text-[11.5px] text-[#F5EDED]/45 leading-relaxed mb-3">{stage.goal}</p>
              <div className="grid sm:grid-cols-3 gap-2">
                {stage.formats.map((f, i) => (
                  <FunnelIdeaCard key={i} stage={stage.key} platform={f.platform} format={f.format} idea={f.idea} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div hidden={activeTab !== "reseau"}>
        <NetworkTracker contacts={networkContacts} />
      </div>

      <div hidden={activeTab !== "checklist"}>
        <div>
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <p className="text-[12px] text-[#F5EDED]/40 leading-relaxed max-w-xl">
              Construis ta base : positionnement, personal branding, contenu, preuve sociale, conversion.
            </p>
            <Link
              href="/dashboard/coach/moi/formations"
              className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#E01E1E] hover:text-[#ff4444] flex-shrink-0"
            >
              <GraduationCap size={12} /> ENTREPRENARIAL SECRET <ArrowRight size={11} />
            </Link>
          </div>
          <BusinessChecklist initialDone={checklistDone} />
        </div>
      </div>
    </div>
  );
}
