"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Timer,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Plus,
  Trophy,
  Dumbbell,
  Activity,
  Brain,
  AlertCircle,
  BarChart2,
  Clock,
  Star,
  Video,
  Loader2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import {
  WARMUP_RECOMMENDATIONS,
  EQUIPMENT_COLORS,
  detectWarmupType,
} from "@/lib/warmup-data";
import { createClientSupabase } from "@/lib/supabase-client";
import { getTips } from "@/lib/execution-tips";
import { VOLUME_LANDMARKS, MUSCLE_GROUPS } from "@/lib/volume-data";
import type { Exercise } from "@/utils/programs";
import type { Session, SessionSet } from "@/utils/sessions";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PrevWeight {
  weight: number | null;
  reps: string | null;
  rir: number | null;
}

interface InitData {
  session: Session;
  exercises: Exercise[];
  prMap: Record<string, number>;
  prevWeights: Record<string, PrevWeight>;
  existingSets: SessionSet[];
}

interface SetState {
  localId: string;
  setNumber: number;
  weightKg: string;
  repsActual: string;
  rirActual: string;
  standardizationScore: string;
  validated: boolean;
  isPR: boolean;
  dbId: string | null;
  restDuration: number | null;
  hasVideo: boolean;
}

interface ExerciseState {
  exercise: Exercise;
  sets: SetState[];
  showTips: boolean;
  showHistory: boolean;
}

type Step = "warmup" | "session" | "recap";

interface RestTimer {
  visible: boolean;
  startedAt: number;
  suggestedSeconds: number;
  mentalStep: "hidden" | "checking" | "no_wait";
  mentalPhysical: boolean | null;
  mentalMental: boolean | null;
  noWaitStartedAt: number | null;
  exerciseIdx: number;
  setIdx: number;
}

const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: "var(--color-ep-card)",
    border: "1px solid rgba(var(--color-ep-dark-red-rgb),0.4)",
    borderRadius: "8px",
    color: "var(--color-ep-light)",
    fontSize: "11px",
  },
  labelStyle: { color: "rgba(var(--color-ep-light-rgb),0.6)", fontSize: "10px" },
};

const TICK_STYLE = { fill: "rgba(var(--color-ep-light-rgb),0.35)", fontSize: 9 };

const STANDARDIZATION_LABELS: Record<string, string> = {
  "1": "Exécution approximative",
  "2": "Quelques écarts techniques",
  "3": "Correct mais améliorable",
  "4": "Bonne exécution",
  "5": "Exécution parfaite",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getSuggestedRest(rir: number): { seconds: number; label: string } {
  if (rir <= 1) return { seconds: 180, label: "3-5 min" };
  if (rir <= 3) return { seconds: 150, label: "2-3 min" };
  return { seconds: 90, label: "1-2 min" };
}

function playBeep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch {
    // audio not available
  }
}

function newLocalId() {
  return Math.random().toString(36).slice(2);
}

