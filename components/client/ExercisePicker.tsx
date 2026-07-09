"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Plus, X, Dumbbell } from "lucide-react";
import {
  LIBRARY_MUSCLE_GROUPS,
  EQUIPMENT_OPTIONS,
} from "@/lib/exercise-library-content";
import type { LibraryExercise } from "@/utils/exercise-library";
import { createExercise } from "@/app/dashboard/client/exercises/actions";

interface Props {
  onAdd: (input: { name: string; muscleGroup: string | null }) => void;
}

function CreateExerciseForm({
  initialName,
  onCreated,
  onCancel,
}: {
  initialName: string;
  onCreated: (input: { name: string; muscleGroup: string | null }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [muscleGroup, setMuscleGroup] = useState<string>(LIBRARY_MUSCLE_GROUPS[0]);
  const [equipment, setEquipment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name.trim()) {
      setError("Le nom est requis.");
      return;
    }
    setSaving(true);
    setError(null);
    const result = await createExercise({
      name: name.trim(),
      muscle_group: muscleGroup,
      muscle_subgroup: null,
      equipment: equipment || null,
      brand: null,
      category: null,
      difficulty: null,
      instructions: null,
    });
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onCreated({ name: name.trim(), muscleGroup });
  }

  return (
    <div className="bg-[#1f0101] border border-[#890404]/30 rounded-xl p-4 space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35">
        Créer un nouvel exercice
      </p>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nom de l'exercice"
        className="w-full bg-[#150000] border border-[#890404]/30 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-[#F5EDED]/25 focus:outline-none focus:border-[#E01E1E]/50"
      />
      <div className="grid grid-cols-2 gap-2">
        <select
          value={muscleGroup}
          onChange={(e) => setMuscleGroup(e.target.value)}
          className="w-full bg-[#150000] border border-[#890404]/30 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#E01E1E]/50"
        >
          {LIBRARY_MUSCLE_GROUPS.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        <select
          value={equipment}
          onChange={(e) => setEquipment(e.target.value)}
          className="w-full bg-[#150000] border border-[#890404]/30 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#E01E1E]/50"
        >
          <option value="">Matériel (optionnel)</option>
          {EQUIPMENT_OPTIONS.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={saving || !name.trim()}
          className="flex-1 bg-[#E01E1E] hover:bg-[#B00202] disabled:opacity-40 text-white text-xs font-bold uppercase tracking-widest px-4 py-2.5 rounded-lg transition-colors"
        >
          {saving ? "Création…" : "Créer et ajouter à la séance"}
        </button>
        <button
          onClick={onCancel}
          className="text-xs text-[#F5EDED]/40 hover:text-[#F5EDED]/70 px-4 transition-colors"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}

export default function ExercisePicker({ onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [library, setLibrary] = useState<LibraryExercise[]>([]);
  const [fetched, setFetched] = useState(false);
  const [search, setSearch] = useState("");
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open || fetched) return;
    setLoading(true);
    fetch("/api/exercise-library")
      .then((r) => r.json())
      .then((data: { exercises?: LibraryExercise[] }) => {
        setLibrary(data.exercises ?? []);
        setFetched(true);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, fetched]);

  const groupCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of library) map[e.muscle_group] = (map[e.muscle_group] ?? 0) + 1;
    return map;
  }, [library]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return library.filter((e) => {
      if (activeGroup && e.muscle_group !== activeGroup) return false;
      if (!q) return true;
      return (
        e.name.toLowerCase().includes(q) ||
        (e.muscle_subgroup ?? "").toLowerCase().includes(q) ||
        (e.equipment ?? "").toLowerCase().includes(q)
      );
    });
  }, [library, search, activeGroup]);

  function close() {
    setOpen(false);
    setSearch("");
    setActiveGroup(null);
    setCreating(false);
  }

  function select(ex: LibraryExercise) {
    onAdd({ name: ex.name, muscleGroup: ex.muscle_group });
    close();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 border border-dashed border-[#890404]/30 hover:border-[#890404]/60 rounded-xl px-4 py-3.5 text-sm text-[#F5EDED]/40 hover:text-[#F5EDED]/70 transition-colors"
      >
        <Plus size={15} strokeWidth={2} />
        Ajouter un exercice
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={close} />
      <div
        className="relative w-full max-w-md bg-[#150000] border-t border-[#890404]/40 rounded-t-2xl p-5 space-y-3 overflow-y-auto flex flex-col"
        style={{ maxHeight: "88dvh", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 20px)" }}
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-black uppercase tracking-widest text-white">
            Ajouter un exercice
          </p>
          <button onClick={close} className="p-1 text-[#F5EDED]/40 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {creating ? (
          <CreateExerciseForm
            initialName={search}
            onCreated={(input) => {
              onAdd(input);
              close();
            }}
            onCancel={() => setCreating(false)}
          />
        ) : (
          <>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#F5EDED]/25" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un exercice…"
                className="w-full bg-[#1f0101] border border-[#890404]/30 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-[#F5EDED]/25 focus:outline-none focus:border-[#E01E1E]/50"
              />
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
              <button
                onClick={() => setActiveGroup(null)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-colors ${
                  activeGroup === null
                    ? "bg-[#E01E1E]/20 border-[#E01E1E]/50 text-[#E01E1E]"
                    : "border-[#890404]/25 text-[#F5EDED]/40"
                }`}
              >
                Tout
              </button>
              {LIBRARY_MUSCLE_GROUPS.filter((g) => groupCounts[g]).map((g) => (
                <button
                  key={g}
                  onClick={() => setActiveGroup(g)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-colors ${
                    activeGroup === g
                      ? "bg-[#E01E1E]/20 border-[#E01E1E]/50 text-[#E01E1E]"
                      : "border-[#890404]/25 text-[#F5EDED]/40"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 min-h-[120px]">
              {loading && (
                <div className="flex justify-center py-8">
                  <div className="w-5 h-5 border-2 border-[#E01E1E] border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {!loading &&
                filtered.map((ex) => (
                  <button
                    key={ex.id}
                    onClick={() => select(ex)}
                    className="w-full flex items-center gap-3 bg-[#1f0101] border border-[#890404]/20 hover:border-[#E01E1E]/40 rounded-lg px-3 py-2.5 text-left transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#150000] border border-[#890404]/25 flex items-center justify-center flex-shrink-0">
                      <Dumbbell size={14} className="text-[#F5EDED]/30" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-white truncate">{ex.name}</p>
                      <p className="text-[9px] text-[#F5EDED]/35 truncate">
                        {ex.muscle_group}
                        {ex.equipment && ` · ${ex.equipment}`}
                      </p>
                    </div>
                  </button>
                ))}

              {!loading && !fetched && (
                <p className="text-xs text-[#F5EDED]/25 italic text-center py-8">
                  Chargement de la bibliothèque…
                </p>
              )}

              {!loading && fetched && filtered.length === 0 && (
                <p className="text-xs text-[#F5EDED]/25 italic text-center py-6">
                  Aucun exercice trouvé.
                </p>
              )}
            </div>

            <button
              onClick={() => setCreating(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-[#F5EDED]/40 hover:text-[#F5EDED]/70 border border-dashed border-[#890404]/25 hover:border-[#890404]/50 rounded-lg transition-colors"
            >
              <Plus size={12} />
              {search.trim()
                ? `Créer "${search.trim()}" comme nouvel exercice`
                : "Créer un nouvel exercice"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
