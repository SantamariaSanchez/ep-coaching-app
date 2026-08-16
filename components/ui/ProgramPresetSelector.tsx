"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dumbbell, Check, ChevronDown, ChevronUp } from "lucide-react";
import { PRESET_PROGRAMS } from "@/lib/preset-programs";
import type { ProgramInput } from "@/utils/programs";

export default function ProgramPresetSelector({
  clientId,
  currentProgramName,
  saveProgram,
}: {
  clientId: string;
  currentProgramName: string | null;
  saveProgram: (clientId: string, input: ProgramInput) => Promise<{ error?: string }>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const activePreset = PRESET_PROGRAMS.find((p) => p.input.name === currentProgramName);

  async function handleActivate() {
    if (!selected) return;
    const preset = PRESET_PROGRAMS.find((p) => p.id === selected);
    if (!preset) return;
    setError(null);
    startTransition(async () => {
      const result = await saveProgram(clientId, preset.input);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        router.refresh();
      }
    });
  }

  return (
    <div>
      <div className="mb-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Choisir un programme
        </p>
        <p className="text-sm text-[#F5EDED]/45 leading-relaxed">
          Sélectionne un programme adapté à ton niveau et tes disponibilités. Tu peux en changer à tout moment.
        </p>
      </div>

      <div className="space-y-3 mb-6">
        {PRESET_PROGRAMS.map((preset) => {
          const isActive = activePreset?.id === preset.id;
          const isSelected = selected === preset.id;
          const isExpanded = expanded === preset.id;

          return (
            <div
              key={preset.id}
              className={`border rounded-xl transition-all ${
                isSelected
                  ? "border-[#E01E1E]/60 bg-[#E01E1E]/8"
                  : isActive
                  ? "border-green-500/30 bg-green-500/5"
                  : "border-[#890404]/25 bg-[#1f0101]"
              }`}
            >
              <button
                onClick={() => {
                  setSelected(isSelected ? null : preset.id);
                  setSuccess(false);
                }}
                className="w-full flex items-center gap-4 p-4 text-left"
              >
                <div
                  className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center ${
                    isSelected ? "bg-[#E01E1E]/20" : "bg-[#890404]/15"
                  }`}
                >
                  <Dumbbell
                    size={18}
                    strokeWidth={1.8}
                    className={isSelected ? "text-[#E01E1E]" : "text-[#F5EDED]/40"}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-black text-white">{preset.name}</p>
                    <span
                      className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                      style={{
                        background: "rgba(137,4,4,0.2)",
                        color: "rgba(245,237,237,0.5)",
                      }}
                    >
                      {preset.frequency}x / semaine
                    </span>
                    {isActive && (
                      <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-green-500/15 text-green-400">
                        Actif
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#F5EDED]/40 mt-0.5 leading-relaxed">
                    {preset.description}
                  </p>
                </div>
                {isSelected ? (
                  <Check size={16} className="text-[#E01E1E] flex-shrink-0" />
                ) : null}
              </button>

              {/* Détail des séances */}
              <div className="px-4 pb-2">
                <button
                  onClick={() => setExpanded(isExpanded ? null : preset.id)}
                  aria-expanded={isExpanded}
                  className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/30 hover:text-[#F5EDED]/55 transition-colors py-1"
                >
                  {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  Voir les séances
                </button>
                {isExpanded && (
                  <div className="mt-3 mb-3 space-y-3">
                    {preset.input.days.map((day, di) => (
                      <div
                        key={di}
                        className="bg-black/25 border border-[#890404]/12 rounded-lg p-3"
                      >
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#E01E1E]/70 mb-2">
                          {day.day_label}
                        </p>
                        <div className="space-y-1.5">
                          {day.exercises.map((ex, ei) => (
                            <div key={ei} className="flex items-baseline gap-2">
                              <span className="text-xs font-semibold text-[#F5EDED]/75">
                                {ex.name}
                              </span>
                              <span className="text-[10px] text-[#F5EDED]/35 whitespace-nowrap">
                                {ex.sets} x {ex.reps}
                                {ex.rir !== null ? ` · RIR ${ex.rir}` : ""}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <p className="text-xs text-red-400 mb-3">{error}</p>
      )}
      {success && (
        <p className="text-xs text-green-400 mb-3">Programme activé avec succès.</p>
      )}

      <button
        onClick={handleActivate}
        disabled={!selected || isPending || selected === activePreset?.id}
        className="w-full py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        style={{
          background: selected && selected !== activePreset?.id ? "#E01E1E" : "rgba(137,4,4,0.15)",
          color: selected && selected !== activePreset?.id ? "#fff" : "rgba(245,237,237,0.35)",
        }}
      >
        {isPending ? "Activation..." : selected === activePreset?.id ? "Programme actif" : "Activer ce programme"}
      </button>
    </div>
  );
}
