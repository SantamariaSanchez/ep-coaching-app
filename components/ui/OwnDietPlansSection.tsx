"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { PlanBuilder, PlansListView } from "@/components/ui/DietPlanManager";
import type { Food, DietPlanWithMeals, DietMode } from "@/utils/nutrition";
import type { DietPlanMealInput } from "@/app/dashboard/coach/clients/[id]/nutrition/diet-plan-actions";

interface Props {
  foods: Food[];
  plans: DietPlanWithMeals[];
  createOwnDietPlan: (name: string, mode: DietMode, meals: DietPlanMealInput[]) => Promise<{ error?: string; id?: string }>;
  activateOwnDietPlan: (planId: string) => Promise<{ error?: string }>;
  deactivateOwnDietPlan: (planId: string) => Promise<{ error?: string }>;
  deleteOwnDietPlan: (planId: string) => Promise<{ error?: string }>;
}

export default function OwnDietPlansSection({
  foods,
  plans,
  createOwnDietPlan,
  activateOwnDietPlan,
  deactivateOwnDietPlan,
  deleteOwnDietPlan,
}: Props) {
  const [showBuilder, setShowBuilder] = useState(plans.length === 0);

  return (
    <div className="max-w-2xl mx-auto px-6 mb-8 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
            Mes plans alimentaires
          </p>
          <p className="text-sm text-[#F5EDED]/40">
            Crée ton propre plan, ou logue librement en mode flexible.
          </p>
        </div>
        <button
          onClick={() => setShowBuilder((v) => !v)}
          className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#E01E1E] hover:text-[#ff4444] transition-colors flex-shrink-0 ml-3"
        >
          <Plus size={12} />
          {showBuilder ? "Fermer" : "Nouveau plan"}
        </button>
      </div>

      {showBuilder && (
        <div className="bg-[#150000] border border-[#890404]/25 rounded-xl p-4">
          <PlanBuilder
            foods={foods}
            onCreate={async (name, mode, meals) => {
              await createOwnDietPlan(name, mode, meals);
              setShowBuilder(false);
            }}
          />
        </div>
      )}

      <PlansListView
        plans={plans}
        foods={foods}
        onActivate={async (planId) => { await activateOwnDietPlan(planId); }}
        onDeactivate={async (planId) => { await deactivateOwnDietPlan(planId); }}
        onDelete={async (planId) => { await deleteOwnDietPlan(planId); }}
      />
    </div>
  );
}
