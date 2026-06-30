"use client";

import { useState, useMemo } from "react";
import {
  Search,
  Plus,
  X,
  Pencil,
  Trash2,
  PlayCircle,
  Video,
  ExternalLink,
  Dumbbell,
} from "lucide-react";
import {
  LIBRARY_MUSCLE_GROUPS,
  EQUIPMENT_OPTIONS,
  MACHINE_BRANDS,
  CATEGORY_LABELS,
  DIFFICULTY_LABELS,
  getSubgroupsFor,
} from "@/lib/exercise-library-content";
import { resolveVideoEmbed } from "@/lib/video-embed-utils";
import type { LibraryExercise, ExerciseCategory, ExerciseDifficulty } from "@/utils/exercise-library";
import type { CreateExerciseInput } from "@/app/dashboard/client/exercises/actions";

const inputCls =
  "w-full bg-[#150000] border border-[#890404]/30 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#F5EDED]/25 focus:outline-none focus:border-[#E01E1E]/60 transition-colors";
const labelCls = "block text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5";

// ── Video player ──────────────────────────────────────────────────────────────

function VideoBlock({ url }: { url: string }) {
  const video = resolveVideoEmbed(url);
  if (!video) return null;

  if (video.type === "youtube" || video.type === "vimeo") {
    return (
      <div className="aspect-video bg-black rounded-lg overflow-hidden mt-3">
        <iframe
          src={video.src}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }
  if (video.type === "file") {
    return (
      <video src={video.src} controls className="w-full rounded-lg mt-3 bg-black" />
    );
  }
  return (
    <a
      href={video.src}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#E01E1E] hover:text-[#ff4444] transition-colors mt-3"
    >
      <ExternalLink size={12} /> Voir la vidéo
    </a>
  );
}

// ── Exercise form (create / edit) ───────────────────────────────────────────

function ExerciseForm({
  initial,
  showVideoField,
  onSave,
  onCancel,
}: {
  initial?: LibraryExercise;
  showVideoField?: boolean;
  onSave: (input: CreateExerciseInput & { video_url?: string }) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [muscleGroup, setMuscleGroup] = useState(initial?.muscle_group ?? LIBRARY_MUSCLE_GROUPS[0]);
  const [muscleSubgroup, setMuscleSubgroup] = useState(initial?.muscle_subgroup ?? "");
  const [equipment, setEquipment] = useState(initial?.equipment ?? "");
  const [brand, setBrand] = useState(initial?.brand ?? "");
  const [category, setCategory] = useState<ExerciseCategory | "">(initial?.category ?? "");
  const [difficulty, setDifficulty] = useState<ExerciseDifficulty | "">(initial?.difficulty ?? "");
  const [instructions, setInstructions] = useState(initial?.instructions ?? "");
  const [videoUrl, setVideoUrl] = useState(initial?.video_url ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subgroups = getSubgroupsFor(muscleGroup);

  async function handleSubmit() {
    if (!name.trim()) { setError("Le nom est requis."); return; }
    setSaving(true);
    setError(null);
    await onSave({
      name: name.trim(),
      muscle_group: muscleGroup,
      muscle_subgroup: muscleSubgroup || null,
      equipment: equipment || null,
      brand: brand || null,
      category: category || null,
      difficulty: difficulty || null,
      instructions: instructions.trim() || null,
      ...(showVideoField ? { video_url: videoUrl.trim() || undefined } : {}),
    });
    setSaving(false);
  }

  return (
    <div className="bg-[#150000] border border-[#890404]/30 rounded-xl p-4 space-y-3">
      <div>
        <label className={labelCls}>Nom de l&apos;exercice</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Développé incliné haltères" className={inputCls} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Groupe musculaire</label>
          <select
            value={muscleGroup}
            onChange={(e) => { setMuscleGroup(e.target.value); setMuscleSubgroup(""); }}
            className={inputCls}
          >
            {LIBRARY_MUSCLE_GROUPS.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Sous-groupe (optionnel)</label>
          <select value={muscleSubgroup} onChange={(e) => setMuscleSubgroup(e.target.value)} className={inputCls} disabled={subgroups.length === 0}>
            <option value="">—</option>
            {subgroups.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className={labelCls}>Matériel</label>
          <select value={equipment} onChange={(e) => setEquipment(e.target.value)} className={inputCls}>
            <option value="">—</option>
            {EQUIPMENT_OPTIONS.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Marque de machine (optionnel)</label>
          <select value={brand} onChange={(e) => setBrand(e.target.value)} className={inputCls}>
            <option value="">—</option>
            {MACHINE_BRANDS.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Type</label>
          <select value={category} onChange={(e) => setCategory(e.target.value as ExerciseCategory)} className={inputCls}>
            <option value="">—</option>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Difficulté</label>
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as ExerciseDifficulty)} className={inputCls}>
            <option value="">—</option>
            {Object.entries(DIFFICULTY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={labelCls}>Consignes d&apos;exécution (optionnel)</label>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={3}
          placeholder="Points clés de la technique…"
          className={`${inputCls} resize-none`}
        />
      </div>

      {showVideoField && (
        <div>
          <label className={labelCls}>Lien vidéo d&apos;exécution (YouTube, Vimeo, ou lien direct)</label>
          <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://…" className={inputCls} />
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="flex-1 py-2.5 text-xs font-black uppercase tracking-widest bg-[#E01E1E] hover:bg-[#B00202] disabled:opacity-50 text-white rounded-lg transition-colors"
        >
          {saving ? "Enregistrement…" : initial ? "Mettre à jour" : "Ajouter à la bibliothèque"}
        </button>
        <button onClick={onCancel} className="px-4 py-2.5 text-xs font-bold uppercase tracking-widest border border-[#890404]/40 text-[#F5EDED]/50 hover:text-[#F5EDED]/80 rounded-lg transition-colors">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

// ── Exercise card ────────────────────────────────────────────────────────────

function ExerciseCard({
  exercise,
  isCoach,
  onUpdate,
  onDelete,
}: {
  exercise: LibraryExercise;
  isCoach: boolean;
  onUpdate: (input: CreateExerciseInput & { video_url?: string }) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (editing) {
    return (
      <ExerciseForm
        initial={exercise}
        showVideoField
        onSave={async (input) => { await onUpdate(input); setEditing(false); }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="bg-[#1f0101] border border-[#890404]/20 rounded-xl overflow-hidden">
      <button onClick={() => setExpanded((v) => !v)} className="w-full flex items-center gap-3 px-4 py-3 text-left">
        <div className="w-9 h-9 rounded-lg bg-[#150000] border border-[#890404]/25 flex items-center justify-center flex-shrink-0">
          {exercise.video_url ? (
            <PlayCircle size={16} className="text-[#E01E1E]" />
          ) : (
            <Dumbbell size={15} className="text-[#F5EDED]/25" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">{exercise.name}</p>
          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
            {exercise.muscle_subgroup && (
              <span className="text-[9px] font-semibold text-[#F5EDED]/35">{exercise.muscle_subgroup}</span>
            )}
            {exercise.equipment && (
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[#150000] border border-[#890404]/20 text-[#F5EDED]/40">
                {exercise.equipment}
              </span>
            )}
            {exercise.brand && (
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300">
                {exercise.brand}
              </span>
            )}
            {!exercise.is_official && (
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-300">
                Communauté
              </span>
            )}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-[#890404]/15 pt-3 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            {exercise.category && (
              <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#150000] border border-[#890404]/20 text-[#F5EDED]/45">
                {CATEGORY_LABELS[exercise.category]}
              </span>
            )}
            {exercise.difficulty && (
              <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#150000] border border-[#890404]/20 text-[#F5EDED]/45">
                {DIFFICULTY_LABELS[exercise.difficulty]}
              </span>
            )}
          </div>

          {exercise.instructions && (
            <p className="text-sm text-[#F5EDED]/60 leading-relaxed">{exercise.instructions}</p>
          )}

          {exercise.video_url ? (
            <VideoBlock url={exercise.video_url} />
          ) : (
            <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/25 mt-2">
              <Video size={11} /> Vidéo d&apos;exécution à venir
            </p>
          )}

          {isCoach && (
            <div className="flex gap-2 pt-2 border-t border-[#890404]/10">
              <button
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/40 hover:text-[#F5EDED]/70 transition-colors"
              >
                <Pencil size={11} /> Modifier / ajouter la vidéo
              </button>
              {confirmDelete ? (
                <button onClick={onDelete} className="text-[10px] font-bold uppercase tracking-widest text-red-400">
                  Confirmer la suppression
                </button>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/30 hover:text-red-400 transition-colors ml-auto"
                >
                  <Trash2 size={11} /> Supprimer
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main view ────────────────────────────────────────────────────────────────

interface Props {
  exercises: LibraryExercise[];
  isCoach: boolean;
  createExercise: (input: CreateExerciseInput) => Promise<{ error?: string; id?: string }>;
  updateExercise: (id: string, fields: Partial<CreateExerciseInput> & { video_url?: string | null }) => Promise<{ error?: string }>;
  deleteExercise: (id: string) => Promise<{ error?: string }>;
}

export default function ExerciseLibraryView({
  exercises: initialExercises,
  isCoach,
  createExercise,
  updateExercise,
  deleteExercise,
}: Props) {
  const [exercises, setExercises] = useState(initialExercises);
  const [search, setSearch] = useState("");
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [activeBrand, setActiveBrand] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const groupCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of exercises) map[e.muscle_group] = (map[e.muscle_group] ?? 0) + 1;
    return map;
  }, [exercises]);

  const brandCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of exercises) if (e.brand) map[e.brand] = (map[e.brand] ?? 0) + 1;
    return map;
  }, [exercises]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return exercises.filter((e) => {
      if (activeGroup && e.muscle_group !== activeGroup) return false;
      if (activeBrand && e.brand !== activeBrand) return false;
      if (!q) return true;
      return (
        e.name.toLowerCase().includes(q) ||
        (e.muscle_subgroup ?? "").toLowerCase().includes(q) ||
        (e.equipment ?? "").toLowerCase().includes(q) ||
        (e.brand ?? "").toLowerCase().includes(q)
      );
    });
  }, [exercises, search, activeGroup, activeBrand]);

  const byGroup = useMemo(() => {
    const map: Record<string, LibraryExercise[]> = {};
    for (const e of filtered) {
      if (!map[e.muscle_group]) map[e.muscle_group] = [];
      map[e.muscle_group].push(e);
    }
    return map;
  }, [filtered]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#F5EDED]/25" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un exercice…"
            className={`${inputCls} pl-9`}
          />
        </div>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-black uppercase tracking-widest bg-[#E01E1E] hover:bg-[#B00202] text-white rounded-lg transition-colors flex-shrink-0"
        >
          <Plus size={13} /> {showCreate ? "Fermer" : "Créer un exercice"}
        </button>
      </div>

      <p className="text-[10px] text-[#F5EDED]/25">
        {exercises.length} exercice{exercises.length !== 1 ? "s" : ""} dans la bibliothèque — enrichis-la en ajoutant les tiens.
      </p>

      {showCreate && (
        <ExerciseForm
          showVideoField={isCoach}
          onSave={async (input) => {
            const result = await createExercise(input);
            if (!result.error) {
              setExercises((prev) => [
                ...prev,
                { ...input, id: result.id ?? `optimistic-${Date.now()}`, video_url: input.video_url ?? null, created_by: null, is_official: false, created_at: new Date().toISOString() } as LibraryExercise,
              ]);
              setShowCreate(false);
            }
          }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveGroup(null)}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-colors ${
            activeGroup === null ? "bg-[#E01E1E]/20 border-[#E01E1E]/50 text-[#E01E1E]" : "border-[#890404]/25 text-[#F5EDED]/40"
          }`}
        >
          Tout ({exercises.length})
        </button>
        {LIBRARY_MUSCLE_GROUPS.filter((g) => groupCounts[g]).map((g) => (
          <button
            key={g}
            onClick={() => setActiveGroup(g)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-colors ${
              activeGroup === g ? "bg-[#E01E1E]/20 border-[#E01E1E]/50 text-[#E01E1E]" : "border-[#890404]/25 text-[#F5EDED]/40"
            }`}
          >
            {g} ({groupCounts[g]})
          </button>
        ))}
      </div>

      {Object.keys(brandCounts).length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <span className="flex-shrink-0 self-center text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/25 mr-1">
            Marque :
          </span>
          <button
            onClick={() => setActiveBrand(null)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-colors ${
              activeBrand === null ? "bg-amber-500/20 border-amber-500/50 text-amber-300" : "border-[#890404]/25 text-[#F5EDED]/40"
            }`}
          >
            Toutes
          </button>
          {MACHINE_BRANDS.filter((b) => brandCounts[b]).map((b) => (
            <button
              key={b}
              onClick={() => setActiveBrand(b)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-colors ${
                activeBrand === b ? "bg-amber-500/20 border-amber-500/50 text-amber-300" : "border-[#890404]/25 text-[#F5EDED]/40"
              }`}
            >
              {b} ({brandCounts[b]})
            </button>
          ))}
        </div>
      )}

      <div className="space-y-6">
        {Object.entries(byGroup).map(([group, list]) => (
          <div key={group}>
            {!activeGroup && (
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/30 mb-2">{group}</p>
            )}
            <div className="space-y-2">
              {list.map((ex) => (
                <ExerciseCard
                  key={ex.id}
                  exercise={ex}
                  isCoach={isCoach}
                  onUpdate={async (input) => {
                    await updateExercise(ex.id, input);
                    setExercises((prev) => prev.map((e) => (e.id === ex.id ? { ...e, ...input, muscle_subgroup: input.muscle_subgroup ?? null, video_url: input.video_url ?? e.video_url } : e)));
                  }}
                  onDelete={async () => {
                    await deleteExercise(ex.id);
                    setExercises((prev) => prev.filter((e) => e.id !== ex.id));
                  }}
                />
              ))}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-xs text-[#F5EDED]/25 italic text-center py-10">Aucun exercice ne correspond à ta recherche.</p>
        )}
      </div>
    </div>
  );
}
