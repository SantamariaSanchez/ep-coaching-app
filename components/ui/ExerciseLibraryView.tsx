"use client";

import { useState, useMemo, useEffect } from "react";
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
  Lock,
  AlertTriangle,
} from "lucide-react";
import type { MissingVideoExercise } from "@/utils/exercise-library";
import { hasUnlocked, FEATURE_UNLOCK_POINTS } from "@/lib/gamification-types";
import {
  LIBRARY_MUSCLE_GROUPS,
  EQUIPMENT_OPTIONS,
  MACHINE_BRANDS,
  CATEGORY_LABELS,
  DIFFICULTY_LABELS,
  EQUIPMENT_TYPES,
  EQUIPMENT_TYPE_LABELS,
  QUALITATIVE_SCALE,
  POSITION_OPTIONS,
  getEquipmentType,
  getSubgroupsFor,
  type EquipmentType,
} from "@/lib/exercise-library-content";
import { resolveVideoEmbed } from "@/lib/video-embed-utils";
import { createClientSupabase } from "@/lib/supabase-client";
import type { LibraryExercise, ExerciseCategory, ExerciseDifficulty } from "@/utils/exercise-library";
import type { CreateExerciseInput } from "@/app/dashboard/client/exercises/actions";
import { safeExternalUrl } from "@/lib/sanitize";

async function uploadExerciseVideo(file: File): Promise<string | null> {
  try {
    const supabase = createClientSupabase();
    const ext = file.name.split(".").pop() || "mp4";
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage
      .from("exercise-videos")
      .upload(path, file, { contentType: file.type || "video/mp4", upsert: false });
    if (error) return null;
    const { data } = supabase.storage.from("exercise-videos").getPublicUrl(path);
    return data.publicUrl;
  } catch {
    return null;
  }
}

