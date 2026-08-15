"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { ProgramTemplateWithDays } from "@/utils/program-templates";
import type { ProgramTemplateInput } from "@/utils/program-templates";
import { MUSCLE_GROUPS, MUSCLE_SUBGROUPS, type MuscleGroup } from "@/lib/volume-data";
import type { LibraryExercise } from "@/utils/exercise-library";
import {
  uid,
  inputCls,
  ExerciseNameField,
  emptyExercise,
  scaffoldDays,
  SPLIT_TYPES,
  type ExerciseRow,
  type DayRow,
} from "@/components/ui/ProgramEditor";
import {
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Check,
  Copy,
  Wand2,
} from "lucide-react";

function initFromTemplate(template: ProgramTemplateWithDays | null) {
  if (!template) {
    return { name: "", type: "PPL", frequency: "", objective: "", notes: "", days: [] as DayRow[] };
  }
  return {
    name: template.name,
    type: template.type ?? "Custom",
    frequency: template.frequency != null ? String(template.frequency) : "",
    objective: template.objective ?? "",
    notes: template.notes ?? "",
    days: template.days.map((d) => ({
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

export default function ProgramTemplateEditor({
  templateId,
  template,
  saveProgramTemplate,
}: {
  templateId: string | null;
  template: ProgramTemplateWithDays | null;
  saveProgramTemplate: (
    templateId: string | null,
    input: ProgramTemplateInput
  ) => Promise<{ id?: string; error?: string }>;
}) {
  const router = useRouter();
  const [state, setState] = useState(() => initFromTemplate(template));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [library, setLibrary] = useState<LibraryExercise[]>([]);
  useEffect(() => {
    fetch("/api/exercise-library")
      .then((r) => r.json())
      .then((d) => setLibrary(d.exercises ?? []))
      .catch(() => {});
  }, []);

  function updateMeta(field: "name" | "type" | "frequency" | "objective" | "notes", value: string) {
    setState((s) => ({ ...s, [field]: value }));
  }

  function applyScaffold() {
    setState((s) => ({ ...s, days: scaffoldDays(s.type, s.frequency) }));
  }

  // ── Day operations ───────────────────────────────────────────────────────

  function addDay() {
    const letter = String.fromCharCode(65 + state.days.length);
    setState((s) => ({ ...s, days: [...s.days, { localId: uid(), day_label: `Séance ${letter}`, exercises: [] }] }));
  }

  function removeDay(dayId: string) {
    setState((s) => ({ ...s, days: s.days.filter((d) => d.localId !== dayId) }));
  }

  function updateDayLabel(dayId: string, label: string) {
    setState((s) => ({
      ...s,
      days: s.days.map((d) => (d.localId === dayId ? { ...d, day_label: label } : d)),
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

  function duplicateDay(dayId: string) {
    setState((s) => {
      const source = s.days.find((d) => d.localId === dayId);
      if (!source) return s;
      const idx = s.days.findIndex((d) => d.localId === dayId);
      const copy: DayRow = {
        localId: uid(),
        day_label: `${source.day_label} (copie)`,
        exercises: source.exercises.map((e) => ({ ...e, localId: uid() })),
      };
      const days = [...s.days];
      days.splice(idx + 1, 0, copy);
      return { ...s, days };
    });
  }

  // ── Exercise operations ──────────────────────────────────────────────────

  function addExercise(dayId: string) {
    setState((s) => ({
      ...s,
      days: s.days.map((d) =>
        d.localId === dayId
          ? { ...d, exercises: [...d.exercises, emptyExercise(d.exercises[d.exercises.length - 1])] }
          : d
      ),
    }));
  }

  function removeExercise(dayId: string, exId: string) {
    setState((s) => ({
      ...s,
      days: s.days.map((d) =>
        d.localId === dayId ? { ...d, exercises: d.exercises.filter((e) => e.localId !== exId) } : d
      ),
    }));
  }

  function updateExercise(dayId: string, exId: string, field: keyof ExerciseRow, value: string) {
    setState((s) => ({
      ...s,
      days: s.days.map((d) =>
        d.localId === dayId
          ? { ...d, exercises: d.exercises.map((e) => (e.localId === exId ? { ...e, [field]: value } : e)) }
          : d
      ),
    }));
  }

  function pickLibraryExercise(dayId: string, exId: string, lib: LibraryExercise) {
    setState((s) => ({
      ...s,
      days: s.days.map((d) =>
        d.localId === dayId
          ? {
              ...d,
              exercises: d.exercises.map((e) =>
                e.localId === exId
                  ? {
                      ...e,
                      name: lib.name,
                      muscle_group: MUSCLE_GROUPS.includes(lib.muscle_group as MuscleGroup) ? lib.muscle_group : "",
                      muscle_subgroup: lib.muscle_subgroup ?? "",
                    }
                  : e
              ),
            }
          : d
      ),
    }));
  }

  function updateExerciseMuscleGroup(dayId: string, exId: string, value: string) {
    setState((s) => ({
      ...s,
      days: s.days.map((d) =>
        d.localId === dayId
          ? {
              ...d,
              exercises: d.exercises.map((e) =>
                e.localId === exId ? { ...e, muscle_group: value, muscle_subgroup: "" } : e
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

  // ── Save ─────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!state.name.trim()) {
      setError("Le nom du modèle est requis.");
      return;
    }

    const input: ProgramTemplateInput = {
      name: state.name.trim(),
      type: state.type || null,
      frequency: state.frequency ? parseInt(state.frequency) : null,
      objective: state.objective.trim() || null,
      notes: state.notes.trim() || null,
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
    const result = await saveProgramTemplate(templateId, input);
    setSaving(false);

    if (result.error) {
      setError(result.error);
    } else {
      setSaved(true);
      setTimeout(() => {
        router.push("/dashboard/coach/programmation");
        router.refresh();
      }, 700);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Structure — phase de réflexion avant de remplir le moindre exercice */}
      <div className="bg-[#1f0101] border border-[#890404]/40 rounded-xl p-5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-4">
          1. Structure du modèle
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5 block">
              Nom du modèle
            </label>
            <input
              value={state.name}
              onChange={(e) => updateMeta("name", e.target.value)}
              placeholder="Ex. PPL Hypertrophie 5x/semaine" aria-label="Nom du programme"
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5 block">
              Split
            </label>
            <select aria-label="Split" value={state.type} onChange={(e) => updateMeta("type", e.target.value)} className={inputCls}>
              {SPLIT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5 block">
              Fréquence (séances/semaine)
            </label>
            <input
              type="number"
              min="1"
              max="7"
              value={state.frequency}
              onChange={(e) => updateMeta("frequency", e.target.value)}
              placeholder="Ex. 5" aria-label="Fréquence en séances par semaine"
              className={inputCls}
            />
          </div>
        </div>
        <div className="mb-4">
          <label className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5 block">
            Objectif de phase
          </label>
          <input
            value={state.objective}
            onChange={(e) => updateMeta("objective", e.target.value)}
            placeholder="Ex. Hypertrophie, débutant · Prépa compétition physique" aria-label="Objectif"
            className={inputCls}
          />
        </div>
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5 block">
            Notes de conception <span className="text-[#F5EDED]/25 font-normal">(privé, jamais montré au client)</span>
          </label>
          <textarea
            value={state.notes}
            onChange={(e) => updateMeta("notes", e.target.value)}
            rows={2}
            placeholder="Ex. penser à alterner unilatéral/bilatéral sur les jambes, garder les push légers en semaine 1…" aria-label="Notes"
            className={`${inputCls} resize-none`}
          />
        </div>

        {state.days.length === 0 && (
          <button
            onClick={applyScaffold}
            className="mt-4 inline-flex items-center gap-2 bg-[#E01E1E]/10 border border-[#E01E1E]/30 hover:bg-[#E01E1E]/20 text-[#E01E1E] text-xs font-bold uppercase tracking-widest px-4 py-2.5 rounded-lg transition-colors"
          >
            <Wand2 size={13} />
            Générer les séances de cette structure
          </button>
        )}
      </div>

      {/* Days */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-3 px-1">
          2. Séances &amp; exercices
        </p>

        {state.days.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 bg-[#1f0101] border border-dashed border-[#890404]/30 rounded-xl gap-4">
            <p className="text-xs text-[#F5EDED]/35 font-semibold uppercase tracking-widest">
              Aucune séance pour l&apos;instant
            </p>
            <p className="text-[11px] text-[#F5EDED]/25 max-w-sm text-center">
              Choisis un split et une fréquence ci-dessus puis génère les séances, ou ajoute une séance vide
              directement.
            </p>
            <button
              onClick={addDay}
              className="inline-flex items-center gap-2 bg-[#E01E1E]/10 border border-[#E01E1E]/30 hover:bg-[#E01E1E]/20 text-[#E01E1E] text-xs font-bold uppercase tracking-widest px-4 py-2.5 rounded-lg transition-colors"
            >
              <Plus size={13} />
              Ajouter une séance
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto pb-2">
              <div className="flex gap-4" style={{ minWidth: `${Math.max(state.days.length * 296, 296)}px` }}>
                {state.days.map((day, dayIdx) => (
                  <div key={day.localId} className="w-72 flex-shrink-0 bg-[#1f0101] border border-[#890404]/40 rounded-xl p-4">
                    <div className="flex items-center gap-1.5 mb-4 pb-3 border-b border-[#890404]/20">
                      <input
                        value={day.day_label}
                        onChange={(e) => updateDayLabel(day.localId, e.target.value)}
                        aria-label="Nom du jour"
                        className="flex-1 bg-transparent text-xs font-bold uppercase tracking-widest text-[#E01E1E] focus:outline-none border-b border-transparent focus:border-[#E01E1E]/40 pb-0.5 min-w-0"
                      />
                      <button
                        onClick={() => moveDay(day.localId, -1)}
                        disabled={dayIdx === 0}
                        title="Déplacer à gauche" aria-label="Déplacer à gauche"
                        className="text-[#F5EDED]/30 hover:text-[#F5EDED]/70 disabled:opacity-20 transition-colors flex-shrink-0"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <button
                        onClick={() => moveDay(day.localId, 1)}
                        disabled={dayIdx === state.days.length - 1}
                        title="Déplacer à droite" aria-label="Déplacer à droite"
                        className="text-[#F5EDED]/30 hover:text-[#F5EDED]/70 disabled:opacity-20 transition-colors flex-shrink-0"
                      >
                        <ChevronRight size={14} />
                      </button>
                      <button
                        onClick={() => duplicateDay(day.localId)}
                        title="Dupliquer cette séance" aria-label="Dupliquer cette séance"
                        className="text-[#F5EDED]/30 hover:text-[#F5EDED]/70 transition-colors flex-shrink-0"
                      >
                        <Copy size={12} />
                      </button>
                      <button
                        onClick={() => removeDay(day.localId)}
                        title="Supprimer la séance" aria-label="Supprimer la séance"
                        className="text-[#F5EDED]/25 hover:text-red-500 transition-colors flex-shrink-0"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <div className="space-y-2 mb-3">
                      {day.exercises.map((ex, exIdx) => (
                        <div key={ex.localId} className="bg-[#150000] border border-[#890404]/20 rounded-lg p-2.5 space-y-2">
                          <div className="flex items-center gap-1.5">
                            <ExerciseNameField
                              value={ex.name}
                              library={library}
                              intake={null}
                              customConstraints=""
                              onChange={(v) => updateExercise(day.localId, ex.localId, "name", v)}
                              onPick={(lib) => pickLibraryExercise(day.localId, ex.localId, lib)}
                              onEnter={() => addExercise(day.localId)}
                            />
                            <div className="flex items-center gap-0.5 flex-shrink-0">
                              <button
                                onClick={() => moveExercise(day.localId, ex.localId, -1)}
                                disabled={exIdx === 0}
                                title="Monter" aria-label="Monter"
                                className="text-[#F5EDED]/25 hover:text-[#F5EDED]/60 disabled:opacity-10 transition-colors p-0.5"
                              >
                                <svg width="9" height="9" viewBox="0 0 10 10" fill="currentColor"><path d="M5 2 L9 8 L1 8 Z" /></svg>
                              </button>
                              <button
                                onClick={() => moveExercise(day.localId, ex.localId, 1)}
                                disabled={exIdx === day.exercises.length - 1}
                                title="Descendre" aria-label="Descendre"
                                className="text-[#F5EDED]/25 hover:text-[#F5EDED]/60 disabled:opacity-10 transition-colors p-0.5"
                              >
                                <svg width="9" height="9" viewBox="0 0 10 10" fill="currentColor"><path d="M5 8 L1 2 L9 2 Z" /></svg>
                              </button>
                              <button
                                onClick={() => removeExercise(day.localId, ex.localId)}
                                title="Supprimer" aria-label="Supprimer"
                                className="text-[#F5EDED]/25 hover:text-red-500 transition-colors p-0.5 ml-0.5"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </div>

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
                                <label className="text-[7px] font-bold uppercase tracking-widest text-[#F5EDED]/30 block mb-0.5">
                                  {label}
                                </label>
                                <input aria-label={label}
                                  type={type}
                                  min={type === "number" ? "0" : undefined}
                                  value={ex[field]}
                                  onChange={(e) => updateExercise(day.localId, ex.localId, field, e.target.value)}
                                  placeholder={placeholder}
                                  className="w-full bg-[#1f0101]/80 border border-[#890404]/20 rounded px-2 py-1 text-xs text-white placeholder:text-[#F5EDED]/20 focus:outline-none focus:border-[#890404]/50 transition-colors"
                                />
                              </div>
                            ))}
                          </div>

                          <input
                            value={ex.notes}
                            onChange={(e) => updateExercise(day.localId, ex.localId, "notes", e.target.value)}
                            placeholder="Notes (optionnel)" aria-label="Notes (optionnel)"
                            className="w-full bg-transparent text-[10px] text-[#F5EDED]/40 placeholder:text-[#F5EDED]/20 focus:outline-none border-b border-transparent focus:border-[#F5EDED]/10 pb-0.5 transition-colors"
                          />

                          <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-[#890404]/10">
                            <div>
                              <label className="text-[7px] font-bold uppercase tracking-widest text-[#F5EDED]/25 block mb-0.5">
                                Groupe musculaire
                              </label>
                              <select aria-label="Groupe musculaire"
                                value={ex.muscle_group}
                                onChange={(e) => updateExerciseMuscleGroup(day.localId, ex.localId, e.target.value)}
                                className="w-full bg-[#1f0101]/80 border border-[#890404]/20 rounded px-2 py-1 text-[10px] text-white focus:outline-none focus:border-[#890404]/50 transition-colors"
                              >
                                <option value="">Non défini</option>
                                {MUSCLE_GROUPS.map((g) => (
                                  <option key={g} value={g}>{g}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="text-[7px] font-bold uppercase tracking-widest text-[#F5EDED]/25 block mb-0.5">
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
                                      onChange={() => updateExercise(day.localId, ex.localId, "is_direct", val)}
                                      className="sr-only peer"
                                    />
                                    <span className="text-[9px] font-bold px-2 py-0.5 rounded border border-[#890404]/20 text-[#F5EDED]/30 peer-checked:border-[#E01E1E]/50 peer-checked:text-[#E01E1E] transition-colors cursor-pointer">
                                      {val === "true" ? "Direct" : "Indirect"}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          </div>

                          {ex.muscle_group && MUSCLE_SUBGROUPS[ex.muscle_group as MuscleGroup]?.length > 0 && (
                            <div>
                              <label className="text-[7px] font-bold uppercase tracking-widest text-[#F5EDED]/25 block mb-0.5">
                                Sous-groupe
                              </label>
                              <select aria-label="Sous-groupe"
                                value={ex.muscle_subgroup}
                                onChange={(e) => updateExercise(day.localId, ex.localId, "muscle_subgroup", e.target.value)}
                                className="w-full bg-[#1f0101]/80 border border-[#890404]/20 rounded px-2 py-1 text-[10px] text-white focus:outline-none focus:border-[#890404]/50 transition-colors"
                              >
                                <option value="">Non défini</option>
                                {MUSCLE_SUBGROUPS[ex.muscle_group as MuscleGroup].map((sg) => (
                                  <option key={sg} value={sg}>{sg}</option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => addExercise(day.localId)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/30 hover:text-[#F5EDED]/60 border border-dashed border-[#890404]/20 hover:border-[#890404]/40 rounded-lg transition-colors"
                    >
                      <Plus size={11} />
                      Exercice
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={addDay}
              className="inline-flex items-center gap-2 bg-[#E01E1E]/10 border border-[#E01E1E]/30 hover:bg-[#E01E1E]/20 text-[#E01E1E] text-xs font-bold uppercase tracking-widest px-4 py-2.5 rounded-lg transition-colors"
            >
              <Plus size={13} />
              Ajouter une séance
            </button>
          </>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2.5 bg-red-950/40 border border-red-500/30 rounded-lg px-4 py-3">
          <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#890404]/15">
        <button
          onClick={() => router.back()}
          className="text-xs font-bold uppercase tracking-widest text-[#F5EDED]/40 hover:text-[#F5EDED]/70 px-4 py-2.5 transition-colors"
        >
          Annuler
        </button>
        <button
          onClick={handleSave}
          disabled={saving || saved}
          className={`inline-flex items-center gap-2 text-white text-xs font-bold uppercase tracking-widest px-6 py-2.5 rounded-lg transition-colors ${
            saved ? "bg-green-800/60 border border-green-600/30" : "bg-[#E01E1E] hover:bg-[#B00202] disabled:opacity-60"
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
            "Sauvegarder le modèle"
          )}
        </button>
      </div>
    </div>
  );
}
