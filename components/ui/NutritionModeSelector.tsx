"use client";

import { Shuffle, Lock, Sliders } from "lucide-react";
import type { DietMode } from "@/utils/nutrition";

const MODES: {
  key: DietMode;
  label: string;
  icon: React.ElementType;
  description: string;
}[] = [
  {
    key: "flexible",
    label: "Flexible",
    icon: Shuffle,
    description: "Logge librement tes repas",
  },
  {
    key: "fixed",
    label: "Fixe",
    icon: Lock,
    description: "Plan défini par ton coach",
  },
  {
    key: "fixed_flexible",
    label: "Fixe Flexible",
    icon: Sliders,
    description: "Plan avec swaps autorisés",
  },
];

interface Props {
  activeMode: DietMode;
}

export default function NutritionModeSelector({ activeMode }: Props) {
  return (
    <div className="flex gap-2 mb-6">
      {MODES.map(({ key, label, icon: Icon, description }) => {
        const isActive = activeMode === key;
        return (
          <div
            key={key}
            className={`flex-1 flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl border transition-all ${
              isActive
                ? "bg-[var(--color-ep-red)]/12 border-[var(--color-ep-red)]/40 text-[var(--color-ep-red)]"
                : "bg-[var(--color-ep-card)] border-[var(--color-ep-dark-red)]/20 text-[var(--color-ep-light)]/30"
            }`}
          >
            <Icon size={16} strokeWidth={isActive ? 2.5 : 1.8} />
            <span className="text-[9px] font-black uppercase tracking-widest leading-none">
              {label}
            </span>
            {isActive && (
              <span className="text-[8px] text-[var(--color-ep-red)]/70 text-center leading-tight hidden sm:block">
                {description}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
