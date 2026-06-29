"use client";

import { useState } from "react";
import ClientNutritionView from "@/components/ui/ClientNutritionView";
import CoachClientNutritionTabs from "@/components/ui/CoachClientNutritionTabs";
import type { ComponentProps } from "react";

type ClientViewProps = ComponentProps<typeof ClientNutritionView>;
type ManageProps = ComponentProps<typeof CoachClientNutritionTabs>;

export default function CoachMoiNutritionTabs({
  clientView,
  manageProps,
}: {
  clientView: ClientViewProps;
  manageProps: ManageProps;
}) {
  const [tab, setTab] = useState<"suivi" | "gerer">("suivi");

  return (
    <div>
      <div className="flex gap-1 mb-6 border-b border-[#890404]/20 overflow-x-auto">
        {([
          { key: "suivi" as const, label: "Suivi du jour" },
          { key: "gerer" as const, label: "Mes objectifs & plan" },
        ]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors rounded-t-lg -mb-px whitespace-nowrap ${
              tab === key
                ? "text-[#E01E1E] border-b-2 border-[#E01E1E]"
                : "text-[#F5EDED]/40 hover:text-[#F5EDED]/70"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "suivi" ? (
        <ClientNutritionView {...clientView} />
      ) : (
        <CoachClientNutritionTabs {...manageProps} />
      )}
    </div>
  );
}
