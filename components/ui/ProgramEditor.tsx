"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { ProgramWithDays, ProgramInput } from "@/utils/programs";
import { MUSCLE_GROUPS, MUSCLE_SUBGROUPS, type MuscleGroup } from "@/lib/volume-data";
import type { LibraryExercise } from "@/utils/exercise-library";
import {
  LIBRARY_MUSCLE_GROUPS,
  EQUIPMENT_TYPES,
  EQUIPMENT_TYPE_LABELS,
  DIFFICULTY_LABELS,
  CATEGORY_LABELS,
  getEquipmentType,
  type EquipmentType,
} from "@/lib/exercise-library-content";
import {
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Check,
  Copy,
  Search,
  SlidersHorizontal,
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

// Reprend les séries/reps/RIR/repos du dernier exercice du jour par défaut
// (le plus souvent identiques d'un exercice à l'autre dans une séance) —
// avant, chaque nouvel exercice repartait de zéro, avec 4 champs à
// re-remplir même quand le schéma ne changeait pas.
function emptyExercise(prefillFrom?: ExerciseRow): ExerciseRow {
  return {
    localId: uid(),
    name: "",
    sets: prefillFrom?.sets ?? "",
    reps: prefillFrom?.reps ?? "",
    rir: prefillFrom?.rir ?? "",
    rest_seconds: prefillFrom?.rest_seconds ?? "",
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
  "w-full bg-[#150000] border border-[#890404]/30 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#F5EDED]/25 focus:outline-none focus:border-[#E01E1E]/60 transition-colors";

// Champ nom d'exercice avec recherche dans la bibliothèque — un choix
// remplit aussi groupe/sous-groupe musculaire d'un coup. Reste un champ
// texte libre : taper sans rien sélectionner marche toujours (exercice
// hors catalogue).
function ExerciseNameField({
  value,
  library,
  onChange,
  onPick,
  onEnter,
}: {
  value: string;
  library: LibraryExercise[];
  onChange: (v: string) => void;
  onPick: (lib: LibraryExercise) => void;
  onEnter?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filterGroup, setFilterGroup] = useState("");
  const [filterEquipment, setFilterEquipment] = useState<EquipmentType | "">("");
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowFilters(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const hasActiveFilters = !!filterGroup || !!filterEquipment;
  const q = value.trim().toLowerCase();

  // Sans filtre actif, il faut taper au moins 2 caractères (comme avant) —
  // avec un filtre (muscle/matériel), la liste se parcourt même sans texte.
  const matches =
    q.length >= 2 || hasActiveFilters
      ? library
          .filter((l) => !q || l.name.toLowerCase().includes(q))
          .filter((l) => !filterGroup || l.muscle_group === filterGroup)
          .filter((l) => !filterEquipment || getEquipmentType(l.equipment) === filterEquipment)
          .slice(0, 20)
      : [];

  return (
    <div ref={wrapRef} className="relative flex-1 min-w-0">
      <div className="flex items-center gap-1">
        <input
          value={value}
          onChange={(e) => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { setOpen(false); onEnter?.(); }
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder="Exercice (recherche...)"
          className="w-full bg-transparent text-sm font-semibold text-white placeholder:text-[#F5EDED]/25 focus:outline-none border-b border-transparent focus:border-[#F5EDED]/20 pb-0.5 min-w-0"
        />
        <button
          type="button"
          onClick={() => { setOpen(true); setShowFilters((v) => !v); }}
          title="Filtrer par muscle / matériel"
          className={`flex-shrink-0 p-1 rounded transition-colors ${
            hasActiveFilters ? "text-[#E01E1E]" : "text-[#F5EDED]/20 hover:text-[#F5EDED]/50"
          }`}
        >
          <SlidersHorizontal size={13} />
        </button>
      </div>

      {open && (showFilters || hasActiveFilters) && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-[#1a0000] border border-[#890404]/40 rounded-lg shadow-xl p-2 flex gap-1.5">
          <select
            value={filterGroup}
            onChange={(e) => setFilterGroup(e.target.value)}
            className="flex-1 min-w-0 bg-[#150000] border border-[#890404]/30 rounded px-1.5 py-1 text-[10px] text-white focus:outline-none"
          >
            <option value="">Tout muscle</option>
            {LIBRARY_MUSCLE_GROUPS.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
          <select
            value={filterEquipment}
            onChange={(e) => setFilterEquipment(e.target.value as EquipmentType | "")}
            className="flex-1 min-w-0 bg-[#150000] border border-[#890404]/30 rounded px-1.5 py-1 text-[10px] text-white focus:outline-none"
          >
            <option value="">Tout matériel</option>
            {EQUIPMENT_TYPES.map((t) => (
              <option key={t} value={t}>{EQUIPMENT_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>
      )}

      {open && matches.length > 0 && (
        <div
          className={`absolute z-20 left-0 right-0 bg-[#1a0000] border border-[#890404]/40 rounded-lg shadow-xl max-h-64 overflow-y-auto ${
            showFilters || hasActiveFilters ? "top-[calc(100%+38px)]" : "top-full mt-1"
          }`}
        >
          {matches.map((lib) => (
            <button
              key={lib.id}
              type="button"
              onClick={() => { onPick(lib); setOpen(false); setShowFilters(false); }}
              className="w-full text-left px-3 py-2 text-xs text-[#F5EDED]/80 hover:bg-[#890404]/20 transition-colors border-b border-[#890404]/10 last:border-0"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-semibold">{lib.name}</span>
                <span className="text-[9px] text-[#F5EDED]/30 flex-shrink-0">{lib.muscle_group}</span>
              </div>
              <div className="flex items-center gap-1 mt-1 flex-wrap">
                {lib.category && (
                  <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[#150000] border border-[#890404]/20 text-[#F5EDED]/40">
                    {CATEGORY_LABELS[lib.category]}
                  </span>
                )}
                {lib.difficulty && (
                  <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${
                    lib.difficulty === "avance"
                      ? "bg-amber-500/10 border-amber-500/25 text-amber-400"
                      : "bg-[#150000] border-[#890404]/20 text-[#F5EDED]/40"
                  }`}>
                    {DIFFICULTY_LABELS[lib.difficulty]}
                  </span>
                )}
                {lib.equipment && (
                  <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[#150000] border border-[#890404]/20 text-[#F5EDED]/40">
                    {lib.equipment}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
      {open && q.length >= 2 && !hasActiveFilters && matches.length === 0 && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-[#1a0000] border border-[#890404]/40 rounded-lg shadow-xl px-3 py-2 flex items-center gap-2">
          <Search size={11} className="text-[#F5EDED]/20 flex-shrink-0" />
          <span className="text-[10px] text-[#F5EDED]/30">Aucun résultat — nom libre conservé</span>
        </div>
      )}
    </div>
  );
}

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

  // Bibliothèque d'exercices — sert le picker avec recherche (nom exact +
  // groupe/sous-groupe musculaire auto-remplis en un choix, au lieu de
  // taper le nom puis sélectionner les 2 menus déroulants séparément).
  const [library, setLibrary] = useState<LibraryExercise[]>([]);
  useEffect(() => {
    fetch("/api/exercise-library")
      .then((r) => r.json())
      .then((d) => setLibrary(d.exercises ?? []))
      .catch(() => {});
  }, []);

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
          ? { ...d, exercises: [...d.exercises, emptyExercise(d.exercises[d.exercises.length - 1])] }
          : d
      ),
    }));
  }

  // Duplique un jour entier (avec tous ses exercices) — pour les
  // programmes qui répètent le même schéma plusieurs fois par semaine
  // (Push/Pull/Legs x2, etc.), au lieu de tout retaper à l'identique.
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

  // Sélection depuis la bibliothèque : nom + groupe + sous-groupe en un
  // seul geste plutôt que 3 champs séparés à remplir un par un.
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
      <div className="bg-[#1f0101] border border-[#890404]/40 rounded-xl p-5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-4">
          Informations
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-1">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5 block">
              Nom du programme
            </label>
            <input
              value={state.name}
              onChange={(e) => updateMeta("name", e.target.value)}
              placeholder="Ex. PPL : Hypertrophie"
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5 block">
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
            <label className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5 block">
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
        <div className="flex flex-col items-center justify-center py-14 bg-[#1f0101] border border-dashed border-[#890404]/30 rounded-xl gap-4">
          <p className="text-xs text-[#F5EDED]/35 font-semibold uppercase tracking-widest">
            Aucune séance
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
            <div
              className="flex gap-4"
              style={{
                minWidth: `${Math.max(state.days.length * 296, 296)}px`,
              }}
            >
              {state.days.map((day, dayIdx) => (
                <div
                  key={day.localId}
                  className="w-72 flex-shrink-0 bg-[#1f0101] border border-[#890404]/40 rounded-xl p-4"
                >
                  {/* Day header */}
                  <div className="flex items-center gap-1.5 mb-4 pb-3 border-b border-[#890404]/20">
                    <input
                      value={day.day_label}
                      onChange={(e) =>
                        updateDayLabel(day.localId, e.target.value)
                      }
                      className="flex-1 bg-transparent text-xs font-bold uppercase tracking-widest text-[#E01E1E] focus:outline-none border-b border-transparent focus:border-[#E01E1E]/40 pb-0.5 min-w-0"
                    />
                    <button
                      onClick={() => moveDay(day.localId, -1)}
                      disabled={dayIdx === 0}
                      title="Déplacer à gauche"
                      className="text-[#F5EDED]/30 hover:text-[#F5EDED]/70 disabled:opacity-20 transition-colors flex-shrink-0"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      onClick={() => moveDay(day.localId, 1)}
                      disabled={dayIdx === state.days.length - 1}
                      title="Déplacer à droite"
                      className="text-[#F5EDED]/30 hover:text-[#F5EDED]/70 disabled:opacity-20 transition-colors flex-shrink-0"
                    >
                      <ChevronRight size={14} />
                    </button>
                    <button
                      onClick={() => duplicateDay(day.localId)}
                      title="Dupliquer cette séance"
                      className="text-[#F5EDED]/30 hover:text-[#F5EDED]/70 transition-colors flex-shrink-0"
                    >
                      <Copy size={12} />
                    </button>
                    <button
                      onClick={() => removeDay(day.localId)}
                      title="Supprimer la séance"
                      className="text-[#F5EDED]/25 hover:text-red-500 transition-colors flex-shrink-0"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {/* Exercises */}
                  <div className="space-y-2 mb-3">
                    {day.exercises.map((ex, exIdx) => (
                      <div
                        key={ex.localId}
                        className="bg-[#150000] border border-[#890404]/20 rounded-lg p-2.5 space-y-2"
                      >
                        {/* Name + controls */}
                        <div className="flex items-center gap-1.5">
                          <ExerciseNameField
                            value={ex.name}
                            library={library}
                            onChange={(v) => updateExercise(day.localId, ex.localId, "name", v)}
                            onPick={(lib) => pickLibraryExercise(day.localId, ex.localId, lib)}
                            onEnter={() => addExercise(day.localId)}
                          />
                          <div className="flex items-center gap-0.5 flex-shrink-0">
                            <button
                              onClick={() =>
                                moveExercise(day.localId, ex.localId, -1)
                              }
                              disabled={exIdx === 0}
                              title="Monter"
                              className="text-[#F5EDED]/25 hover:text-[#F5EDED]/60 disabled:opacity-10 transition-colors p-0.5"
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
                              className="text-[#F5EDED]/25 hover:text-[#F5EDED]/60 disabled:opacity-10 transition-colors p-0.5"
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
                              className="text-[#F5EDED]/25 hover:text-red-500 transition-colors p-0.5 ml-0.5"
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
                              <label className="text-[7px] font-bold uppercase tracking-widest text-[#F5EDED]/30 block mb-0.5">
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
                                className="w-full bg-[#1f0101]/80 border border-[#890404]/20 rounded px-2 py-1 text-xs text-white placeholder:text-[#F5EDED]/20 focus:outline-none focus:border-[#890404]/50 transition-colors"
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
                          className="w-full bg-transparent text-[10px] text-[#F5EDED]/40 placeholder:text-[#F5EDED]/20 focus:outline-none border-b border-transparent focus:border-[#F5EDED]/10 pb-0.5 transition-colors"
                        />

                        {/* Muscle group + Direct/Indirect */}
                        <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-[#890404]/10">
                          <div>
                            <label className="text-[7px] font-bold uppercase tracking-widest text-[#F5EDED]/25 block mb-0.5">
                              Groupe musculaire
                            </label>
                            <select
                              value={ex.muscle_group}
                              onChange={(e) =>
                                updateExerciseMuscleGroup(day.localId, ex.localId, e.target.value)
                              }
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
                                    onChange={() =>
                                      updateExercise(day.localId, ex.localId, "is_direct", val)
                                    }
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

                        {/* Sous-groupe (chef musculaire) */}
                        {ex.muscle_group &&
                          MUSCLE_SUBGROUPS[ex.muscle_group as MuscleGroup]?.length > 0 && (
                            <div>
                              <label className="text-[7px] font-bold uppercase tracking-widest text-[#F5EDED]/25 block mb-0.5">
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

                  {/* Add exercise */}
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

          {/* Add day */}
          <button
            onClick={addDay}
            className="inline-flex items-center gap-2 bg-[#E01E1E]/10 border border-[#E01E1E]/30 hover:bg-[#E01E1E]/20 text-[#E01E1E] text-xs font-bold uppercase tracking-widest px-4 py-2.5 rounded-lg transition-colors"
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
            saved
              ? "bg-green-800/60 border border-green-600/30"
              : "bg-[#E01E1E] hover:bg-[#B00202] disabled:opacity-60"
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