function buildExerciseState(exercises: Exercise[], existingSets: SessionSet[]): ExerciseState[] {
  return exercises.map((ex) => {
    const targetSets = ex.sets ?? 3;
    const existing = existingSets.filter((s) => s.exercise_name === ex.name);

    const sets: SetState[] = [];
    // Populate from existing validated sets
    for (const s of existing) {
      sets.push({
        localId: s.id,
        setNumber: s.set_number,
        weightKg: s.weight_kg != null ? String(s.weight_kg) : "",
        repsActual: s.reps_actual != null ? String(s.reps_actual) : "",
        rirActual: s.rir_actual != null ? String(s.rir_actual) : "",
        standardizationScore: s.standardization_score != null ? String(s.standardization_score) : "",
        validated: true,
        isPR: s.is_pr,
        dbId: s.id,
        restDuration: s.rest_duration_seconds,
        hasVideo: !!s.video_url,
      });
    }
    // Fill remaining empty slots up to target
    const existingCount = sets.length;
    for (let i = existingCount; i < Math.max(targetSets, existingCount + 1); i++) {
      sets.push({
        localId: newLocalId(),
        setNumber: i + 1,
        weightKg: "",
        repsActual: "",
        rirActual: "",
        standardizationScore: "",
        validated: false,
        isPR: false,
        dbId: null,
        restDuration: null,
        hasVideo: false,
      });
    }
    return { exercise: ex, sets, showTips: false, showHistory: false };
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function VolumeGauge({
  muscleGroup,
  sets,
}: {
  muscleGroup: string;
  sets: number;
}) {
  const lm = VOLUME_LANDMARKS[muscleGroup] ?? { mev: 8, mav: 16, mrv: 22 };
  const pct = Math.min((sets / lm.mrv) * 100, 110);
  const color =
    sets < lm.mev
      ? "#ef4444"
      : sets <= lm.mav
      ? "#4ade80"
      : sets <= lm.mrv
      ? "#fbbf24"
      : "#ef4444";

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex justify-between">
        <span className="text-[8px] text-[var(--color-ep-light)]/35 uppercase tracking-wider truncate max-w-[60px]">
          {muscleGroup}
        </span>
        <span className="text-[8px] font-black" style={{ color }}>
          {sets}/{lm.mev}
        </span>
      </div>
      <div className="h-1 bg-[var(--color-ep-dark-red)]/20 rounded-full overflow-hidden w-full">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// ── Warmup Step ───────────────────────────────────────────────────────────────

function WarmupStep({
  dayLabel,
  muscleGroups,
  onValidate,
}: {
  dayLabel: string;
  muscleGroups: string[];
  onValidate: (seconds: number) => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const type = detectWarmupType(dayLabel, muscleGroups);
  const warmup = WARMUP_RECOMMENDATIONS[type];

  const canValidate = elapsed >= 300; // 5 min
  const isOptimal = elapsed >= 300 && elapsed <= 900;
  const isLate = elapsed > 900;

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto pb-24">
      {/* Timer */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-ep-light)]/35">
            Échauffement — {dayLabel}
          </p>
          <div className="flex items-center gap-2">
            <Timer size={14} className="text-[var(--color-ep-red)]" />
            <span className="text-2xl font-black text-white tabular-nums">
              {formatTime(elapsed)}
            </span>
          </div>
        </div>

        {/* Progress bar 0 → 15 min */}
        <div className="h-2 bg-[var(--color-ep-dark-red)]/15 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.min((elapsed / 900) * 100, 100)}%`,
              backgroundColor: isOptimal ? "#4ade80" : isLate ? "#fbbf24" : "var(--color-ep-red)",
            }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[8px] text-[var(--color-ep-light)]/25">0 min</span>
          <span className="text-[8px] text-green-400">5 min ✓</span>
          <span className="text-[8px] text-[var(--color-ep-light)]/25">15 min</span>
        </div>
      </div>

      {/* Status message */}
      {!canValidate && (
        <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-5">
          <AlertCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-400">
            Minimum 5 minutes d&apos;échauffement requis pour préparer tes
            articulations
          </p>
        </div>
      )}
      {isOptimal && (
        <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-2.5 mb-5">
          <CheckCircle2 size={14} className="text-green-400" />
          <p className="text-xs font-bold text-green-400">
            Durée recommandée atteinte ✓
          </p>
        </div>
      )}
      {isLate && (
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2.5 mb-5">
          <AlertCircle size={14} className="text-amber-400" />
          <p className="text-xs font-bold text-amber-400">
            Tu peux commencer, n&apos;attends pas trop
          </p>
        </div>
      )}

      {/* Articulations */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {warmup.articulations.map((a) => (
          <span
            key={a}
            className="text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-[var(--color-ep-dark-red)]/15 text-[var(--color-ep-light)]/50 border border-[var(--color-ep-dark-red)]/20"
          >
            {a}
          </span>
        ))}
      </div>

      {/* Tip */}
      <p className="text-xs text-[var(--color-ep-light)]/50 italic mb-5 leading-relaxed">
        💡 {warmup.tips}
      </p>

      {/* Exercises list */}
      <div className="space-y-2 mb-8">
        {warmup.exercises.map((ex, i) => (
          <div
            key={i}
            className="flex items-center gap-3 bg-[var(--color-ep-card)] border border-[var(--color-ep-dark-red)]/20 rounded-xl px-4 py-3"
          >
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">{ex.name}</p>
              <p className="text-[10px] text-[var(--color-ep-light)]/40">{ex.sets}</p>
            </div>
            <span
              className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border"
              style={{
                color: EQUIPMENT_COLORS[ex.equipment],
                borderColor: `${EQUIPMENT_COLORS[ex.equipment]}30`,
                backgroundColor: `${EQUIPMENT_COLORS[ex.equipment]}10`,
              }}
            >
              {ex.equipment}
            </span>
          </div>
        ))}
      </div>

      {/* Validate button */}
      <button
        onClick={() => canValidate && onValidate(elapsed)}
        disabled={!canValidate}
        className={`w-full py-4 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${
          canValidate
            ? "bg-[var(--color-ep-red)] hover:bg-[var(--color-ep-med-red)] text-white"
            : "bg-[var(--color-ep-dark-red)]/20 text-[var(--color-ep-light)]/20 cursor-not-allowed"
        }`}
      >
        {canValidate ? "Valider l'échauffement → Commencer" : `Encore ${formatTime(300 - elapsed)}`}
      </button>
    </div>
  );
}

// ── Rest Timer ────────────────────────────────────────────────────────────────

function RestTimerOverlay({
  timer,
  onUpdate,
  onClose,
}: {
  timer: RestTimer;
  onUpdate: (patch: Partial<RestTimer>) => void;
  onClose: (elapsed: number) => void;
}) {
  const [elapsed, setElapsed] = useState(
    Math.floor((Date.now() - timer.startedAt) / 1000)
  );
  const [noWaitElapsed, setNoWaitElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const noWaitRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const beepedRef = useRef(false);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const s = Math.floor((Date.now() - timer.startedAt) / 1000);
      setElapsed(s);
      if (s >= timer.suggestedSeconds && !beepedRef.current) {
        beepedRef.current = true;
        playBeep();
        try { navigator.vibrate([200, 100, 200]); } catch {}
        onUpdate({ mentalStep: "checking" });
      }
    }, 500);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer.startedAt, timer.suggestedSeconds]);

  useEffect(() => {
    if (timer.mentalStep === "no_wait") {
      noWaitRef.current = setInterval(
        () => setNoWaitElapsed((s) => s + 1),
        1000
      );
    }
    return () => {
      if (noWaitRef.current) clearInterval(noWaitRef.current);
    };
  }, [timer.mentalStep]);

  const pct = Math.min((elapsed / timer.suggestedSeconds) * 100, 100);
  const both = timer.mentalPhysical === true && timer.mentalMental === true;
  const anyNo = timer.mentalPhysical === false || timer.mentalMental === false;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => {
          if (timer.mentalStep === "hidden") {
            onUpdate({ mentalStep: "checking" });
          }
        }}
      />
      <div className="relative w-full max-w-md bg-[var(--color-ep-input)] border-t border-[var(--color-ep-dark-red)]/40 rounded-t-2xl p-6 pb-8 space-y-5">
        {timer.mentalStep === "hidden" && (
          <>
            <div className="text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-ep-light)]/35 mb-1">
                Repos — {getSuggestedRest(0).label}
              </p>
              <p className="text-5xl font-black text-white tabular-nums">
                {formatTime(elapsed)}
              </p>
              <p className="text-xs text-[var(--color-ep-light)]/35 mt-1">
                Suggéré : {formatTime(timer.suggestedSeconds)}
              </p>
            </div>
            <div className="h-2 bg-[var(--color-ep-dark-red)]/15 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${pct}%`,
                  backgroundColor: pct >= 100 ? "#4ade80" : "var(--color-ep-red)",
                }}
              />
            </div>
            <button
              onClick={() => onUpdate({ mentalStep: "checking" })}
              className="w-full text-[10px] font-bold uppercase tracking-widest text-[var(--color-ep-light)]/30 hover:text-[var(--color-ep-light)]/60 py-2 transition-colors"
            >
              Vérifier ma préparation →
            </button>
          </>
        )}

        {(timer.mentalStep === "checking" || timer.mentalStep === "no_wait") && (
          <>
            <div className="flex items-center gap-2">
              <Brain size={16} className="text-[var(--color-ep-red)]" />
              <p className="text-sm font-black uppercase tracking-widest text-white">
                Es-tu prêt ?
              </p>
              <span className="ml-auto text-sm font-black text-white tabular-nums">
                {formatTime(elapsed)}
              </span>
            </div>

            <div className="space-y-3">
              {/* Physical */}
              <div className="bg-[var(--color-ep-card)] border border-[var(--color-ep-dark-red)]/25 rounded-xl p-4">
                <p className="text-xs font-semibold text-[var(--color-ep-light)]/70 mb-3">
                  💪 Physiquement — Tes muscles ont récupéré ?
                </p>
                <div className="flex gap-2">
                  {[true, false].map((v) => (
                    <button
                      key={String(v)}
                      onClick={() => onUpdate({ mentalPhysical: v })}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors ${
                        timer.mentalPhysical === v
                          ? v
                            ? "bg-green-500/20 text-green-400 border border-green-500/30"
                            : "bg-red-500/20 text-red-400 border border-red-500/30"
                          : "bg-[var(--color-ep-dark-red)]/10 text-[var(--color-ep-light)]/40 border border-[var(--color-ep-dark-red)]/20 hover:border-[var(--color-ep-dark-red)]/40"
                      }`}
                    >
                      {v ? "Oui" : "Non"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mental */}
              <div className="bg-[var(--color-ep-card)] border border-[var(--color-ep-dark-red)]/25 rounded-xl p-4">
                <p className="text-xs font-semibold text-[var(--color-ep-light)]/70 mb-3">
                  🧠 Mentalement — Tu es concentré et prêt à exploser ce set ?
                </p>
                <div className="flex gap-2">
                  {[true, false].map((v) => (
                    <button
                      key={String(v)}
                      onClick={() => {
                        onUpdate({ mentalMental: v });
                        if (!v) onUpdate({ mentalStep: "no_wait", noWaitStartedAt: Date.now() });
                      }}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors ${
                        timer.mentalMental === v
                          ? v
                            ? "bg-green-500/20 text-green-400 border border-green-500/30"
                            : "bg-red-500/20 text-red-400 border border-red-500/30"
                          : "bg-[var(--color-ep-dark-red)]/10 text-[var(--color-ep-light)]/40 border border-[var(--color-ep-dark-red)]/20 hover:border-[var(--color-ep-dark-red)]/40"
                      }`}
                    >
                      {v ? "Oui" : "Non"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {both && (
              <button
                onClick={() => onClose(elapsed)}
                className="w-full py-3.5 rounded-xl bg-[var(--color-ep-red)] hover:bg-[var(--color-ep-med-red)] text-white text-sm font-black uppercase tracking-widest transition-colors"
              >
                C&apos;est parti 🔥
              </button>
            )}

            {timer.mentalStep === "no_wait" && anyNo && (
              <div className="text-center space-y-3">
                <p className="text-xs text-[var(--color-ep-light)]/50 leading-relaxed">
                  Prends encore 30-60 secondes. La qualité du set dépend de ta
                  préparation.
                </p>
                {noWaitElapsed >= 30 && (
                  <button
                    onClick={() => onClose(elapsed)}
                    className="w-full py-3 rounded-xl border border-[var(--color-ep-dark-red)]/40 hover:border-[var(--color-ep-dark-red)]/70 text-sm font-bold text-[var(--color-ep-light)]/70 transition-colors"
                  >
                    Je suis prêt maintenant
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Session Step ──────────────────────────────────────────────────────────────

function SetRow({
  set,
  exercise,
  prevWeight,
  prThreshold,
  sessionId,
  onChange,
  onValidate,
}: {
  set: SetState;
  exercise: Exercise;
  prevWeight: PrevWeight | null;
  prThreshold: number | null;
  sessionId: string;
  onChange: (patch: Partial<SetState>) => void;
  onValidate: () => void;
}) {
  const weight = parseFloat(set.weightKg) || 0;
  const isPRCandidate =
    prThreshold != null && weight > prThreshold && weight > 0;
  const [uploadingVideo, setUploadingVideo] = useState(false);

  async function handleVideoSelect(file: File) {
    if (!set.dbId) return;
    setUploadingVideo(true);
    try {
      const supabase = createClientSupabase();
      const ext = file.name.split(".").pop() || "mp4";
      const path = `${sessionId}/${set.dbId}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("set-videos")
        .upload(path, file, { contentType: file.type || "video/mp4", upsert: false });
      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from("session_sets")
        .update({ video_url: path })
        .eq("id", set.dbId);
      if (updateError) throw updateError;

      onChange({ hasVideo: true });
    } catch (e) {
      console.error("Video upload failed:", e);
      alert("Échec de l'envoi de la vidéo. Réessaie.");
    }
    setUploadingVideo(false);
  }

  return (
    <div
      className={`relative rounded-xl border p-3 transition-all ${
        set.validated
          ? "bg-[#0a1a0a] border-green-500/20"
          : "bg-[var(--color-ep-card)] border-[var(--color-ep-dark-red)]/20"
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-ep-light)]/30 w-12">
          Set {set.setNumber}
        </span>
        {set.validated && (
          <CheckCircle2 size={12} className="text-green-400" />
        )}
        {(set.isPR || isPRCandidate) && (
          <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">
            🏆 PR !
          </span>
        )}
      </div>

      {set.validated ? (
        <div className="space-y-2">
          <div className="flex gap-4 text-sm font-black text-white">
            <span>
              {set.weightKg || "—"}
              <span className="text-[10px] font-normal text-[var(--color-ep-light)]/40 ml-0.5">
                kg
              </span>
            </span>
            <span>
              {set.repsActual || "—"}
              <span className="text-[10px] font-normal text-[var(--color-ep-light)]/40 ml-0.5">
                reps
              </span>
            </span>
            <span>
              RIR{" "}
              <span className="text-[var(--color-ep-red)]">{set.rirActual || "—"}</span>
            </span>
            {set.standardizationScore && (
              <span className="text-[10px] text-[var(--color-ep-light)]/40">
                ★{set.standardizationScore}
              </span>
            )}
          </div>

          {set.hasVideo ? (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-green-400">
              <Video size={11} /> Vidéo envoyée à ton coach
            </span>
          ) : (
            <label className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--color-ep-light)]/40 hover:text-[var(--color-ep-light)]/70 border border-dashed border-[var(--color-ep-dark-red)]/25 hover:border-[var(--color-ep-dark-red)]/50 rounded-lg px-2.5 py-1.5 cursor-pointer transition-colors">
              {uploadingVideo ? (
                <>
                  <Loader2 size={11} className="animate-spin" /> Envoi…
                </>
              ) : (
                <>
                  <Video size={11} /> Filmer ce set
                </>
              )}
              <input
                type="file"
                accept="video/*"
                capture="environment"
                className="hidden"
                disabled={uploadingVideo}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleVideoSelect(file);
                  e.target.value = "";
                }}
              />
            </label>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {/* Weight + Reps row */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[8px] text-[var(--color-ep-light)]/30 uppercase tracking-wider">
                Poids (kg)
              </label>
              <input
                type="number"
                inputMode="decimal"
                placeholder={
                  prevWeight?.weight != null
                    ? `${prevWeight.weight} kg`
                    : "0"
                }
                value={set.weightKg}
                onChange={(e) => onChange({ weightKg: e.target.value })}
                className="w-full bg-[var(--color-ep-input)] border border-[var(--color-ep-dark-red)]/30 rounded-lg px-2.5 py-2 text-sm font-bold text-white placeholder:text-[var(--color-ep-light)]/20 focus:outline-none focus:border-[var(--color-ep-red)]/50"
              />
            </div>
            <div className="flex-1">
              <label className="text-[8px] text-[var(--color-ep-light)]/30 uppercase tracking-wider">
                Reps
              </label>
              <input
                type="number"
                inputMode="numeric"
                placeholder={
                  exercise.reps ??
                  (prevWeight?.reps != null ? prevWeight.reps : "0")
                }
                value={set.repsActual}
                onChange={(e) => onChange({ repsActual: e.target.value })}
                className="w-full bg-[var(--color-ep-input)] border border-[var(--color-ep-dark-red)]/30 rounded-lg px-2.5 py-2 text-sm font-bold text-white placeholder:text-[var(--color-ep-light)]/20 focus:outline-none focus:border-[var(--color-ep-red)]/50"
              />
            </div>
          </div>

          {/* RIR + Score row */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[8px] text-[var(--color-ep-light)]/30 uppercase tracking-wider">
                RIR réel
              </label>
              <select
                value={set.rirActual}
                onChange={(e) => onChange({ rirActual: e.target.value })}
                className="w-full bg-[var(--color-ep-input)] border border-[var(--color-ep-dark-red)]/30 rounded-lg px-2.5 py-2 text-sm font-bold text-white focus:outline-none focus:border-[var(--color-ep-red)]/50"
              >
                <option value="">—</option>
                {[0, 1, 2, 3, 4, 5].map((v) => (
                  <option key={v} value={v}>
                    RIR {v}
                    {v === 0 ? " (échec)" : v >= 4 ? " (facile)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-[8px] text-[var(--color-ep-light)]/30 uppercase tracking-wider">
                Exécution
              </label>
              <select
                value={set.standardizationScore}
                onChange={(e) =>
                  onChange({ standardizationScore: e.target.value })
                }
                className="w-full bg-[var(--color-ep-input)] border border-[var(--color-ep-dark-red)]/30 rounded-lg px-2.5 py-2 text-sm font-bold text-white focus:outline-none focus:border-[var(--color-ep-red)]/50"
              >
                <option value="">—</option>
                {[1, 2, 3, 4, 5].map((v) => (
                  <option key={v} value={v}>
                    {v} — {STANDARDIZATION_LABELS[String(v)]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Validate button */}
          <button
            onClick={onValidate}
            className="w-full py-2.5 bg-[var(--color-ep-red)] hover:bg-[var(--color-ep-med-red)] text-white text-xs font-black uppercase tracking-widest rounded-lg transition-colors"
          >
            ✓ Valider le set
          </button>
        </div>
      )}
    </div>
  );
}

function AddExerciseForm({
  onAdd,
}: {
  onAdd: (input: { name: string; muscleGroup: string | null }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [muscleGroup, setMuscleGroup] = useState("");

  function submit() {
    if (!name.trim()) return;
    onAdd({ name: name.trim(), muscleGroup: muscleGroup || null });
    setName("");
    setMuscleGroup("");
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 border border-dashed border-[var(--color-ep-dark-red)]/30 hover:border-[var(--color-ep-dark-red)]/60 rounded-xl px-4 py-3.5 text-sm text-[var(--color-ep-light)]/40 hover:text-[var(--color-ep-light)]/70 transition-colors"
      >
        <Plus size={15} strokeWidth={2} />
        Ajouter un exercice
      </button>
    );
  }

  return (
    <div className="bg-[var(--color-ep-card)] border border-[var(--color-ep-dark-red)]/30 rounded-xl p-4 space-y-3">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="Nom de l'exercice (ex. Développé couché)"
        className="w-full bg-[var(--color-ep-input)] border border-[var(--color-ep-dark-red)]/30 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-[var(--color-ep-light)]/25 focus:outline-none focus:border-[var(--color-ep-red)]/50"
      />
      <select
        value={muscleGroup}
        onChange={(e) => setMuscleGroup(e.target.value)}
        className="w-full bg-[var(--color-ep-input)] border border-[var(--color-ep-dark-red)]/30 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--color-ep-red)]/50"
      >
        <option value="">Groupe musculaire (optionnel)</option>
        {MUSCLE_GROUPS.map((g) => (
          <option key={g} value={g}>
            {g}
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={!name.trim()}
          className="flex-1 bg-[var(--color-ep-red)] hover:bg-[var(--color-ep-med-red)] disabled:opacity-40 text-white text-xs font-bold uppercase tracking-widest px-4 py-2.5 rounded-lg transition-colors"
        >
          Ajouter
        </button>
        <button
          onClick={() => {
            setOpen(false);
            setName("");
            setMuscleGroup("");
          }}
          className="text-xs text-[var(--color-ep-light)]/40 hover:text-[var(--color-ep-light)]/70 px-4 transition-colors"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}

function ExerciseCard({
  exState,
  prevWeight,
  prThreshold,
  sessionId,
  onUpdate,
  onValidateSet,
}: {
  exState: ExerciseState;
  prevWeight: PrevWeight | null;
  prThreshold: number | null;
  sessionId: string;
  onUpdate: (patch: Partial<ExerciseState>) => void;
  onValidateSet: (setIdx: number) => void;
}) {
  const tips = getTips(exState.exercise.name);

  return (
    <div className="bg-[var(--color-ep-card)] border border-[var(--color-ep-dark-red)]/25 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3.5 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-black text-white">
            {exState.exercise.name}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            {exState.exercise.muscle_group && (
              <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--color-ep-dark-red)]/15 text-[var(--color-ep-light)]/40 border border-[var(--color-ep-dark-red)]/20">
                {exState.exercise.muscle_group}
              </span>
            )}
            {exState.exercise.sets && (
              <span className="text-[9px] text-[var(--color-ep-light)]/30">
                {exState.exercise.sets} séries
                {exState.exercise.reps && ` × ${exState.exercise.reps} reps`}
                {exState.exercise.rir != null &&
                  ` · RIR ${exState.exercise.rir}`}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => onUpdate({ showTips: !exState.showTips })}
            className={`p-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border transition-colors ${
              exState.showTips
                ? "bg-[var(--color-ep-red)]/15 text-[var(--color-ep-red)] border-[var(--color-ep-red)]/25"
                : "text-[var(--color-ep-light)]/30 border-[var(--color-ep-dark-red)]/20 hover:border-[var(--color-ep-dark-red)]/40"
            }`}
            title="Tips d'exécution"
          >
            💡
          </button>
          <button
            onClick={() => onUpdate({ showHistory: !exState.showHistory })}
            className={`p-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border transition-colors ${
              exState.showHistory
                ? "bg-blue-500/15 text-blue-400 border-blue-500/25"
                : "text-[var(--color-ep-light)]/30 border-[var(--color-ep-dark-red)]/20 hover:border-[var(--color-ep-dark-red)]/40"
            }`}
            title="Historique"
          >
            <BarChart2 size={12} />
          </button>
        </div>
      </div>

      {/* Tips panel */}
      {exState.showTips && (
        <div className="border-t border-[var(--color-ep-dark-red)]/20 bg-[var(--color-ep-card)] px-4 py-3">
          <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-ep-light)]/35 mb-2">
            Cues d&apos;exécution
          </p>
          <ul className="space-y-1.5">
            {tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-[var(--color-ep-red)] font-black text-xs mt-0 leading-[1.4]">
                  {i + 1}.
                </span>
                <span className="text-xs text-[var(--color-ep-light)]/65 leading-relaxed">
                  {tip}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* History hint (real data fetched in coach logbook, here we show prev weight) */}
      {exState.showHistory && prevWeight && (
        <div className="border-t border-[var(--color-ep-dark-red)]/20 bg-[var(--color-ep-card)] px-4 py-3">
          <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-ep-light)]/35 mb-2">
            Dernière session
          </p>
          <div className="flex gap-4 text-sm font-black text-white">
            {prevWeight.weight != null && (
              <span>
                {prevWeight.weight}
                <span className="text-[10px] font-normal text-[var(--color-ep-light)]/40 ml-0.5">
                  kg
                </span>
              </span>
            )}
            {prevWeight.reps != null && (
              <span>
                {prevWeight.reps}
                <span className="text-[10px] font-normal text-[var(--color-ep-light)]/40 ml-0.5">
                  reps
                </span>
              </span>
            )}
            {prevWeight.rir != null && (
              <span>
                RIR{" "}
                <span className="text-[var(--color-ep-red)]">{prevWeight.rir}</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Sets */}
      <div className="px-3 pb-3 pt-2 space-y-2">
        {exState.sets.map((set, idx) => (
          <SetRow
            key={set.localId}
            set={set}
            exercise={exState.exercise}
            prevWeight={prevWeight}
            prThreshold={prThreshold}
            sessionId={sessionId}
            onChange={(patch) => {
              const newSets = [...exState.sets];
              newSets[idx] = { ...newSets[idx], ...patch };
              onUpdate({ sets: newSets });
            }}
            onValidate={() => onValidateSet(idx)}
          />
        ))}

        {/* Add set */}
        <button
          onClick={() => {
            const newSets = [
              ...exState.sets,
              {
                localId: newLocalId(),
                setNumber: exState.sets.length + 1,
                weightKg: "",
                repsActual: "",
                rirActual: "",
                standardizationScore: "",
                validated: false,
                isPR: false,
                dbId: null,
                restDuration: null,
                hasVideo: false,
              },
            ];
            onUpdate({ sets: newSets });
          }}
          className="w-full flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-ep-light)]/30 hover:text-[var(--color-ep-light)]/60 border border-dashed border-[var(--color-ep-dark-red)]/20 hover:border-[var(--color-ep-dark-red)]/40 rounded-lg transition-colors"
        >
          <Plus size={11} />
          Ajouter un set
        </button>
      </div>
    </div>
  );
}

// ── Recap Step ────────────────────────────────────────────────────────────────

function SliderInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-ep-light)]/35">
          {label}
        </label>
        <span className="text-sm font-black text-[var(--color-ep-red)]">{value}/5</span>
      </div>
      <input
        type="range"
        min={1}
        max={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--color-ep-red)]"
      />
      <div className="flex justify-between text-[8px] text-[var(--color-ep-light)]/25">
        <span>Faible</span>
        <span>Excellent</span>
      </div>
    </div>
  );
}

// ── Main SessionView ──────────────────────────────────────────────────────────

export default function SessionView({
  sessionId,
  returnPath = "/dashboard/client/logbook",
}: {
  sessionId: string;
  returnPath?: string;
}) {
  const router = useRouter();

  // Init state
  const [loading, setLoading] = useState(true);
  const [initData, setInitData] = useState<InitData | null>(null);

  // Session state
  const [step, setStep] = useState<Step>("warmup");
  const [sessionElapsed, setSessionElapsed] = useState(0);
  const sessionStartRef = useRef<number>(Date.now());
  const sessionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Exercise state
  const [exercises, setExercises] = useState<ExerciseState[]>([]);

  // Rest timer
  const [restTimer, setRestTimer] = useState<RestTimer | null>(null);

  // Recap state
  const [feeling, setFeeling] = useState(3);
  const [energy, setEnergy] = useState(3);
  const [pump, setPump] = useState(3);
  const [sessionNotes, setSessionNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Fetch initial data
  useEffect(() => {
    fetch(`/api/client/sessions/${sessionId}`)
      .then((r) => r.json())
      .then((data: InitData) => {
        setInitData(data);
        const exStates = buildExerciseState(data.exercises, data.existingSets);
        setExercises(exStates);

        // Determine starting step
        if (data.session.is_completed) {
          setStep("recap");
        } else if (data.session.warmup_validated) {
          setStep("session");
          sessionStartRef.current = Date.now();
        }

        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [sessionId]);

  // Session timer
  useEffect(() => {
    if (step === "session") {
      sessionTimerRef.current = setInterval(
        () =>
          setSessionElapsed(
            Math.floor((Date.now() - sessionStartRef.current) / 1000)
          ),
        1000
      );
    }
    return () => {
      if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
    };
  }, [step]);

  const handleWarmupValidate = useCallback(
    (seconds: number) => {
      // Move to the workout immediately — warmup_validated is just metadata
      // for "resume where I left off" on reload, it must never block the
      // transition if the network is slow/flaky.
      sessionStartRef.current = Date.now();
      setStep("session");

      const patchWarmup = () =>
        fetch(`/api/client/sessions/${sessionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            warmup_validated: true,
            warmup_duration_seconds: seconds,
          }),
        });

      patchWarmup().catch(() => {
        // one silent retry — best effort, doesn't affect the UI either way
        patchWarmup().catch(() => {});
      });
    },
    [sessionId]
  );

  const handleValidateSet = useCallback(
    async (exIdx: number, setIdx: number) => {
      const exState = exercises[exIdx];
      const set = exState.sets[setIdx];
      const ex = exState.exercise;
      const prevWeight =
        initData?.prevWeights[ex.name.toLowerCase()] ?? null;

      const weight = parseFloat(set.weightKg) || null;
      const prThreshold =
        initData?.prMap[ex.name.toLowerCase()] ?? null;
      const isPR = weight != null && prThreshold != null && weight > prThreshold;

      // Insert set in DB
      let dbId: string | null = null;
      try {
        const res = await fetch(`/api/client/sessions/${sessionId}/sets`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            // Locally-added exercises (free sessions) use a synthetic
            // "local-…" id with no matching row in the exercises table —
            // sending that as exercise_id would fail the uuid column check.
            exercise_id: ex.id && !ex.id.startsWith("local-") ? ex.id : null,
            exercise_name: ex.name,
            muscle_group: ex.muscle_group ?? null,
            set_number: set.setNumber,
            reps_target: ex.reps ?? null,
            reps_actual: set.repsActual ? parseInt(set.repsActual) : null,
            weight_kg: weight,
            previous_weight_kg: prevWeight?.weight ?? null,
            rir_target: ex.rir ?? null,
            rir_actual: set.rirActual ? parseInt(set.rirActual) : null,
            standardization_score: set.standardizationScore
              ? parseInt(set.standardizationScore)
              : null,
            is_pr: isPR,
          }),
        });
        const { id } = await res.json();
        dbId = id ?? null;
      } catch {
        // non-blocking
      }

      // Update local state
      setExercises((prev) => {
        const next = [...prev];
        const newSets = [...next[exIdx].sets];
        newSets[setIdx] = {
          ...newSets[setIdx],
          validated: true,
          isPR,
          dbId,
        };
        // Auto-add next empty set if this was the last
        const allValidated = newSets.every((s) => s.validated);
        if (allValidated) {
          newSets.push({
            localId: newLocalId(),
            setNumber: newSets.length + 1,
            weightKg: "",
            repsActual: "",
            rirActual: "",
            standardizationScore: "",
            validated: false,
            isPR: false,
            dbId: null,
            restDuration: null,
            hasVideo: false,
          });
        }
        next[exIdx] = { ...next[exIdx], sets: newSets };
        return next;
      });

      // Start rest timer
      const rir = set.rirActual ? parseInt(set.rirActual) : 2;
      const suggested = getSuggestedRest(rir);
      setRestTimer({
        visible: true,
        startedAt: Date.now(),
        suggestedSeconds: suggested.seconds,
        mentalStep: "hidden",
        mentalPhysical: null,
        mentalMental: null,
        noWaitStartedAt: null,
        exerciseIdx: exIdx,
        setIdx,
      });
    },
    [exercises, initData, sessionId]
  );

  const handleRestClose = useCallback((elapsed: number) => {
    setRestTimer((prev) => {
      if (!prev) return null;
      // Update rest duration on the validated set
      setExercises((exs) => {
        const next = [...exs];
        const newSets = [...next[prev.exerciseIdx].sets];
        if (newSets[prev.setIdx]) {
          newSets[prev.setIdx] = {
            ...newSets[prev.setIdx],
            restDuration: elapsed,
          };
        }
        next[prev.exerciseIdx] = { ...next[prev.exerciseIdx], sets: newSets };
        return next;
      });
      return null;
    });
  }, []);

  const handleAddExercise = useCallback(
    (input: { name: string; muscleGroup: string | null }) => {
      const defaultSets = 3;
      const newExercise: Exercise = {
        id: `local-${newLocalId()}`,
        day_id: "",
        name: input.name,
        sets: defaultSets,
        reps: null,
        rir: null,
        rest_seconds: null,
        notes: null,
        position: exercises.length,
        muscle_group: input.muscleGroup,
        muscle_subgroup: null,
        is_direct: true,
      };
      const sets: SetState[] = Array.from({ length: defaultSets }, (_, i) => ({
        localId: newLocalId(),
        setNumber: i + 1,
        weightKg: "",
        repsActual: "",
        rirActual: "",
        standardizationScore: "",
        validated: false,
        isPR: false,
        dbId: null,
        restDuration: null,
        hasVideo: false,
      }));
      setExercises((prev) => [
        ...prev,
        { exercise: newExercise, sets, showTips: false, showHistory: false },
      ]);
    },
    [exercises.length]
  );

  // Compute volume per muscle group
  const volumeByMuscle: Record<string, number> = {};
  for (const ex of exercises) {
    const mg = ex.exercise.muscle_group;
    if (!mg) continue;
    const validated = ex.sets.filter((s) => s.validated).length;
    if (validated > 0) {
      volumeByMuscle[mg] = (volumeByMuscle[mg] ?? 0) + validated;
    }
  }

  // Average RIR of all validated sets
  const validatedSets = exercises.flatMap((ex) =>
    ex.sets.filter((s) => s.validated && s.rirActual !== "")
  );
  const avgRIR =
    validatedSets.length > 0
      ? validatedSets.reduce((s, v) => s + parseInt(v.rirActual || "0"), 0) /
        validatedSets.length
      : null;

  // PRs from this session
  const sessionPRs = exercises.flatMap((ex) =>
    ex.sets
      .filter((s) => s.isPR && s.validated)
      .map((s) => ({
        exerciseName: ex.exercise.name,
        weightKg: parseFloat(s.weightKg),
        reps: s.repsActual ? parseInt(s.repsActual) : null,
      }))
  );

  const handleCompleteSession = useCallback(async () => {
    setSaving(true);
    try {
      // Build workout data summary (one entry per exercise)
      const workoutData = exercises.map((ex) => {
        const validated = ex.sets.filter((s) => s.validated);
        const validatedWithRIR = validated.filter((s) => s.rirActual !== "");
        const avgRirEx =
          validatedWithRIR.length > 0
            ? validatedWithRIR.reduce(
                (s, v) => s + parseInt(v.rirActual || "0"),
                0
              ) / validatedWithRIR.length
            : null;
        const maxWeight = validated
          .map((s) => parseFloat(s.weightKg) || 0)
          .reduce((a, b) => Math.max(a, b), 0);

        return {
          exerciseName: ex.exercise.name,
          muscleGroup: ex.exercise.muscle_group ?? "",
          isDirect: ex.exercise.is_direct ?? true,
          setsCompleted: validated.length,
          rirActual: avgRirEx != null ? Math.round(avgRirEx) : null,
          weightKg: maxWeight > 0 ? maxWeight : null,
        };
      });

      await fetch(`/api/client/sessions/${sessionId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          duration_minutes: Math.round(sessionElapsed / 60),
          general_feeling: feeling,
          energy_level: energy,
          pump,
          notes: sessionNotes,
          prs: sessionPRs,
          workoutData,
        }),
      });

      router.push(returnPath);
    } catch {
      setSaving(false);
    }
  }, [
    exercises,
    sessionId,
    sessionElapsed,
    feeling,
    energy,
    pump,
    sessionNotes,
    sessionPRs,
    router,
    returnPath,
  ]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[var(--color-ep-red)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!initData) {
    return (
      <div className="px-6 py-8 text-center">
        <p className="text-[var(--color-ep-light)]/40">Séance introuvable</p>
      </div>
    );
  }

  const { session } = initData;
  const muscleGroups = session.muscle_groups ?? [];

  // ── WARMUP ──────────────────────────────────────────────────────────────────
  if (step === "warmup") {
    return (
      <WarmupStep
        dayLabel={session.day_label}
        muscleGroups={muscleGroups}
        onValidate={handleWarmupValidate}
      />
    );
  }

  // ── RECAP ────────────────────────────────────────────────────────────────────
  if (step === "recap") {
    const totalSetsCompleted = exercises.flatMap((e) =>
      e.sets.filter((s) => s.validated)
    ).length;
    const avgScore =
      exercises
        .flatMap((e) => e.sets.filter((s) => s.validated && s.standardizationScore))
        .reduce(
          (acc, s, _, arr) =>
            acc + parseInt(s.standardizationScore) / arr.length,
          0
        ) || 0;

    const volumeData = Object.entries(volumeByMuscle).map(([mg, sets]) => {
      const lm = VOLUME_LANDMARKS[mg] ?? { mev: 8, mav: 16, mrv: 22 };
      return { name: mg.slice(0, 5), sets, mev: lm.mev, mav: lm.mav };
    });

    const rirData = exercises
      .filter((ex) => ex.sets.some((s) => s.validated && s.rirActual))
      .map((ex) => {
        const valid = ex.sets.filter((s) => s.validated && s.rirActual);
        const avg =
          valid.reduce((s, v) => s + parseInt(v.rirActual), 0) / valid.length;
        return { name: ex.exercise.name.slice(0, 8), rir: Math.round(avg * 10) / 10 };
      });

    const scoreData = exercises
      .filter((ex) => ex.sets.some((s) => s.validated && s.standardizationScore))
      .map((ex) => {
        const valid = ex.sets.filter((s) => s.validated && s.standardizationScore);
        const avg =
          valid.reduce((s, v) => s + parseInt(v.standardizationScore), 0) /
          valid.length;
        return { name: ex.exercise.name.slice(0, 8), score: Math.round(avg * 10) / 10 };
      });

    return (
      <div className="px-6 py-8 max-w-2xl mx-auto pb-24">
        {/* Header */}
        <div className="mb-6">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-ep-light)]/35 mb-1">
            Récap de séance
          </p>
          <h1 className="text-2xl font-black uppercase">{session.day_label}</h1>
          <p className="text-xs text-[var(--color-ep-light)]/35 mt-1">
            {new Intl.DateTimeFormat("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            }).format(new Date())}
            {" · "}
            {formatTime(sessionElapsed)} de séance
          </p>
        </div>

        {/* Stats summary */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          {[
            { label: "Sets", value: String(totalSetsCompleted), icon: Dumbbell, color: "var(--color-ep-red)" },
            { label: "RIR moy.", value: avgRIR != null ? String(Math.round(avgRIR * 10) / 10) : "—", icon: Activity, color: "#4ade80" },
            { label: "Score tech.", value: avgScore > 0 ? `${Math.round(avgScore * 10) / 10}/5` : "—", icon: Star, color: "#fbbf24" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div
              key={label}
              className="bg-[var(--color-ep-card)] border border-[var(--color-ep-dark-red)]/25 rounded-xl p-3 flex flex-col items-center gap-1.5"
            >
              <Icon size={16} style={{ color }} strokeWidth={1.8} />
              <p className="text-xl font-black text-white">{value}</p>
              <p className="text-[9px] font-semibold uppercase tracking-widest text-[var(--color-ep-light)]/35">
                {label}
              </p>
            </div>
          ))}
        </div>

        {/* PRs */}
        {sessionPRs.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Trophy size={14} className="text-amber-400" />
              <p className="text-xs font-black uppercase tracking-widest text-amber-400">
                {sessionPRs.length} nouveau{sessionPRs.length > 1 ? "x" : ""} PR
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {sessionPRs.map((pr, i) => (
                <span
                  key={i}
                  className="text-xs font-bold text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20"
                >
                  {pr.exerciseName} — {pr.weightKg} kg
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Feeling sliders */}
        <div className="bg-[var(--color-ep-card)] border border-[var(--color-ep-dark-red)]/25 rounded-xl p-5 mb-5 space-y-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-ep-light)]/35">
            Ressenti global
          </p>
          {!session.is_completed && (
            <>
              <SliderInput label="Énergie générale" value={energy} onChange={setEnergy} />
              <SliderInput label="Pump" value={pump} onChange={setPump} />
              <SliderInput label="Feeling global" value={feeling} onChange={setFeeling} />
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-ep-light)]/35 block mb-1.5">
                  Notes libres
                </label>
                <textarea
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  placeholder="Observations, fatigue particulière, douleurs..."
                  rows={3}
                  className="w-full bg-[var(--color-ep-input)] border border-[var(--color-ep-dark-red)]/30 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-[var(--color-ep-light)]/20 focus:outline-none focus:border-[var(--color-ep-red)]/50 resize-none"
                />
              </div>
            </>
          )}
          {session.is_completed && (
            <div className="flex gap-4">
              <div className="text-center">
                <p className="text-2xl font-black text-white">{session.energy_level ?? "—"}</p>
                <p className="text-[9px] text-[var(--color-ep-light)]/30 uppercase tracking-wider">Énergie</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-white">{session.pump ?? "—"}</p>
                <p className="text-[9px] text-[var(--color-ep-light)]/30 uppercase tracking-wider">Pump</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-white">{session.general_feeling ?? "—"}</p>
                <p className="text-[9px] text-[var(--color-ep-light)]/30 uppercase tracking-wider">Feeling</p>
              </div>
            </div>
          )}
        </div>

        {/* Charts */}
        {volumeData.length > 0 && (
          <div className="bg-[var(--color-ep-card)] border border-[var(--color-ep-dark-red)]/25 rounded-xl p-5 mb-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-ep-light)]/35 mb-4">
              Volume par muscle (sets)
            </p>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={volumeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(var(--color-ep-dark-red-rgb),0.15)" />
                  <XAxis dataKey="name" tick={TICK_STYLE} axisLine={false} tickLine={false} />
                  <YAxis tick={TICK_STYLE} axisLine={false} tickLine={false} />
                  <Tooltip {...TOOLTIP_STYLE} formatter={(v, name) => [`${v}`, name === "sets" ? "Sets" : "MEV"]} />
                  <Bar dataKey="sets" radius={[3, 3, 0, 0]}>
                    {volumeData.map((entry, i) => {
                      const lm = VOLUME_LANDMARKS[
                        Object.keys(volumeByMuscle)[i]
                      ] ?? { mev: 8, mav: 16, mrv: 22 };
                      const sets = entry.sets;
                      const color =
                        sets < lm.mev ? "#ef4444" : sets <= lm.mav ? "#4ade80" : "#fbbf24";
                      return <Cell key={i} fill={color} />;
                    })}
                  </Bar>
                  <Bar dataKey="mev" fill="rgba(var(--color-ep-dark-red-rgb),0.2)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {rirData.length > 0 && (
          <div className="bg-[var(--color-ep-card)] border border-[var(--color-ep-dark-red)]/25 rounded-xl p-5 mb-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-ep-light)]/35 mb-4">
              RIR moyen par exercice
            </p>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rirData} layout="vertical">
                  <XAxis type="number" domain={[0, 5]} tick={TICK_STYLE} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" tick={TICK_STYLE} axisLine={false} tickLine={false} width={55} />
                  <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`RIR ${v}`, ""]} />
                  <Bar dataKey="rir" fill="#4ade80" radius={[0, 3, 3, 0]}>
                    {rirData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={
                          entry.rir <= 1 ? "#ef4444" : entry.rir <= 3 ? "#4ade80" : "#60a5fa"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {scoreData.length > 0 && (
          <div className="bg-[var(--color-ep-card)] border border-[var(--color-ep-dark-red)]/25 rounded-xl p-5 mb-6">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-ep-light)]/35 mb-4">
              Score standardisation par exercice
            </p>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scoreData} layout="vertical">
                  <XAxis type="number" domain={[0, 5]} tick={TICK_STYLE} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" tick={TICK_STYLE} axisLine={false} tickLine={false} width={55} />
                  <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v}/5`, "Score"]} />
                  <Bar dataKey="score" radius={[0, 3, 3, 0]}>
                    {scoreData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={
                          entry.score < 3 ? "#ef4444" : entry.score < 4 ? "#fbbf24" : "#4ade80"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Save button */}
        {!session.is_completed && (
          <button
            onClick={handleCompleteSession}
            disabled={saving}
            className="w-full py-4 bg-[var(--color-ep-red)] hover:bg-[var(--color-ep-med-red)] text-white text-sm font-black uppercase tracking-widest rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <CheckCircle2 size={16} />
                Valider et sauvegarder la séance
              </>
            )}
          </button>
        )}
      </div>
    );
  }

  // ── SESSION ──────────────────────────────────────────────────────────────────
  const totalSetsAll = exercises.flatMap((e) => e.sets.filter((s) => s.validated)).length;
  const musclesBeingTrained = Object.keys(volumeByMuscle);

  return (
    <div className="pb-32">
      {/* Fixed header */}
      <div className="sticky top-0 z-30 bg-[var(--color-ep-input)] border-b border-[var(--color-ep-dark-red)]/30 px-4 py-3">
        <div className="max-w-2xl mx-auto">
          {/* Top row: session timer + day label */}
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-ep-light)]/35">
                {session.day_label}
              </p>
              <div className="flex items-center gap-1.5">
                <Clock size={12} className="text-[var(--color-ep-red)]" />
                <span className="text-lg font-black text-white tabular-nums">
                  {formatTime(sessionElapsed)}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[9px] text-[var(--color-ep-light)]/35 uppercase tracking-wider">
                {totalSetsAll} sets validés
              </p>
              {avgRIR != null && (
                <p className="text-[9px] text-[var(--color-ep-light)]/35">
                  RIR moy.{" "}
                  <span className="font-black text-white">
                    {Math.round(avgRIR * 10) / 10}
                  </span>
                </p>
              )}
            </div>
          </div>

          {/* Volume gauges */}
          {musclesBeingTrained.length > 0 && (
            <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${Math.min(musclesBeingTrained.length, 3)}, 1fr)` }}>
              {musclesBeingTrained.slice(0, 3).map((mg) => (
                <VolumeGauge key={mg} muscleGroup={mg} sets={volumeByMuscle[mg]} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Exercise cards */}
      <div className="px-4 pt-5 max-w-2xl mx-auto space-y-4">
        {exercises.length === 0 && (
          <div className="bg-[var(--color-ep-card)] border border-[var(--color-ep-dark-red)]/20 rounded-xl px-5 py-8 text-center">
            <p className="text-sm text-[var(--color-ep-light)]/40">
              Séance libre — ajoute tes exercices ci-dessous
            </p>
          </div>
        )}

        {exercises.map((exState, exIdx) => (
          <ExerciseCard
            key={exState.exercise.id}
            exState={exState}
            prevWeight={
              initData.prevWeights[exState.exercise.name.toLowerCase()] ?? null
            }
            prThreshold={
              initData.prMap[exState.exercise.name.toLowerCase()] ?? null
            }
            sessionId={sessionId}
            onUpdate={(patch) =>
              setExercises((prev) => {
                const next = [...prev];
                next[exIdx] = { ...next[exIdx], ...patch };
                return next;
              })
            }
            onValidateSet={(setIdx) => handleValidateSet(exIdx, setIdx)}
          />
        ))}

        <AddExerciseForm onAdd={handleAddExercise} />
      </div>

      {/* Terminate button (fixed bottom) */}
      <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+56px)] md:bottom-4 left-0 right-0 px-4 z-30">
        <div className="max-w-md mx-auto">
          <button
            onClick={() => setStep("recap")}
            className="w-full py-3.5 bg-[var(--color-ep-card)] border border-[var(--color-ep-dark-red)]/40 hover:border-[var(--color-ep-red)]/50 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-colors"
          >
            Terminer la séance →
          </button>
        </div>
      </div>

      {/* Rest timer overlay */}
      {restTimer && (
        <RestTimerOverlay
          timer={restTimer}
          onUpdate={(patch) => setRestTimer((prev) => prev ? { ...prev, ...patch } : null)}
          onClose={handleRestClose}
        />
      )}
    </div>
  );
}
