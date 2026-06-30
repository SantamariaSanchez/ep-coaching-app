"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ProgramWithDays, ProgramInput } from "@/utils/programs";
import { MUSCLE_GROUPS, MUSCLE_SUBGROUPS, type MuscleGroup } from "@/lib/volume-data";
import {
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Check,
} from "lucide-react";

interface ExerciseRow {
  localId: string;
  name: string;
  sets: string;
  reps: string;
  rir: string;
  rest_seconds: string;
  notes: string;
  muscle_group: string;
  muscle_subgroup: string;
  is_direct: string; // "true" | "false"
}

interface DayRow {
  localId: string;
  day_label: string;
  exercises: ExerciseRow[];
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function emptyExercise(): ExerciseRow {
  return {
    localId: uid(),
    name: "",
    sets: "",
    reps: "",
    rir: "",
    rest_seconds: "",
    notes: "",
    muscle_group: "",
    muscle_subgroup: "",
    is_direct: "true",
  };
}

function initFromProgram(program: ProgramWithDays | null) {
  if (!program) {
    return { name: "Programme", type: "Custom", frequency: "", days: [] as DayRow[] };
  }
  return {
    name: program.name,
    type: program.type ?? "Custom",
    frequency: program.frequency != null ? String(program.frequency) : "",
    days: program.days.map((d) => ({
      localId: uid(),
      day_label: d.day_label,
      exercises: d.exercises.map((e) => ({
        localId: uid(),
        name: e.name,
        sets: e.sets != null ? String(e.sets) : "",
        reps: e.reps ?? "",
        rir: e.rir != null ? String(e.rir) : "",
        rest_seconds: e.rest_seconds != null ? String(e.rest_seconds) : "",
        notes: e.notes ?? "",
        muscle_group: e.muscle_group ?? "",
        muscle_subgroup: e.muscle_subgroup ?? "",
        is_direct: e.is_direct !== false ? "true" : "false",
      })),
    })),
  };
}

const inputCls =
  "w-full bg-[var(--color-ep-input)] border border-[var(--color-ep-dark-red)]/30 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[var(--color-ep-light)]/25 focus:outline-none focus:border-[var(--color-ep-red)]/60 transition-colors";

export default function ProgramEditor({
  clientId,
  program,
  saveProgram,
  successRedirect,
}: {
  clientId: string;
  program: ProgramWithDays | null;
  saveProgram: (clientId: string, input: ProgramInput) => Promise<{ error?: string }>;
  successRedirect?: string;
}) {
  const router = useRouter();
  const [state, setState] = useState(() => initFromProgram(program));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // ── Program meta ────────────────────────────────────────────────────────────

  function updateMeta(field: "name" | "type" | "frequency", value: string) {
    setState((s) => ({ ...s, [field]: value }));
  }

  // ── Day operations ───────────────────────────────────────────────────────────

  function addDay() {
    const letter = String.fromCharCode(65 + state.days.length); // A, B, C…
    setState((s) => ({
      ...s,
      days: [
        ...s.days,
        { localId: uid(), day_label: `Séance ${letter}`, exercises: [] },
      ],
    }));
  }

  function removeDay(dayId: string) {
    setState((s) => ({ ...s, days: s.days.filter((d) => d.localId !== dayId) }));
  }

  function updateDayLabel(dayId: string, label: string) {
    setState((s) => ({
      ...s,
      days: s.days.map((d) =>
        d.localId === dayId ? { ...d, day_label: label } : d
      ),
    }));
  }

  function moveDay(dayId: string, dir: -1 | 1) {
    setState((s) => {
      const idx = s.days.findIndex((d) => d.localId === dayId);
      if (idx < 0) return s;
      const next = idx + dir;
      if (next < 0 || next >= s.days.length) return s;
      const days = [...s.days];
      [days[idx], days[next]] = [days[next], days[idx]];
      return { ...s, days };
    });
  }

  // ── Exercise operations ──────────────────────────────────────────────────────

  function addExercise(dayId: string) {
    setState((s) => ({
      ...s,
      days: s.days.map((d) =>
        d.localId === dayId
          ? { ...d, exercises: [...d.exercises, emptyExercise()] }
          : d
      ),
    }));
  }

  function removeExercise(dayId: string, exId: string) {
    setState((s) => ({
      ...s,
      days: s.days.map((d) =>
        d.localId === dayId
          ? { ...d, exercises: d.exercises.filter((e) => e.localId !== exId) }
          : d
      ),
    }));
  }

  function updateExercise(
    dayId: string,
    exId: string,
    field: keyof ExerciseRow,
    value: string
  ) {
    setState((s) => ({
      ...s,
      days: s.days.map((d) =>
        d.localId === dayId
          ? {
              ...d,
              exercises: d.exercises.map((e) =>
                e.localId === exId ? { ...e, [field]: value } : e
              ),
            }
          : d
      ),
    }));
  }

  function updateExerciseMuscleGroup(
    dayId: string,
    exId: string,
    value: string
  ) {
    setState((s) => ({
      ...s,
      days: s.days.map((d) =>
        d.localId === dayId
          ? {
              ...d,
              exercises: d.exercises.map((e) =>
                e.localId === exId
                  ? { ...e, muscle_group: value, muscle_subgroup: "" }
                  : e
              ),
            }
          : d
      ),
    }));
  }

  function moveExercise(dayId: string, exId: string, dir: -1 | 1) {
    setState((s) => ({
      ...s,
      days: s.days.map((d) => {
        if (d.localId !== dayId) return d;
        const idx = d.exercises.findIndex((e) => e.localId === exId);
        if (idx < 0) return d;
        const next = idx + dir;
        if (next < 0 || next >= d.exercises.length) return d;
        const exercises = [...d.exercises];
        [exercises[idx], exercises[next]] = [exercises[next], exercises[idx]];
        return { ...d, exercises };
      }),
    }));
  }

  // ── Save ─────────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!state.name.trim()) {
      setError("Le nom du programme est requis.");
      return;
    }