// Ouvre une recherche YouTube pré-remplie pour cet exercice — sur 642
// exercices sans une seule vidéo, "vidéo à venir" est un mur mort pour le
// client et une tâche vague pour le coach. Un lien direct raccourcit le
// chemin "je cherche une démo → je colle l'URL dans la fiche".
function youtubeSearchUrl(exerciseName: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${exerciseName} exécution technique musculation`)}`;
}

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
      href={safeExternalUrl(video.src) ?? "#"}
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
  // MASTERCLASS.md Axe B : Promise<void> rendait impossible d'afficher une
  // erreur serveur ici (le formulaire d'exercice a pourtant déjà un état
  // `error`, jamais alimenté faute de retour).
  onSave: (input: CreateExerciseInput & { video_url?: string }) => Promise<{ error?: string }>;
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
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Attributs de classification — coach only (construction de programme),
  // jamais montrés/demandés côté client.
  const [position, setPosition] = useState(initial?.position ?? "");
  const [freedomOfMovement, setFreedomOfMovement] = useState(initial?.freedom_of_movement ?? "");
  const [isUnilateral, setIsUnilateral] = useState<"" | "uni" | "bi">(
    initial?.is_unilateral == null ? "" : initial.is_unilateral ? "uni" : "bi"
  );
  const [microloadable, setMicroloadable] = useState<"" | "oui" | "non">(
    initial?.microloadable == null ? "" : initial.microloadable ? "oui" : "non"
  );
  const [easyToReplicate, setEasyToReplicate] = useState(initial?.easy_to_replicate ?? "");
  const [learningDifficulty, setLearningDifficulty] = useState(initial?.learning_difficulty ?? "");
  const [stabilityDemand, setStabilityDemand] = useState(initial?.stability_demand ?? "");
  const [accessibility, setAccessibility] = useState(initial?.accessibility ?? "");

  async function handleVideoUpload(file: File) {
    // MASTERCLASS.md Axe O : le bucket exercise-videos rejette déjà les
    // fichiers trop lourds ou au mauvais type côté serveur, mais sans ce
    // contrôle l'utilisateur attend l'échec de l'upload réseau d'une vidéo
    // de plusieurs centaines de Mo avant de voir l'erreur.
    if (file.size > 150 * 1024 * 1024) {
      setError("Vidéo trop lourde (150 Mo maximum).");
      return;
    }
    setUploadingVideo(true);
    setError(null);
    const url = await uploadExerciseVideo(file);
    setUploadingVideo(false);
    if (!url) { setError("Échec de l'envoi de la vidéo, réessaie."); return; }
    setVideoUrl(url);
  }

  const subgroups = getSubgroupsFor(muscleGroup);

  async function handleSubmit() {
    if (!name.trim()) { setError("Le nom est requis."); return; }
    setSaving(true);
    setError(null);
    const result = await onSave({
      name: name.trim(),
      muscle_group: muscleGroup,
      muscle_subgroup: muscleSubgroup || null,
      equipment: equipment || null,
      brand: brand || null,
      category: category || null,
      difficulty: difficulty || null,
      instructions: instructions.trim() || null,
      ...(showVideoField
        ? {
            video_url: videoUrl.trim() || undefined,
            position: position || null,
            freedom_of_movement: freedomOfMovement || null,
            is_unilateral: isUnilateral === "" ? null : isUnilateral === "uni",
            microloadable: microloadable === "" ? null : microloadable === "oui",
            easy_to_replicate: easyToReplicate || null,
            learning_difficulty: learningDifficulty || null,
            stability_demand: stabilityDemand || null,
            accessibility: accessibility || null,
          }
        : {}),
    });
    setSaving(false);
    if (result.error) setError(result.error);
  }

  return (
    <div className="bg-[#150000] border border-[#890404]/30 rounded-xl p-4 space-y-3">
      <div>
        <label className={labelCls}>Nom de l&apos;exercice</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Développé incliné haltères" aria-label="Nom de l'exercice" className={inputCls} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Groupe musculaire</label>
          <select aria-label="Groupe musculaire"
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
          <select aria-label="Sous-groupe (optionnel)" value={muscleSubgroup} onChange={(e) => setMuscleSubgroup(e.target.value)} className={inputCls} disabled={subgroups.length === 0}>
            <option value="">-</option>
            {subgroups.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className={labelCls}>Matériel</label>
          <select aria-label="Matériel" value={equipment} onChange={(e) => setEquipment(e.target.value)} className={inputCls}>
            <option value="">-</option>
            {EQUIPMENT_OPTIONS.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Marque de machine (optionnel)</label>
          <select aria-label="Marque de machine (optionnel)" value={brand} onChange={(e) => setBrand(e.target.value)} className={inputCls}>
            <option value="">-</option>
            {MACHINE_BRANDS.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Type</label>
          <select aria-label="Type" value={category} onChange={(e) => setCategory(e.target.value as ExerciseCategory)} className={inputCls}>
            <option value="">-</option>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Difficulté</label>
          <select aria-label="Difficulté" value={difficulty} onChange={(e) => setDifficulty(e.target.value as ExerciseDifficulty)} className={inputCls}>
            <option value="">-</option>
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
          placeholder="Points clés de la technique…" aria-label="Points clés de la technique…"
          className={`${inputCls} resize-none`}
        />
      </div>

      {showVideoField && (
        <div className="border-t border-[#890404]/15 pt-3">
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/25 mb-2">
            Précisions pour la construction de programme (pas montré au client)
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className={labelCls}>Position</label>
              <select aria-label="Position" value={position} onChange={(e) => setPosition(e.target.value)} className={inputCls}>
                <option value="">-</option>
                {POSITION_OPTIONS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Liberté mvt</label>
              <select aria-label="Liberté mvt" value={freedomOfMovement} onChange={(e) => setFreedomOfMovement(e.target.value)} className={inputCls}>
                <option value="">-</option>
                {QUALITATIVE_SCALE.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Uni / Bi</label>
              <select aria-label="Uni / Bi" value={isUnilateral} onChange={(e) => setIsUnilateral(e.target.value as typeof isUnilateral)} className={inputCls}>
                <option value="">-</option>
                <option value="uni">Uni</option>
                <option value="bi">Bi</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Microchargeable</label>
              <select aria-label="Microchargeable" value={microloadable} onChange={(e) => setMicroloadable(e.target.value as typeof microloadable)} className={inputCls}>
                <option value="">-</option>
                <option value="oui">Oui</option>
                <option value="non">Non</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Facile à répliquer</label>
              <select aria-label="Facile à répliquer" value={easyToReplicate} onChange={(e) => setEasyToReplicate(e.target.value)} className={inputCls}>
                <option value="">-</option>
                {QUALITATIVE_SCALE.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Difficulté d&apos;apprentissage</label>
              <select aria-label="Difficulté d&apos;apprentissage" value={learningDifficulty} onChange={(e) => setLearningDifficulty(e.target.value)} className={inputCls}>
                <option value="">-</option>
                {QUALITATIVE_SCALE.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Stabilité</label>
              <select aria-label="Stabilité" value={stabilityDemand} onChange={(e) => setStabilityDemand(e.target.value)} className={inputCls}>
                <option value="">-</option>
                {QUALITATIVE_SCALE.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Accessibilité</label>
              <select aria-label="Accessibilité" value={accessibility} onChange={(e) => setAccessibility(e.target.value)} className={inputCls}>
                <option value="">-</option>
                {QUALITATIVE_SCALE.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {showVideoField && (
        <div>
          <label className={labelCls}>Vidéo d&apos;exemple</label>
          <div className="flex items-center gap-2 mb-2">
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-[#890404]/40 bg-black/20 text-xs text-[#F5EDED]/50 hover:border-[#890404]/60 hover:text-[#F5EDED]/75 cursor-pointer transition-colors">
              <Video size={13} />
              {uploadingVideo ? "Envoi…" : "Uploader une vidéo"}
              <input
                type="file"
                accept="video/*"
                className="hidden"
                disabled={uploadingVideo}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleVideoUpload(file);
                  e.target.value = "";
                }}
              />
            </label>
            {videoUrl && (
              <span className="text-[10px] text-green-400 flex items-center gap-1">
                <PlayCircle size={12} /> Vidéo prête
              </span>
            )}
          </div>
          <input
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="…ou colle un lien YouTube / Vimeo / direct" aria-label="…ou colle un lien YouTube / Vimeo / direct"
            className={inputCls}
          />
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
        <button onClick={onCancel} aria-label="Annuler" className="px-4 py-2.5 text-xs font-bold uppercase tracking-widest border border-[#890404]/40 text-[#F5EDED]/50 hover:text-[#F5EDED]/80 rounded-lg transition-colors">
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
  videosUnlocked,
  onUpdate,
  onDelete,
}: {
  exercise: LibraryExercise;
  isCoach: boolean;
  videosUnlocked: boolean;
  onUpdate: (input: CreateExerciseInput & { video_url?: string }) => Promise<{ error?: string }>;
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
        onSave={async (input) => {
          const result = await onUpdate(input);
          if (!result.error) setEditing(false);
          return result;
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  const hasLockedVideo = !!exercise.video_url && !videosUnlocked && !isCoach;

  return (
    <div className="bg-[#1f0101] border border-[#890404]/20 rounded-xl overflow-hidden">
      <button onClick={() => setExpanded((v) => !v)} className="w-full flex items-center gap-3 px-4 py-3 text-left">
        <div className="w-9 h-9 rounded-lg bg-[#150000] border border-[#890404]/25 flex items-center justify-center flex-shrink-0">
          {hasLockedVideo ? (
            <Lock size={14} className="text-amber-400" />
          ) : exercise.video_url ? (
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

          {isCoach && (
            (exercise.position || exercise.freedom_of_movement || exercise.is_unilateral != null ||
              exercise.microloadable != null || exercise.easy_to_replicate || exercise.learning_difficulty ||
              exercise.stability_demand || exercise.accessibility) && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1 bg-[#150000] border border-[#890404]/15 rounded-lg px-3 py-2.5">
                {exercise.position && <p className="text-[10px] text-[#F5EDED]/40">Position <strong className="text-[#F5EDED]/70">{exercise.position}</strong></p>}
                {exercise.freedom_of_movement && <p className="text-[10px] text-[#F5EDED]/40">Liberté mvt <strong className="text-[#F5EDED]/70">{exercise.freedom_of_movement}</strong></p>}
                {exercise.is_unilateral != null && <p className="text-[10px] text-[#F5EDED]/40">Uni/Bi <strong className="text-[#F5EDED]/70">{exercise.is_unilateral ? "Uni" : "Bi"}</strong></p>}
                {exercise.microloadable != null && <p className="text-[10px] text-[#F5EDED]/40">Microcharg. <strong className="text-[#F5EDED]/70">{exercise.microloadable ? "Oui" : "Non"}</strong></p>}
                {exercise.easy_to_replicate && <p className="text-[10px] text-[#F5EDED]/40">Réplicable <strong className="text-[#F5EDED]/70">{exercise.easy_to_replicate}</strong></p>}
                {exercise.learning_difficulty && <p className="text-[10px] text-[#F5EDED]/40">Apprentissage <strong className="text-[#F5EDED]/70">{exercise.learning_difficulty}</strong></p>}
                {exercise.stability_demand && <p className="text-[10px] text-[#F5EDED]/40">Stabilité <strong className="text-[#F5EDED]/70">{exercise.stability_demand}</strong></p>}
                {exercise.accessibility && <p className="text-[10px] text-[#F5EDED]/40">Accessibilité <strong className="text-[#F5EDED]/70">{exercise.accessibility}</strong></p>}
              </div>
            )
          )}

          {exercise.video_url ? (
            hasLockedVideo ? (
              <div className="flex items-center gap-2.5 bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2.5 mt-2">
                <Lock size={14} className="text-amber-400 flex-shrink-0" strokeWidth={1.8} />
                <p className="text-[11px] text-amber-300/80">
                  Vidéo de démonstration débloquée à {FEATURE_UNLOCK_POINTS.exercise_videos} pts ou avec l&apos;abonnement.
                </p>
              </div>
            ) : (
              <VideoBlock url={exercise.video_url} />
            )
          ) : (
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/25">
                <Video size={11} /> Vidéo d&apos;exécution à venir
              </p>
              <a
                href={youtubeSearchUrl(exercise.name)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#F5EDED]/40 hover:text-[#E01E1E] transition-colors"
              >
                <PlayCircle size={12} /> Chercher une démo
              </a>
            </div>
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
  points?: number;
  isSubscribed?: boolean;
  createExercise: (input: CreateExerciseInput) => Promise<{ error?: string; id?: string }>;
  updateExercise: (id: string, fields: Partial<CreateExerciseInput> & { video_url?: string | null }) => Promise<{ error?: string }>;
  deleteExercise: (id: string) => Promise<{ error?: string }>;
  /** Coach uniquement — top des exercices réellement prescrits sans vidéo (voir getTopExercisesMissingVideo). */
  missingVideoTop?: MissingVideoExercise[];
}

export default function ExerciseLibraryView({
  exercises: initialExercises,
  isCoach,
  points = 0,
  isSubscribed = false,
  createExercise,
  updateExercise,
  deleteExercise,
  missingVideoTop = [],
}: Props) {
  const videosUnlocked = hasUnlocked("exercise_videos", points, isSubscribed);
  const [exercises, setExercises] = useState(initialExercises);

  // MASTERCLASS.md Axe E : resynchronise depuis le serveur quand
  // initialExercises change (même piège que todayLogs dans ClientNutritionView —
  // useState ne reprend jamais un nouveau prop après le premier rendu).
  useEffect(() => {
    setExercises(initialExercises);
  }, [initialExercises]);
  const [search, setSearch] = useState("");
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [activeBrand, setActiveBrand] = useState<string | null>(null);
  const [activeEquipmentType, setActiveEquipmentType] = useState<EquipmentType | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showMissingVideo, setShowMissingVideo] = useState(false);
  const withVideoCount = useMemo(() => exercises.filter((e) => e.video_url).length, [exercises]);

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

  const equipmentTypeCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of exercises) {
      const t = getEquipmentType(e.equipment);
      map[t] = (map[t] ?? 0) + 1;
    }
    return map;
  }, [exercises]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return exercises.filter((e) => {
      if (activeGroup && e.muscle_group !== activeGroup) return false;
      if (activeBrand && e.brand !== activeBrand) return false;
      if (activeEquipmentType && getEquipmentType(e.equipment) !== activeEquipmentType) return false;
      if (!q) return true;
      return (
        e.name.toLowerCase().includes(q) ||
        (e.muscle_subgroup ?? "").toLowerCase().includes(q) ||
        (e.equipment ?? "").toLowerCase().includes(q) ||
        (e.brand ?? "").toLowerCase().includes(q)
      );
    });
  }, [exercises, search, activeGroup, activeBrand, activeEquipmentType]);

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
      {isCoach && withVideoCount === 0 && exercises.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="flex items-center gap-2 text-[11.5px] text-amber-300/90 leading-snug">
              <AlertTriangle size={14} className="flex-shrink-0" />
              0/{exercises.length} exercices ont une vidéo de démonstration — le système de déblocage par points
              n&apos;a encore rien à débloquer.
            </p>
            {missingVideoTop.length > 0 && (
              <button
                onClick={() => setShowMissingVideo((v) => !v)}
                className="flex-shrink-0 text-[10px] font-bold uppercase tracking-widest text-amber-400 hover:text-amber-300 transition-colors"
              >
                {showMissingVideo ? "Masquer" : `Voir les ${missingVideoTop.length} plus prescrits`}
              </button>
            )}
          </div>
          {showMissingVideo && (
            <div className="mt-3 pt-3 border-t border-amber-500/15 grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
              {missingVideoTop.map((ex) => (
                <div key={ex.name} className="flex items-center justify-between gap-2">
                  <span className="text-xs text-[#F5EDED]/70 truncate">{ex.name}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] font-bold text-amber-300/70">×{ex.timesPrescribed}</span>
                    <a
                      href={youtubeSearchUrl(ex.name)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#F5EDED]/30 hover:text-[#E01E1E] transition-colors"
                      title="Chercher une démo"
                    >
                      <PlayCircle size={12} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#F5EDED]/25" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un exercice…" aria-label="Rechercher un exercice…"
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
        {exercises.length} exercice{exercises.length !== 1 ? "s" : ""} dans la bibliothèque, enrichis-la en ajoutant les tiens.
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
            return result;
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

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <span className="flex-shrink-0 self-center text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/25 mr-1">
          Matériel :
        </span>
        <button
          onClick={() => setActiveEquipmentType(null)}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-colors ${
            activeEquipmentType === null ? "bg-[#E01E1E]/20 border-[#E01E1E]/50 text-[#E01E1E]" : "border-[#890404]/25 text-[#F5EDED]/40"
          }`}
        >
          Tout
        </button>
        {EQUIPMENT_TYPES.filter((t) => equipmentTypeCounts[t]).map((t) => (
          <button
            key={t}
            onClick={() => setActiveEquipmentType(t)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-colors ${
              activeEquipmentType === t ? "bg-[#E01E1E]/20 border-[#E01E1E]/50 text-[#E01E1E]" : "border-[#890404]/25 text-[#F5EDED]/40"
            }`}
          >
            {EQUIPMENT_TYPE_LABELS[t]} ({equipmentTypeCounts[t]})
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
                  videosUnlocked={videosUnlocked}
                  onUpdate={async (input) => {
                    const result = await updateExercise(ex.id, input);
                    if (!result.error) {
                      setExercises((prev) => prev.map((e) => (e.id === ex.id ? { ...e, ...input, muscle_subgroup: input.muscle_subgroup ?? null, video_url: input.video_url ?? e.video_url } : e)));
                    }
                    return result;
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
