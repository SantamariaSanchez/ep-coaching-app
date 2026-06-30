"use client";

import { useState } from "react";
import { Moon, Sun, Palette, RotateCcw } from "lucide-react";
import { useTheme } from "@/components/ui/ThemeProvider";
import { DEFAULT_ACCENT } from "@/lib/theme";

export default function AppearanceSettings() {
  const { mode, accent, setMode, setAccent, resetAccent } = useTheme();
  const [pickerValue, setPickerValue] = useState(accent);

  return (
    <div className="bg-[var(--color-ep-card)] border border-[var(--color-ep-dark-red)]/25 rounded-xl p-5 mb-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-ep-light)]/35 mb-4">
        Apparence
      </p>

      <div className="flex items-center justify-between gap-3 pb-4 mb-4 border-b border-[var(--color-ep-dark-red)]/10">
        <div>
          <p className="text-sm font-semibold text-[var(--color-ep-light)]">Thème</p>
          <p className="text-[11px] text-[var(--color-ep-light)]/35 mt-0.5">Sombre ou clair</p>
        </div>
        <div className="flex gap-1.5 bg-[var(--color-ep-input)] border border-[var(--color-ep-dark-red)]/20 rounded-lg p-1">
          <button
            onClick={() => setMode("dark")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wide transition-colors ${
              mode === "dark"
                ? "bg-[var(--color-ep-red)] text-white"
                : "text-[var(--color-ep-light)]/40 hover:text-[var(--color-ep-light)]/70"
            }`}
          >
            <Moon size={12} /> Sombre
          </button>
          <button
            onClick={() => setMode("light")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wide transition-colors ${
              mode === "light"
                ? "bg-[var(--color-ep-red)] text-white"
                : "text-[var(--color-ep-light)]/40 hover:text-[var(--color-ep-light)]/70"
            }`}
          >
            <Sun size={12} /> Clair
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <Palette size={14} className="text-[var(--color-ep-light)]/40 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-[var(--color-ep-light)]">Couleur personnalisée</p>
            <p className="text-[11px] text-[var(--color-ep-light)]/35 mt-0.5">Remplace le rouge par ta couleur</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={pickerValue}
            onChange={(e) => setPickerValue(e.target.value)}
            onBlur={() => setAccent(pickerValue)}
            className="w-9 h-9 rounded-lg border border-[var(--color-ep-dark-red)]/25 bg-transparent cursor-pointer"
            style={{ padding: 0 }}
          />
          {accent.toLowerCase() !== DEFAULT_ACCENT.toLowerCase() && (
            <button
              onClick={() => {
                resetAccent();
                setPickerValue(DEFAULT_ACCENT);
              }}
              title="Revenir au rouge EP Coaching"
              className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-[var(--color-ep-light)]/35 hover:text-[var(--color-ep-light)]/65 transition-colors"
            >
              <RotateCcw size={11} /> Réinitialiser
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