    const input: ProgramInput = {
      name: state.name.trim(),
      type: state.type || null,
      frequency: state.frequency ? parseInt(state.frequency) : null,
      days: state.days.map((d) => ({
        day_label: d.day_label || "Séance",
        exercises: d.exercises
          .filter((e) => e.name.trim() !== "")
          .map((e) => ({
            name: e.name.trim(),
            sets: e.sets ? parseInt(e.sets) : null,
            reps: e.reps.trim() || null,
            rir: e.rir !== "" ? parseInt(e.rir) : null,
            rest_seconds: e.rest_seconds ? parseInt(e.rest_seconds) : null,
            notes: e.notes.trim() || null,
            muscle_group: e.muscle_group || null,
            muscle_subgroup: e.muscle_subgroup || null,
            is_direct: e.is_direct !== "false",
          })),
      })),
    };

    setError(null);
    setSaving(true);

    const result = await saveProgram(clientId, input);

    setSaving(false);

    if (result.error) {
      setError(result.error);
    } else {
      setSaved(true);
      setTimeout(() => {
        router.push(successRedirect ?? `/dashboard/coach/clients/${clientId}/program`);
        router.refresh();
      }, 700);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Program meta */}
      <div className="bg-[var(--color-ep-card)] border border-[var(--color-ep-dark-red)]/40 rounded-xl p-5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-ep-light)]/35 mb-4">
          Informations
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-1">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-ep-light)]/40 mb-1.5 block">
              Nom du programme
            </label>
            <input
              value={state.name}
              onChange={(e) => updateMeta("name", e.target.value)}
              placeholder="Ex. PPL – Hypertrophie"
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-ep-light)]/40 mb-1.5 block">
              Type
            </label>
            <select
              value={state.type}
              onChange={(e) => updateMeta("type", e.target.value)}
              className={inputCls}
            >
              <option value="PPL">PPL</option>
              <option value="Upper/Lower">Upper/Lower</option>
              <option value="Full Body">Full Body</option>
              <option value="Custom">Custom</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-ep-light)]/40 mb-1.5 block">
              Fréquence (séances/semaine)
            </label>
            <input
              type="number"
              min="1"
              max="7"
              value={state.frequency}
              onChange={(e) => updateMeta("frequency", e.target.value)}
              placeholder="Ex. 4"
              className={inputCls}
            />
          </div>
        </div>
      </div>

      {/* Days */}
      {state.days.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 bg-[var(--color-ep-card)] border border-dashed border-[var(--color-ep-dark-red)]/30 rounded-xl gap-4">
          <p className="text-xs text-[var(--color-ep-light)]/35 font-semibold uppercase tracking-widest">
            Aucune séance
          </p>
          <button
            onClick={addDay}
            className="inline-flex items-center gap-2 bg-[var(--color-ep-red)]/10 border border-[var(--color-ep-red)]/30 hover:bg-[var(--color-ep-red)]/20 text-[var(--color-ep-red)] text-xs font-bold uppercase tracking-widest px-4 py-2.5 rounded-lg transition-colors"
          >
            <Plus size={13} />
            Ajouter une séance
          </button>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto pb-2">
            <div
              className="flex gap-4"
              style={{
                minWidth: `${Math.max(state.days.length * 296, 296)}px`,
              }}
            >
              {state.days.map((day, dayIdx) => (
                <div
                  key={day.localId}
                  className="w-72 flex-shrink-0 bg-[var(--color-ep-card)] border border-[var(--color-ep-dark-red)]/40 rounded-xl p-4"
                >
                  {/* Day header */}
                  <div className="flex items-center gap-1.5 mb-4 pb-3 border-b border-[var(--color-ep-dark-red)]/20">
                    <input
                      value={day.day_label}
                      onChange={(e) =>
                        updateDayLabel(day.localId, e.target.value)
                      }
                      className="flex-1 bg-transparent text-xs font-bold uppercase tracking-widest text-[var(--color-ep-red)] focus:outline-none border-b border-transparent focus:border-[var(--color-ep-red)]/40 pb-0.5 min-w-0"
                    />
                    <button
                      onClick={() => moveDay(day.localId, -1)}
                      disabled={dayIdx === 0}
                      title="Déplacer à gauche"
                      className="text-[var(--color-ep-light)]/30 hover:text-[var(--color-ep-light)]/70 disabled:opacity-20 transition-colors flex-shrink-0"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      onClick={() => moveDay(day.localId, 1)}
                      disabled={dayIdx === state.days.length - 1}
                      title="Déplacer à droite"
                      className="text-[var(--color-ep-light)]/30 hover:text-[var(--color-ep-light)]/70 disabled:opacity-20 transition-colors flex-shrink-0"
                    >
                      <ChevronRight size={14} />
                    </button>
                    <button
                      onClick={() => removeDay(day.localId)}
                      title="Supprimer la séance"
                      className="text-[var(--color-ep-light)]/25 hover:text-red-500 transition-colors flex-shrink-0"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {/* Exercises */}
                  <div className="space-y-2 mb-3">
                    {day.exercises.map((ex, exIdx) => (
                      <div
                        key={ex.localId}
                        className="bg-[var(--color-ep-input)] border border-[var(--color-ep-dark-red)]/20 rounded-lg p-2.5 space-y-2"
                      >
                        {/* Name + controls */}
                        <div className="flex items-center gap-1.5">
                          <input
                            value={ex.name}
                            onChange={(e) =>
                              updateExercise(
                                day.localId,
                                ex.localId,
                                "name",
                                e.target.value
                              )
                            }
                            placeholder="Exercice"
                            className="flex-1 bg-transparent text-sm font-semibold text-white placeholder:text-[var(--color-ep-light)]/25 focus:outline-none border-b border-transparent focus:border-[var(--color-ep-light)]/20 pb-0.5 min-w-0"
                          />
                          <div className="flex items-center gap-0.5 flex-shrink-0">
                            <button
                              onClick={() =>
                                moveExercise(day.localId, ex.localId, -1)
                              }
                              disabled={exIdx === 0}
                              title="Monter"
                              className="text-[var(--color-ep-light)]/25 hover:text-[var(--color-ep-light)]/60 disabled:opacity-10 transition-colors p-0.5"
                            >
                              <svg
                                width="9"
                                height="9"
                                viewBox="0 0 10 10"
                                fill="currentColor"
                              >
                                <path d="M5 2 L9 8 L1 8 Z" />
                              </svg>
                            </button>
                            <button
                              onClick={() =>
                                moveExercise(day.localId, ex.localId, 1)
                              }
                              disabled={exIdx === day.exercises.length - 1}
                              title="Descendre"
                              className="text-[var(--color-ep-light)]/25 hover:text-[var(--color-ep-light)]/60 disabled:opacity-10 transition-colors p-0.5"
                            >
                              <svg
                                width="9"
                                height="9"
                                viewBox="0 0 10 10"
                                fill="currentColor"
                              >
                                <path d="M5 8 L1 2 L9 2 Z" />
                              </svg>
                            </button>
                            <button
                              onClick={() =>
                                removeExercise(day.localId, ex.localId)
                              }
                              title="Supprimer"
                              className="text-[var(--color-ep-light)]/25 hover:text-red-500 transition-colors p-0.5 ml-0.5"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>

                        {/* Sets / Reps / RIR / Rest */}
                        <div className="grid grid-cols-4 gap-1.5">
                          {(
                            [
                              { field: "sets" as const, label: "Séries", type: "number", placeholder: "4" },
                              { field: "reps" as const, label: "Reps", type: "text", placeholder: "8-12" },
                              { field: "rir" as const, label: "RIR", type: "number", placeholder: "2" },
                              { field: "rest_seconds" as const, label: "Repos s", type: "number", placeholder: "90" },
                            ] as const
                          ).map(({ field, label, type, placeholder }) => (
                            <div key={field}>
                              <label className="text-[7px] font-bold uppercase tracking-widest text-[var(--color-ep-light)]/30 block mb-0.5">
                                {label}
                              </label>
                              <input
                                type={type}
                                min={type === "number" ? "0" : undefined}
                                value={ex[field]}
                                onChange={(e) =>
                                  updateExercise(
                                    day.localId,
                                    ex.localId,
                                    field,
                                    e.target.value
                                  )
                                }
                                placeholder={placeholder}
                                className="w-full bg-[var(--color-ep-card)]/80 border border-[var(--color-ep-dark-red)]/20 rounded px-2 py-1 text-xs text-white placeholder:text-[var(--color-ep-light)]/20 focus:outline-none focus:border-[var(--color-ep-dark-red)]/50 transition-colors"
                              />
                            </div>
                          ))}
                        </div>

                        {/* Notes */}
                        <input
                          value={ex.notes}
                          onChange={(e) =>
                            updateExercise(
                              day.localId,
                              ex.localId,
                              "notes",
                              e.target.value
                            )
                          }
                          placeholder="Notes (optionnel)"
                          className="w-full bg-transparent text-[10px] text-[var(--color-ep-light)]/40 placeholder:text-[var(--color-ep-light)]/20 focus:outline-none border-b border-transparent focus:border-[var(--color-ep-light)]/10 pb-0.5 transition-colors"
                        />

                        {/* Muscle group + Direct/Indirect */}
                        <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-[var(--color-ep-dark-red)]/10">
                          <div>
                            <label className="text-[7px] font-bold uppercase tracking-widest text-[var(--color-ep-light)]/25 block mb-0.5">
                              Groupe musculaire
                            </label>
                            <select
                              value={ex.muscle_group}
                              onChange={(e) =>
                                updateExerciseMuscleGroup(day.localId, ex.localId, e.target.value)
                              }
                              className="w-full bg-[var(--color-ep-card)]/80 border border-[var(--color-ep-dark-red)]/20 rounded px-2 py-1 text-[10px] text-white focus:outline-none focus:border-[var(--color-ep-dark-red)]/50 transition-colors"
                            >
                              <option value="">— Non défini —</option>
                              {MUSCLE_GROUPS.map((g) => (
                                <option key={g} value={g}>{g}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-[7px] font-bold uppercase tracking-widest text-[var(--color-ep-light)]/25 block mb-0.5">
                              Type
                            </label>
                            <div className="flex gap-1.5 pt-1">
                              {(["true", "false"] as const).map((val) => (
                                <label key={val} className="flex items-center gap-1 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`is_direct_${ex.localId}`}
                                    value={val}
                                    checked={ex.is_direct === val}
                                    onChange={() =>
                                      updateExercise(day.localId, ex.localId, "is_direct", val)
                                    }
                                    className="sr-only peer"
                                  />
                                  <span className="text-[9px] font-bold px-2 py-0.5 rounded border border-[var(--color-ep-dark-red)]/20 text-[var(--color-ep-light)]/30 peer-checked:border-[var(--color-ep-red)]/50 peer-checked:text-[var(--color-ep-red)] transition-colors cursor-pointer">
                                    {val === "true" ? "Direct" : "Indirect"}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Sous-groupe (chef musculaire) */}
                        {ex.muscle_group &&
                          MUSCLE_SUBGROUPS[ex.muscle_group as MuscleGroup]?.length > 0 && (
                            <div>
                              <label className="text-[7px] font-bold uppercase tracking-widest text-[var(--color-ep-light)]/25 block mb-0.5">
                                Sous-groupe
                              </label>
                              <select
                                value={ex.muscle_subgroup}
                                onChange={(e) =>
                                  updateExercise(
                                    day.localId,
                                    ex.localId,
                                    "muscle_subgroup",
                                    e.target.value
                                  )
                                }
                                className="w-full bg-[var(--color-ep-card)]/80 border border-[var(--color-ep-dark-red)]/20 rounded px-2 py-1 text-[10px] text-white focus:outline-none focus:border-[var(--color-ep-dark-red)]/50 transition-colors"
                              >
                                <option value="">— Non défini —</option>
                                {MUSCLE_SUBGROUPS[ex.muscle_group as MuscleGroup].map((sg) => (
                                  <option key={sg} value={sg}>{sg}</option>
                                ))}
                              </select>
                            </div>
                          )}
                      </div>
                    ))}
                  </div>

                  {/* Add exercise */}
                  <button
                    onClick={() => addExercise(day.localId)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-ep-light)]/30 hover:text-[var(--color-ep-light)]/60 border border-dashed border-[var(--color-ep-dark-red)]/20 hover:border-[var(--color-ep-dark-red)]/40 rounded-lg transition-colors"
                  >
                    <Plus size={11} />
                    Exercice
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Add day */}
          <button
            onClick={addDay}
            className="inline-flex items-center gap-2 bg-[var(--color-ep-red)]/10 border border-[var(--color-ep-red)]/30 hover:bg-[var(--color-ep-red)]/20 text-[var(--color-ep-red)] text-xs font-bold uppercase tracking-widest px-4 py-2.5 rounded-lg transition-colors"
          >
            <Plus size={13} />
            Ajouter une séance
          </button>
        </>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2.5 bg-red-950/40 border border-red-500/30 rounded-lg px-4 py-3">
          <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-[var(--color-ep-dark-red)]/15">
        <button
          onClick={() => router.back()}
          className="text-xs font-bold uppercase tracking-widest text-[var(--color-ep-light)]/40 hover:text-[var(--color-ep-light)]/70 px-4 py-2.5 transition-colors"
        >
          Annuler
        </button>
        <button
          onClick={handleSave}
          disabled={saving || saved}
          className={`inline-flex items-center gap-2 text-white text-xs font-bold uppercase tracking-widest px-6 py-2.5 rounded-lg transition-colors ${
            saved
              ? "bg-green-800/60 border border-green-600/30"
              : "bg-[var(--color-ep-red)] hover:bg-[var(--color-ep-med-red)] disabled:opacity-60"
          }`}
        >
          {saved ? (
            <>
              <Check size={13} />
              Sauvegardé
            </>
          ) : saving ? (
            "Sauvegarde…"
          ) : (
            "Sauvegarder"
          )}
        </button>
      </div>
    </div>
  );
}
