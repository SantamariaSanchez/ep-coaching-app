"use client";

import { Minus, Plus } from "lucide-react";
import { bumpValue } from "@/lib/live-session";

// Saisie au pouce en salle : [−] valeur [+], cibles de 44 px, la valeur
// reste tapable au clavier pour un saut plus grand.
export default function Stepper({
  value,
  placeholder,
  onChange,
  step,
  unit,
  label,
  decimal = false,
  compact = false,
}: {
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
  step: number;
  unit: string;
  label: string;
  decimal?: boolean;
  compact?: boolean;
}) {
  const base = value !== "" ? value : placeholder ?? "";
  const display = value.replace(".", ",");
  return (
    <div className="flex items-stretch min-w-0 flex-1 min-h-11 rounded-xl border border-(--ep-line)/30 bg-(--ep-s2) overflow-hidden">
      <button
        type="button"
        onClick={() => onChange(bumpValue(base, -step, decimal ? 1 : 0))}
        aria-label={`${label} moins ${String(step).replace(".", ",")}`}
        className="w-11 shrink-0 flex items-center justify-center text-(--ep-ink)/60 active:bg-(--ep-line)/20"
      >
        <Minus size={16} strokeWidth={2.5} />
      </button>
      <label className={`flex-1 min-w-0 flex flex-col items-center justify-center ${compact ? "py-1" : "py-1.5"}`}>
        <input
          type="text"
          inputMode={decimal ? "decimal" : "numeric"}
          value={display}
          placeholder={placeholder ? placeholder.replace(".", ",") : "0"}
          onChange={(e) => onChange(e.target.value.replace(",", ".").replace(/[^0-9.]/g, ""))}
          onFocus={(e) => e.target.select()}
          aria-label={label}
          className={`w-full min-w-0 bg-transparent text-center font-black tabular-nums text-(--ep-strong) ${placeholder ? "placeholder:text-(--ep-strong)/60" : "placeholder:text-(--ep-ink)/30"} focus:outline-none ${
            compact ? "text-base leading-5" : "text-xl leading-6"
          }`}
        />
        <span className="text-[9px] font-bold uppercase tracking-wider text-(--ep-ink)/40 leading-3">{unit}</span>
      </label>
      <button
        type="button"
        onClick={() => onChange(bumpValue(base, step, decimal ? 1 : 0))}
        aria-label={`${label} plus ${String(step).replace(".", ",")}`}
        className="w-11 shrink-0 flex items-center justify-center text-(--ep-ink)/60 active:bg-(--ep-line)/20"
      >
        <Plus size={16} strokeWidth={2.5} />
      </button>
    </div>
  );
}
