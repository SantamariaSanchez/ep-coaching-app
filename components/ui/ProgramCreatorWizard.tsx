"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ArrowLeft, Sparkles, Check, Loader2 } from "lucide-react";
import {
  GOAL_LABELS, LEVEL_LABELS, EQUIPMENT_PREF_LABELS, SESSION_LENGTH_LABELS,
  DAYS_OPTIONS, generateProgram,
  type Goal, type Level, type EquipmentPref, type SessionLength, type DaysPerWeek,
  type ProgramCreatorAnswers,
} from "@/lib/program-creator";
import { MUSCLE_GROUPS, type MuscleGroup } from "@/lib/volume-data";
import type { ProgramInput } from "@/utils/programs";

type StepKey = "goal" | "level" | "days" | "equipment" | "length" | "priority" | "result";
const STEP_ORDER: StepKey[] = ["goal", "level", "days", "equipment", "length", "priority", "result"];

function OptionGrid<T extends string>({
  options,
  labels,
  value,
  onSelect,
  cols = 2,
}: {
  options: T[];
  labels: Record<string, string>;
  value: T | null;
  onSelect: (v: T) => void;
  cols?: number;
}) {
  return (
    <div className={`grid gap-2.5`} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            onClick={() => onSelect(opt)}
            className={`text-left px-4 py-3.5 rounded-xl border text-sm font-bold transition-all ${
              active
                ? "bg-[#E01E1E]/15 border-[#E01E1E]/50 text-white"
                : "bg-[#1f0101] border-[#890404]/25 text-[#F5EDED]/55 hover:border-[#890404]/50"
            }`}
          >
            {labels[opt]}
          </button>
        );
      })}
    </div>
  );
}

