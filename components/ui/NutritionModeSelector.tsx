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
  // Rend les 3 badges cliquables pour changer le mode du plan actif
  // directement depuis le suivi du jour (demande explicite 2026-08-17 :
  // "je veux pouvoir modifier mon fixe ou variable"). Optionnel : reste un
  // pur badge en lecture seule quand absent (client suivi par un coach,
  // qui seul peut changer le mode de son plan).
  onChange?: (mode: DietMode) => void;
  changing?: boolean;
}

export default function NutritionModeSelector({ activeMode, onChange, changing = false }: Props) {
  return (
    <div className="flex gap-2 mb-6">
      {MODES.map(({ key, label, icon: Icon, description }) => {
        const isActive = activeMode === key;
        const Tag = onChange ? "button" : "div";
        return (
          <Tag
            key={key}
            type={onChange ? "button" : undefined}
            onClick={onChange && !isActive ? () => onChange(key) : undefined}
            disabled={onChange ? changing || isActive : undefined}
            className={`flex-1 flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl border transition-all ${
              isActive
                ? "bg-[#E01E1E]/12 border-[#E01E1E]/40 text-[#E01E1E]"
                : "bg-[#1f0101] border-[#890404]/20 text-[#F5EDED]/30"
            } ${onChange && !isActive ? "hover:border-[#E01E1E]/30 hover:text-[#F5EDED]/60 cursor-pointer disabled:opacity-40" : ""}`}
          >
            <Icon size={16} strokeWidth={isActive ? 2.5 : 1.8} />
            <span className="text-[9px] font-black uppercase tracking-widest leading-none">
              {label}
            </span>
            {isActive && (
              <span className="text-[8px] text-[#E01E1E]/70 text-center leading-tight hidden sm:block">
                {description}
              </span>
            )}
          </Tag>
        );
      })}
    </div>
  );
}
