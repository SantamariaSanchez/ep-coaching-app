"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { useState } from "react";
import { Plus } from "lucide-react";
import { PlansListView } from "@/components/ui/DietPlanManager";
import DietBuilder from "@/components/diet-builder/DietBuilder";
import type { Food, DietPlanWithMeals, DietMode, DietStructure } from "@/utils/nutrition";
import type { DietPlanMealInput } from "@/app/dashboard/coach/clients/[id]/nutrition/diet-plan-actions";

interface Props {
  foods: Food[];
  plans: DietPlanWithMeals[];
  /** Cibles macro de la personne : le tableur peut ajuster les grammages dessus. */
  targets?: { calories: number; proteins: number; carbs: number; fats: number } | null;
  createOwnDietPlan: (name: string, mode: DietMode, meals: DietPlanMealInput[], structure?: DietStructure) => Promise<{ error?: string; id?: string }>;
  activateOwnDietPlan: (planId: string) => Promise<{ error?: string }>;
  deactivateOwnDietPlan: (planId: string) => Promise<{ error?: string }>;
  deleteOwnDietPlan: (planId: string) => Promise<{ error?: string }>;
}

export default function OwnDietPlansSection({
  foods,
  plans,
  targets = null,
  createOwnDietPlan,
  activateOwnDietPlan,
  deactivateOwnDietPlan,
  deleteOwnDietPlan,
}: Props) {
  const t = useT();
  const [showBuilder, setShowBuilder] = useState(plans.length === 0);

  return (
    <div className={`${showBuilder ? "max-w-5xl px-3 sm:px-6" : "max-w-2xl px-6"} mx-auto mb-8 space-y-5`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-(--ep-ink)/35 mb-1">
            {t("Mes plans alimentaires")}
          </p>
          <p className="text-sm text-(--ep-ink)/40">
            {t("Crée ton propre plan, ou logue librement en mode flexible.")}
          </p>
        </div>
        <button
          onClick={() => setShowBuilder((v) => !v)}
          className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-(--ep-accent) hover:text-(--ep-accent-hi) transition-colors flex-shrink-0 ml-3"
        >
          <Plus size={12} />
          {showBuilder ? t("Fermer") : t("Nouveau plan")}
        </button>
      </div>

      {/* Le tableur de diète (2026-10-13) : le même outil que celui des
          coachs, en version perso (pas de fiche, pas de notification). Un
          membre qui veut juste se faire son plan le fait en 2 minutes, aliment
          par aliment, avec ses macros qui se calculent en direct. */}
      {showBuilder && (
        <DietBuilder
          self
          clientName={t("moi")}
          foods={foods}
          targets={targets}
          onClose={() => setShowBuilder(false)}
          onCreate={async (name, mode, meals, structure) => {
            const result = await createOwnDietPlan(name, mode, meals, structure);
            return { error: result.error };
          }}
        />
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