export default function ProgramCreatorWizard({
  saveProgram,
  clientId,
  onSaved,
}: {
  saveProgram: (clientId: string, input: ProgramInput) => Promise<{ error?: string }>;
  clientId: string;
  onSaved?: () => void;
}) {
  const [stepIdx, setStepIdx] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);

  const [goal, setGoal] = useState<Goal | null>(null);
  const [level, setLevel] = useState<Level | null>(null);
  const [daysPerWeek, setDaysPerWeek] = useState<DaysPerWeek | null>(null);
  const [equipment, setEquipment] = useState<EquipmentPref | null>(null);
  const [sessionLength, setSessionLength] = useState<SessionLength | null>(null);
  const [priorityGroups, setPriorityGroups] = useState<Set<MuscleGroup>>(new Set());

  const [result, setResult] = useState<ProgramInput | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState("");

  const step = STEP_ORDER[stepIdx];

  function togglePriority(g: MuscleGroup) {
    setPriorityGroups((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);
      else if (next.size < 3) next.add(g);
      return next;
    });
  }

  function go(next: number, dir: 1 | -1) {
    setDirection(dir);
    setStepIdx(next);
  }

  function canAdvance(): boolean {
    if (step === "goal") return !!goal;
    if (step === "level") return !!level;
    if (step === "days") return !!daysPerWeek;
    if (step === "equipment") return !!equipment;
    if (step === "length") return !!sessionLength;
    return true; // priority optional
  }

  function handleNext() {
    if (step === "priority") {
      const answers: ProgramCreatorAnswers = {
        goal: goal!,
        level: level!,
        daysPerWeek: daysPerWeek!,
        equipment: equipment!,
        sessionLength: sessionLength!,
        priorityGroups: [...priorityGroups],
      };
      setResult(generateProgram(answers));
    }
    go(stepIdx + 1, 1);
  }

  function handleRestart() {
    setStepIdx(0);
    setGoal(null);
    setLevel(null);
    setDaysPerWeek(null);
    setEquipment(null);
    setSessionLength(null);
    setPriorityGroups(new Set());
    setResult(null);
    setSaveStatus("idle");
  }

  async function handleSave() {
    if (!result) return;
    setSaveStatus("saving");
    const res = await saveProgram(clientId, result);
    if (res.error) {
      setSaveStatus("error");
      setSaveError(res.error);
    } else {
      setSaveStatus("saved");
      onSaved?.();
    }
  }

  const progress = ((stepIdx + 1) / STEP_ORDER.length) * 100;
  const totalExercises = result?.days.reduce((sum, d) => sum + d.exercises.length, 0) ?? 0;

  return (
    <div className="bg-[#150000] border border-[#890404]/20 rounded-2xl p-5 md:p-8 max-w-xl mx-auto">
      {step !== "result" && (
        <div className="h-1 bg-[#890404]/15 rounded-full mb-7 overflow-hidden">
          <div className="h-full bg-[#E01E1E] rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}

      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={step}
          custom={direction}
          // transform explicite, pas le raccourci x (voir OnboardingTour.tsx)
          initial={{ opacity: 0, transform: `translateX(${direction > 0 ? 30 : -30}px)` }}
          animate={{ opacity: 1, transform: "translateX(0px)" }}
          exit={{ opacity: 0, transform: `translateX(${direction > 0 ? -30 : 30}px)` }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        >
          {step === "goal" && (
            <div>
              <h2 className="text-xl font-black text-white mb-1">Ton objectif principal ?</h2>
              <p className="text-xs text-[#F5EDED]/40 mb-5">On calibre séries, reps et repos en fonction.</p>
              <OptionGrid options={Object.keys(GOAL_LABELS) as Goal[]} labels={GOAL_LABELS} value={goal} onSelect={setGoal} />
            </div>
          )}

          {step === "level" && (
            <div>
              <h2 className="text-xl font-black text-white mb-1">Ton niveau ?</h2>
              <p className="text-xs text-[#F5EDED]/40 mb-5">Pour choisir des exercices adaptés à ta maîtrise technique.</p>
              <OptionGrid options={Object.keys(LEVEL_LABELS) as Level[]} labels={LEVEL_LABELS} value={level} onSelect={setLevel} cols={1} />
            </div>
          )}

          {step === "days" && (
            <div>
              <h2 className="text-xl font-black text-white mb-1">Combien de jours par semaine ?</h2>
              <p className="text-xs text-[#F5EDED]/40 mb-5">On choisit le split (full body, haut/bas, push/pull/legs...) en fonction.</p>
              <div className="grid grid-cols-5 gap-2">
                {DAYS_OPTIONS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDaysPerWeek(d)}
                    className={`py-3.5 rounded-xl border text-sm font-black transition-all ${
                      daysPerWeek === d
                        ? "bg-[#E01E1E]/15 border-[#E01E1E]/50 text-white"
                        : "bg-[#1f0101] border-[#890404]/25 text-[#F5EDED]/55 hover:border-[#890404]/50"
                    }`}
                  >
                    {d}j
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === "equipment" && (
            <div>
              <h2 className="text-xl font-black text-white mb-1">Quel matériel as-tu ?</h2>
              <p className="text-xs text-[#F5EDED]/40 mb-5">On ne te proposera que des exercices réalisables.</p>
              <OptionGrid options={Object.keys(EQUIPMENT_PREF_LABELS) as EquipmentPref[]} labels={EQUIPMENT_PREF_LABELS} value={equipment} onSelect={setEquipment} cols={1} />
            </div>
          )}

          {step === "length" && (
            <div>
              <h2 className="text-xl font-black text-white mb-1">Durée de séance visée ?</h2>
              <p className="text-xs text-[#F5EDED]/40 mb-5">Détermine le nombre d&apos;exercices par séance.</p>
              <OptionGrid options={Object.keys(SESSION_LENGTH_LABELS) as SessionLength[]} labels={SESSION_LENGTH_LABELS} value={sessionLength} onSelect={setSessionLength} cols={1} />
            </div>
          )}

          {step === "priority" && (
            <div>
              <h2 className="text-xl font-black text-white mb-1">
                Des zones à prioriser ? <span className="text-[#F5EDED]/30 font-normal text-sm">(optionnel, max 3)</span>
              </h2>
              <p className="text-xs text-[#F5EDED]/40 mb-5">Elles recevront un exercice de plus à chaque séance où elles apparaissent.</p>
              <div className="flex flex-wrap gap-2">
                {MUSCLE_GROUPS.map((g) => {
                  const active = priorityGroups.has(g);
                  return (
                    <button
                      key={g}
                      onClick={() => togglePriority(g)}
                      className={`px-3.5 py-2 rounded-full text-xs font-bold border transition-colors ${
                        active
                          ? "bg-[#E01E1E] border-[#E01E1E] text-white"
                          : "bg-[#1f0101] border-[#890404]/25 text-[#F5EDED]/50 hover:border-[#890404]/50"
                      }`}
                    >
                      {g}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === "result" && (
            <div>
              {!result ? (
                <p className="text-sm text-[#F5EDED]/40 text-center py-10">Erreur de génération, réessaie.</p>
              ) : (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles size={16} className="text-[#E01E1E]" />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#E01E1E]">
                      Ton programme sur mesure
                    </p>
                  </div>
                  <h2 className="text-2xl font-black text-white mb-1">{result.name}</h2>
                  <p className="text-xs text-[#F5EDED]/40 mb-5">
                    {result.days.length} séance{result.days.length !== 1 ? "s" : ""} · {totalExercises} exercice{totalExercises !== 1 ? "s" : ""} au total
                  </p>

                  <div className="space-y-3 mb-5 max-h-80 overflow-y-auto pr-1">
                    {result.days.map((day, di) => (
                      <div key={di} className="bg-[#1f0101] border border-[#890404]/20 rounded-xl p-3.5">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#E01E1E] mb-2">
                          {day.day_label}
                        </p>
                        <div className="space-y-1.5">
                          {day.exercises.map((ex, ei) => (
                            <div key={ei} className="flex items-center justify-between gap-2">
                              <p className="text-xs text-[#F5EDED]/75 truncate">{ex.name}</p>
                              <p className="text-[10px] text-[#F5EDED]/35 flex-shrink-0">
                                {ex.sets} × {ex.reps}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={handleRestart}
                      className="flex-1 text-xs font-bold uppercase tracking-widest text-[#F5EDED]/50 border border-[#890404]/25 hover:border-[#890404]/50 rounded-lg px-4 py-2.5"
                    >
                      Recommencer
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saveStatus === "saving" || saveStatus === "saved"}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-[#E01E1E] hover:bg-[#B00202] disabled:opacity-60 text-white text-xs font-bold uppercase tracking-widest px-4 py-2.5 rounded-lg transition-colors"
                    >
                      {saveStatus === "saving" ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : saveStatus === "saved" ? (
                        <>
                          <Check size={13} /> Programme activé
                        </>
                      ) : (
                        "Activer ce programme"
                      )}
                    </button>
                  </div>
                  {saveStatus === "error" && (
                    <p className="text-[11px] text-red-400 font-semibold mt-2">⚠ {saveError}</p>
                  )}
                  {saveStatus === "saved" && (
                    <p className="text-[11px] text-[#F5EDED]/35 mt-2">
                      Remplace ton programme actif, visible dans l&apos;onglet Programme.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {step !== "result" && (
        <div className="flex gap-2 mt-7">
          {stepIdx > 0 && (
            <button
              onClick={() => go(stepIdx - 1, -1)}
              aria-label="Étape précédente"
              className="w-12 h-12 flex items-center justify-center rounded-xl border border-[#890404]/25 text-[#F5EDED]/40 flex-shrink-0"
            >
              <ArrowLeft size={16} />
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={!canAdvance()}
            className="flex-1 flex items-center justify-center gap-2 bg-[#E01E1E] hover:bg-[#B00202] disabled:opacity-40 text-white text-sm font-bold uppercase tracking-widest h-12 rounded-xl transition-colors"
          >
            {step === "priority" ? "Créer mon programme" : "Suivant"} <ArrowRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
