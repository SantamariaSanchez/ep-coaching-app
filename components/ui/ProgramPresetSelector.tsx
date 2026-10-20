"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dumbbell, Check, ChevronDown, ChevronUp } from "lucide-react";
import { PRESET_PROGRAMS, type PresetRecommendation } from "@/lib/preset-programs";
import type { ProgramInput } from "@/utils/programs";
import { safeAction } from "@/lib/safe-action";

export default function ProgramPresetSelector({
  clientId,
  currentProgramName,
  saveProgram,
  recommendation,
}: {
  clientId: string;
  currentProgramName: string | null;
  saveProgram: (clientId: string, input: ProgramInput) => Promise<{ error?: string }>;
  /** Programme conseillé d'après le quiz d'onboarding (recommendPreset). */
  recommendation?: PresetRecommendation | null;
}) {
  const t = useT();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const activePresetId = PRESET_PROGRAMS.find((p) => p.input.name === currentProgramName)?.id ?? null;
  // Sans programme, le conseillé est présélectionné : un seul tap sur
  // "Activer" suffit au lieu de devoir d'abord choisir parmi cinq.
  const [selected, setSelected] = useState<string | null>(
    !currentProgramName && recommendation ? recommendation.preset.id : null
  );
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const activePreset = PRESET_PROGRAMS.find((p) => p.id === activePresetId);
  // Le conseillé en tête de liste, le reste dans l'ordre d'origine.
  const presets = recommendation
    ? [recommendation.preset, ...PRESET_PROGRAMS.filter((p) => p.id !== recommendation.preset.id)]
    : PRESET_PROGRAMS;

  async function handleActivate() {
    if (!selected) return;
    const preset = PRESET_PROGRAMS.find((p) => p.id === selected);
    if (!preset) return;
    setError(null);
    startTransition(async () => {
      const result = await safeAction(() => saveProgram(clientId, preset.input));
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
        <p className="text-[10px] font-bold uppercase tracking-widest text-(--ep-ink)/35 mb-1">
          {t("Choisir un programme")}
        </p>
        <p className="text-sm text-(--ep-ink)/45 leading-relaxed">
          {t("Sélectionne un programme adapté à ton niveau et tes disponibilités. Tu peux en changer à tout moment.")}
        </p>
      </div>

      <div className="space-y-3 mb-6">
        {presets.map((preset) => {
          const isRecommended = recommendation?.preset.id === preset.id;
          const isActive = activePreset?.id === preset.id;
          const isSelected = selected === preset.id;
          const isExpanded = expanded === preset.id;

          return (
            <div
              key={preset.id}
              className={`border rounded-xl transition-all ${
                isSelected
                  ? "border-(--ep-accent)/60 bg-(--ep-accent)/8"
                  : isActive
                  ? "border-green-500/30 bg-green-500/5"
                  : "border-(--ep-line)/25 bg-(--ep-s1)"
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
                    isSelected ? "bg-(--ep-accent)/20" : "bg-(--ep-line)/15"
                  }`}
                >
                  <Dumbbell
                    size={18}
                    strokeWidth={1.8}
                    className={isSelected ? "text-(--ep-accent)" : "text-(--ep-ink)/40"}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-black text-(--ep-strong)">{preset.name}</p>
                    <span
                      className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                      style={{
                        background: "rgba(var(--ep-line-rgb),0.2)",
                        color: "rgba(var(--ep-ink-rgb),0.5)",
                      }}
                    >
                      {preset.frequency}{t("x / semaine")}
                    </span>
                    {isActive && (
                      <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-green-500/15 text-green-400">
                        {t("Actif")}
                      </span>
                    )}
                    {isRecommended && !isActive && (
                      <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-(--ep-accent)/15 text-(--ep-accent)">
                        {t("Conseillé pour toi")}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-(--ep-ink)/40 mt-0.5 leading-relaxed">
                    {preset.description}
                  </p>
                  {isRecommended && (
                    <p className="text-xs text-(--ep-ink)/60 mt-1.5 leading-relaxed">
                      {recommendation?.reason}
                    </p>
                  )}
                </div>
                {isSelected ? (
                  <Check size={16} className="text-(--ep-accent) flex-shrink-0" />
                ) : null}
              </button>

              {/* Détail des séances */}
              <div className="px-4 pb-2">
                <button
                  onClick={() => setExpanded(isExpanded ? null : preset.id)}
                  aria-expanded={isExpanded}
                  className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-(--ep-ink)/30 hover:text-(--ep-ink)/55 transition-colors py-1"
                >
                  {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  {t("Voir les séances")}
                </button>
                {isExpanded && (
                  <div className="mt-3 mb-3 space-y-3">
                    {preset.input.days.map((day, di) => (
                      <div
                        key={di}
                        className="bg-(--ep-shade)/25 border border-(--ep-line)/12 rounded-lg p-3"
                      >
                        <p className="text-[10px] font-black uppercase tracking-widest text-(--ep-accent)/70 mb-2">
                          {day.day_label}
                        </p>
                        <div className="space-y-1.5">
                          {day.exercises.map((ex, ei) => (
                            <div key={ei} className="flex items-baseline gap-2">
                              <span className="text-xs font-semibold text-(--ep-ink)/75">
                                {ex.name}
                              </span>
                              <span className="text-[10px] text-(--ep-ink)/35 whitespace-nowrap">
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
        <p className="text-xs text-red-400 mb-3">{t(error)}</p>
      )}
      {success && (
        <p className="text-xs text-green-400 mb-3">{t("Programme activé avec succès.")}</p>
      )}

      <button
        onClick={handleActivate}
        disabled={!selected || isPending || selected === activePreset?.id}
        className="w-full py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        style={{
          background: selected && selected !== activePreset?.id ? "var(--ep-accent)" : "rgba(var(--ep-line-rgb),0.15)",
          color: selected && selected !== activePreset?.id ? "#fff" : "rgba(var(--ep-ink-rgb),0.35)",
        }}
      >
        {isPending ? t("Activation...") : selected === activePreset?.id ? t("Programme actif") : t("Activer ce programme")}
      </button>
    </div>
  );
}
