"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
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
  X,
  Pencil,
  StickyNote,
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
  EQUIPMENT_COLORS,
  detectWarmupTypes,
  combineWarmupRecommendations,
  type WarmupExercise,
} from "@/lib/warmup-data";
import ExercisePicker from "@/components/client/ExercisePicker";
import { createClientSupabase } from "@/lib/supabase-client";
import { getTips } from "@/lib/execution-tips";
import { VOLUME_LANDMARKS } from "@/lib/volume-data";
import type { Exercise } from "@/utils/programs";
import type { Session, SessionSet } from "@/utils/sessions";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PrevWeight {
  weight: number | null;
  reps: string | null;
  rir: number | null;
}

interface LibraryTip {
  instructions: string | null;
  video_url: string | null;
}

interface InitData {
  session: Session;
  exercises: Exercise[];
  prMap: Record<string, number>;
  prevWeights: Record<string, PrevWeight>;
  existingSets: SessionSet[];
  libraryByName: Record<string, LibraryTip>;
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
  showNotes: boolean;
  clientNotes: string;
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
    backgroundColor: "#1f0101",
    border: "1px solid rgba(137,4,4,0.4)",
    borderRadius: "8px",
    color: "#F5EDED",
    fontSize: "11px",
  },
  labelStyle: { color: "rgba(245,237,237,0.6)", fontSize: "10px" },
};

const TICK_STYLE = { fill: "rgba(245,237,237,0.35)", fontSize: 9 };

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
    // Sans ça, chaque bip (un par set validé, donc des dizaines par séance)
    // laissait son AudioContext ouvert indéfiniment — WebKit/iOS plafonne le
    // nombre de contextes audio simultanés, et les accumuler sur une longue
    // séance ajoute une pression mémoire inutile.
    osc.onended = () => { ctx.close().catch(() => {}); };
  } catch {
    // audio not available
  }
}

function newLocalId() {
  return Math.random().toString(36).slice(2);
}

// Les exercices ajoutés à la volée (bouton "Ajouter un exercice", séance
// libre) ne vivaient qu'en state React — un simple refresh de page les
// effaçait tant qu'aucun set n'avait été validé pour eux. Persistés ici,
// comme le timer de séance et d'échauffement.
function customExercisesKey(sessionId: string) {
  return `ep-custom-exercises-${sessionId}`;
}

function loadCustomExercises(sessionId: string): Exercise[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(customExercisesKey(sessionId));
    return raw ? (JSON.parse(raw) as Exercise[]) : [];
  } catch {
    return [];
  }
}

function saveCustomExercises(sessionId: string, list: Exercise[]) {
  try {
    localStorage.setItem(customExercisesKey(sessionId), JSON.stringify(list));
  } catch {}
}

// Notes libres du client sur un exercice (consignes, douleur, variante...) —
// distinctes des notes du coach déjà présentes sur l'exercice programmé.
function exerciseNotesKey(sessionId: string) {
  return `ep-exercise-notes-${sessionId}`;
}

function loadExerciseNotes(sessionId: string): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(exerciseNotesKey(sessionId));
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function saveExerciseNote(sessionId: string, exerciseName: string, note: string) {
  try {
    const all = loadExerciseNotes(sessionId);
    if (note) all[exerciseName] = note;
    else delete all[exerciseName];
    localStorage.setItem(exerciseNotesKey(sessionId), JSON.stringify(all));
  } catch {}
}

// Ordre d'affichage des exercices dans la séance — modifiable par le client
// (flèches haut/bas), persisté pour survivre à un refresh/retour sur la page.
function exerciseOrderKey(sessionId: string) {
  return `ep-exercise-order-${sessionId}`;
}

function loadExerciseOrder(sessionId: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(exerciseOrderKey(sessionId));
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveExerciseOrder(sessionId: string, order: string[]) {
  try {
    localStorage.setItem(exerciseOrderKey(sessionId), JSON.stringify(order));
  } catch {}
}

function applyExerciseOrder(exercises: Exercise[], order: string[]): Exercise[] {
  if (order.length === 0) return exercises;
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const ordered: Exercise[] = [];
  for (const id of order) {
    const ex = byId.get(id);
    if (ex) {
      ordered.push(ex);
      byId.delete(id);
    }
  }
  // Exercices non couverts par l'ordre sauvegardé (nouveaux ajouts) — à la suite.
  ordered.push(...byId.values());
  return ordered;
}

function buildExerciseState(
  exercises: Exercise[],
  existingSets: SessionSet[],
  clientNotes: Record<string, string>
): ExerciseState[] {
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
    // Fill remaining empty slots up to target — jamais au-delà : sinon
    // rouvrir la séance (retour depuis un autre onglet, refresh) rajoutait à
    // chaque fois un set vide supplémentaire que personne n'avait demandé.
    const existingCount = sets.length;
    for (let i = existingCount; i < targetSets; i++) {
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
    return {
      exercise: ex,
      sets,
      showTips: false,
      showHistory: false,
      showNotes: false,
      clientNotes: clientNotes[ex.name] ?? "",
    };
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
        <span className="text-[8px] text-[#F5EDED]/35 uppercase tracking-wider truncate max-w-[60px]">
          {muscleGroup}
        </span>
        <span className="text-[8px] font-black" style={{ color }}>
          {sets}/{lm.mev}
        </span>
      </div>
      <div className="h-1 bg-[#890404]/20 rounded-full overflow-hidden w-full">
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
  sessionId,
  dayLabel,
  muscleGroups,
  onValidate,
  onCancel,
}: {
  sessionId: string;
  dayLabel: string;
  muscleGroups: string[];
  onValidate: (seconds: number) => void;
  onCancel: () => void;
}) {
  // Le point de départ est persisté (comme le timer de séance) — sans ça,
  // changer d'onglet démonte ce composant et le décompte repart de zéro,
  // donnant l'impression que la séance vient d'être interrompue/annulée
  // alors que rien ne l'a été : seul le bouton "Terminer" doit y mettre fin.
  const storageKey = `ep-warmup-start-${sessionId}`;
  const warmupStartRef = useRef<number>((() => {
    if (typeof window === "undefined") return Date.now();
    const saved = localStorage.getItem(storageKey);
    if (saved) return parseInt(saved, 10);
    const now = Date.now();
    localStorage.setItem(storageKey, now.toString());
    return now;
  })());
  const [elapsed, setElapsed] = useState(() =>
    Math.floor((Date.now() - warmupStartRef.current) / 1000)
  );
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(
      () => setElapsed(Math.floor((Date.now() - warmupStartRef.current) / 1000)),
      1000
    );
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const suggested = combineWarmupRecommendations(detectWarmupTypes(dayLabel, muscleGroups));
  // Liste éditable — les exercices proposés sont des suggestions, pas une
  // liste imposée : on peut en retirer et ajouter les siens.
  const [exercises, setExercises] = useState<WarmupExercise[]>(suggested.exercises);
  const [customName, setCustomName] = useState("");

  function removeExercise(i: number) {
    setExercises((prev) => prev.filter((_, idx) => idx !== i));
  }

  function addCustomExercise() {
    if (!customName.trim()) return;
    setExercises((prev) => [...prev, { name: customName.trim(), sets: "", equipment: "libre" }]);
    setCustomName("");
  }

  const canValidate = elapsed >= 300; // 5 min
  const isOptimal = elapsed >= 300 && elapsed <= 900;
  const isLate = elapsed > 900;

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto pb-24">
      {/* Timer */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35">
            Échauffement : {dayLabel}
          </p>
          <div className="flex items-center gap-2">
            <Timer size={14} className="text-[#E01E1E]" />
            <span className="text-2xl font-black text-white tabular-nums">
              {formatTime(elapsed)}
            </span>
          </div>
        </div>

        {/* Progress bar 0 → 15 min */}
        <div className="h-2 bg-[#890404]/15 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.min((elapsed / 900) * 100, 100)}%`,
              backgroundColor: isOptimal ? "#4ade80" : isLate ? "#fbbf24" : "#E01E1E",
            }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[8px] text-[#F5EDED]/25">0 min</span>
          <span className="text-[8px] text-green-400">5 min ✓</span>
          <span className="text-[8px] text-[#F5EDED]/25">15 min</span>
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
        {suggested.articulations.map((a) => (
          <span
            key={a}
            className="text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-[#890404]/15 text-[#F5EDED]/50 border border-[#890404]/20"
          >
            {a}
          </span>
        ))}
      </div>

      {/* Tip */}
      <p className="text-xs text-[#F5EDED]/50 italic mb-5 leading-relaxed">
        💡 {suggested.tips}
      </p>

      {/* Exercises list — suggestions éditables : retire ce que tu ne veux
          pas, ajoute les tiens. */}
      <p className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/25 mb-2">
        Suggestions — modifie librement
      </p>
      <div className="space-y-2 mb-3">
        {exercises.map((ex, i) => (
          <div
            key={i}
            className="flex items-center gap-3 bg-[#1f0101] border border-[#890404]/20 rounded-xl px-4 py-3"
          >
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">{ex.name}</p>
              {ex.sets && <p className="text-[10px] text-[#F5EDED]/40">{ex.sets}</p>}
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
            <button
              onClick={() => removeExercise(i)}
              aria-label="Retirer"
              className="text-[#F5EDED]/25 hover:text-red-400 transition-colors flex-shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        ))}
        {exercises.length === 0 && (
          <p className="text-xs text-[#F5EDED]/25 italic text-center py-3">
            Aucun exercice — ajoute le tien ci-dessous.
          </p>
        )}
      </div>

      {/* Ajouter son propre exercice d'échauffement */}
      <div className="flex gap-2 mb-8">
        <input
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomExercise(); } }}
          placeholder="Ajouter ton propre exercice…"
          className="flex-1 bg-[#150000] border border-[#890404]/30 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-[#F5EDED]/20 focus:outline-none focus:border-[#E01E1E]/50"
        />
        <button
          onClick={addCustomExercise}
          disabled={!customName.trim()}
          className="px-4 rounded-lg bg-[#890404]/30 hover:bg-[#890404]/50 disabled:opacity-30 text-[#F5EDED]/70 transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Validate button */}
      <button
        onClick={() => canValidate && onValidate(elapsed)}
        disabled={!canValidate}
        className={`w-full py-4 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${
          canValidate
            ? "bg-[#E01E1E] hover:bg-[#B00202] text-white"
            : "bg-[#890404]/20 text-[#F5EDED]/20 cursor-not-allowed"
        }`}
      >
        {canValidate ? "Valider l'échauffement → Commencer" : `Encore ${formatTime(300 - elapsed)}`}
      </button>

      <button
        onClick={onCancel}
        className="w-full mt-3 py-2 text-[11px] font-bold uppercase tracking-widest text-[#F5EDED]/25 hover:text-red-400 transition-colors"
      >
        Annuler la séance
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
      <div
        className="relative w-full max-w-md bg-[#150000] border-t border-[#890404]/40 rounded-t-2xl p-6 space-y-5 overflow-y-auto"
        style={{ maxHeight: "88dvh", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 32px)" }}
      >
        {timer.mentalStep === "hidden" && (
          <>
            <div className="text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
                Repos : {getSuggestedRest(0).label}
              </p>
              <p className="text-5xl font-black text-white tabular-nums">
                {formatTime(elapsed)}
              </p>
              <p className="text-xs text-[#F5EDED]/35 mt-1">
                Suggéré : {formatTime(timer.suggestedSeconds)}
              </p>
            </div>
            <div className="h-2 bg-[#890404]/15 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${pct}%`,
                  backgroundColor: pct >= 100 ? "#4ade80" : "#E01E1E",
                }}
              />
            </div>
            <button
              onClick={() => onUpdate({ mentalStep: "checking" })}
              className="w-full text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/30 hover:text-[#F5EDED]/60 py-2 transition-colors"
            >
              Vérifier ma préparation →
            </button>
          </>
        )}

        {(timer.mentalStep === "checking" || timer.mentalStep === "no_wait") && (
          <>
            <div className="flex items-center gap-2">
              <Brain size={16} className="text-[#E01E1E]" />
              <p className="text-sm font-black uppercase tracking-widest text-white">
                Es-tu prêt ?
              </p>
              <span className="ml-auto text-sm font-black text-white tabular-nums">
                {formatTime(elapsed)}
              </span>
            </div>

            <div className="space-y-3">
              {/* Physical */}
              <div className="bg-[#1f0101] border border-[#890404]/25 rounded-xl p-4">
                <p className="text-xs font-semibold text-[#F5EDED]/70 mb-3">
                  💪 Physiquement, tes muscles ont récupéré ?
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
                          : "bg-[#890404]/10 text-[#F5EDED]/40 border border-[#890404]/20 hover:border-[#890404]/40"
                      }`}
                    >
                      {v ? "Oui" : "Non"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mental */}
              <div className="bg-[#1f0101] border border-[#890404]/25 rounded-xl p-4">
                <p className="text-xs font-semibold text-[#F5EDED]/70 mb-3">
                  🧠 Mentalement, tu es concentré et prêt à exploser ce set ?
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
                          : "bg-[#890404]/10 text-[#F5EDED]/40 border border-[#890404]/20 hover:border-[#890404]/40"
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
                className="w-full py-3.5 rounded-xl bg-[#E01E1E] hover:bg-[#B00202] text-white text-sm font-black uppercase tracking-widest transition-colors"
              >
                C&apos;est parti 🔥
              </button>
            )}

            {timer.mentalStep === "no_wait" && anyNo && (
              <div className="text-center space-y-3">
                <p className="text-xs text-[#F5EDED]/50 leading-relaxed">
                  Prends encore 30-60 secondes. La qualité du set dépend de ta
                  préparation.
                </p>
                {noWaitElapsed >= 30 && (
                  <button
                    onClick={() => onClose(elapsed)}
                    className="w-full py-3 rounded-xl border border-[#890404]/40 hover:border-[#890404]/70 text-sm font-bold text-[#F5EDED]/70 transition-colors"
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
  onRemove,
  onUnvalidate,
}: {
  set: SetState;
  exercise: Exercise;
  prevWeight: PrevWeight | null;
  prThreshold: number | null;
  sessionId: string;
  onChange: (patch: Partial<SetState>) => void;
  onValidate: () => void;
  onRemove: () => void;
  onUnvalidate: () => void;
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
          : "bg-[#1f0101] border-[#890404]/20"
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[9px] font-black uppercase tracking-widest text-[#F5EDED]/30 w-12">
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
        {set.validated ? (
          <button
            onClick={onUnvalidate}
            className="ml-auto flex items-center gap-1 p-1 rounded-md text-[#F5EDED]/25 hover:text-[#E01E1E] transition-colors"
            title="Modifier ce set"
          >
            <Pencil size={11} />
          </button>
        ) : (
          <button
            onClick={onRemove}
            className="ml-auto p-1 rounded-md text-[#F5EDED]/25 hover:text-red-400 transition-colors"
            title="Retirer ce set"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {set.validated ? (
        <div className="space-y-2">
          <div className="flex gap-4 text-sm font-black text-white">
            <span>
              {set.weightKg || "N/A"}
              <span className="text-[10px] font-normal text-[#F5EDED]/40 ml-0.5">
                kg
              </span>
            </span>
            <span>
              {set.repsActual || "N/A"}
              <span className="text-[10px] font-normal text-[#F5EDED]/40 ml-0.5">
                reps
              </span>
            </span>
            <span>
              RIR{" "}
              <span className="text-[#E01E1E]">{set.rirActual || "N/A"}</span>
            </span>
            {set.standardizationScore && (
              <span className="text-[10px] text-[#F5EDED]/40">
                ★{set.standardizationScore}
              </span>
            )}
          </div>

          {set.hasVideo ? (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-green-400">
              <Video size={11} /> Vidéo envoyée à ton coach
            </span>
          ) : (
            <label className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/40 hover:text-[#F5EDED]/70 border border-dashed border-[#890404]/25 hover:border-[#890404]/50 rounded-lg px-2.5 py-1.5 cursor-pointer transition-colors">
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
              <label className="text-[8px] text-[#F5EDED]/30 uppercase tracking-wider">
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
                className="w-full bg-[#150000] border border-[#890404]/30 rounded-lg px-2.5 py-2 text-sm font-bold text-white placeholder:text-[#F5EDED]/20 focus:outline-none focus:border-[#E01E1E]/50"
              />
            </div>
            <div className="flex-1">
              <label className="text-[8px] text-[#F5EDED]/30 uppercase tracking-wider">
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
                className="w-full bg-[#150000] border border-[#890404]/30 rounded-lg px-2.5 py-2 text-sm font-bold text-white placeholder:text-[#F5EDED]/20 focus:outline-none focus:border-[#E01E1E]/50"
              />
            </div>
          </div>

          {/* RIR + Score row */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[8px] text-[#F5EDED]/30 uppercase tracking-wider">
                RIR réel
              </label>
              <select
                value={set.rirActual}
                onChange={(e) => onChange({ rirActual: e.target.value })}
                className="w-full bg-[#150000] border border-[#890404]/30 rounded-lg px-2.5 py-2 text-sm font-bold text-white focus:outline-none focus:border-[#E01E1E]/50"
              >
                <option value="">N/A</option>
                {[0, 1, 2, 3, 4, 5].map((v) => (
                  <option key={v} value={v}>
                    RIR {v}
                    {v === 0 ? " (échec)" : v >= 4 ? " (facile)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-[8px] text-[#F5EDED]/30 uppercase tracking-wider">
                Exécution
              </label>
              <select
                value={set.standardizationScore}
                onChange={(e) =>
                  onChange({ standardizationScore: e.target.value })
                }
                className="w-full bg-[#150000] border border-[#890404]/30 rounded-lg px-2.5 py-2 text-sm font-bold text-white focus:outline-none focus:border-[#E01E1E]/50"
              >
                <option value="">N/A</option>
                {[1, 2, 3, 4, 5].map((v) => (
                  <option key={v} value={v}>
                    {v} : {STANDARDIZATION_LABELS[String(v)]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Validate button */}
          <button
            onClick={onValidate}
            className="w-full py-2.5 bg-[#E01E1E] hover:bg-[#B00202] text-white text-xs font-black uppercase tracking-widest rounded-lg transition-colors"
          >
            ✓ Valider le set
          </button>
        </div>
      )}
    </div>
  );
}

function ExerciseCard({
  exState,
  prevWeight,
  prThreshold,
  sessionId,
  libraryTip,
  onUpdate,
  onValidateSet,
  onUnvalidateSet,
  onRemoveExercise,
  onRemoveSet,
  onMoveUp,
  onMoveDown,
  onNotesChange,
}: {
  exState: ExerciseState;
  prevWeight: PrevWeight | null;
  prThreshold: number | null;
  sessionId: string;
  libraryTip?: LibraryTip;
  onUpdate: (patch: Partial<ExerciseState>) => void;
  onValidateSet: (setIdx: number) => void;
  onUnvalidateSet: (setIdx: number) => void;
  onRemoveExercise: () => void;
  onRemoveSet: (setIdx: number) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onNotesChange: (notes: string) => void;
}) {
  // Conseils réels de la bibliothèque d'exercices en priorité — sinon les
  // cues génériques (avant : c'était toujours ces cues génériques, quasi
  // identiques pour tous les exercices faute de correspondance).
  const libraryInstructions = libraryTip?.instructions?.trim() || null;
  const tips = libraryInstructions ? null : getTips(exState.exercise.name);
  // Les exercices ajoutés à la volée n'ont pas de nombre de séries cible
  // fiable (défaut arbitraire) — l'afficher induisait en erreur.
  const isCustomExercise = exState.exercise.id.startsWith("local-");

  return (
    <div className="bg-[#1a0000] border border-[#890404]/25 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3.5 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-black text-white">
            {exState.exercise.name}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            {exState.exercise.muscle_group && (
              <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#890404]/15 text-[#F5EDED]/40 border border-[#890404]/20">
                {exState.exercise.muscle_group}
              </span>
            )}
            {!isCustomExercise && exState.exercise.sets && (
              <span className="text-[9px] text-[#F5EDED]/30">
                {exState.exercise.sets} séries
                {exState.exercise.reps && ` × ${exState.exercise.reps} reps`}
                {exState.exercise.rir != null &&
                  ` · RIR ${exState.exercise.rir}`}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-1">
          {(onMoveUp || onMoveDown) && (
            <div className="flex flex-col border border-[#890404]/20 rounded-lg overflow-hidden mr-0.5">
              <button
                onClick={onMoveUp}
                disabled={!onMoveUp}
                className="p-0.5 text-[#F5EDED]/30 hover:text-[#F5EDED]/70 disabled:opacity-20 disabled:hover:text-[#F5EDED]/30 transition-colors"
                title="Monter l'exercice"
              >
                <ChevronUp size={12} />
              </button>
              <button
                onClick={onMoveDown}
                disabled={!onMoveDown}
                className="p-0.5 text-[#F5EDED]/30 hover:text-[#F5EDED]/70 disabled:opacity-20 disabled:hover:text-[#F5EDED]/30 transition-colors border-t border-[#890404]/20"
                title="Descendre l'exercice"
              >
                <ChevronDown size={12} />
              </button>
            </div>
          )}
          <button
            onClick={() => onUpdate({ showTips: !exState.showTips })}
            className={`p-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border transition-colors ${
              exState.showTips
                ? "bg-[#E01E1E]/15 text-[#E01E1E] border-[#E01E1E]/25"
                : "text-[#F5EDED]/30 border-[#890404]/20 hover:border-[#890404]/40"
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
                : "text-[#F5EDED]/30 border-[#890404]/20 hover:border-[#890404]/40"
            }`}
            title="Historique"
          >
            <BarChart2 size={12} />
          </button>
          <button
            onClick={() => onUpdate({ showNotes: !exState.showNotes })}
            className={`p-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border transition-colors ${
              exState.showNotes
                ? "bg-amber-500/15 text-amber-400 border-amber-500/25"
                : exState.clientNotes
                ? "text-amber-400/70 border-amber-500/20"
                : "text-[#F5EDED]/30 border-[#890404]/20 hover:border-[#890404]/40"
            }`}
            title="Notes"
          >
            <StickyNote size={12} />
          </button>
          <button
            onClick={() => {
              if (confirm(`Retirer "${exState.exercise.name}" de cette séance ?`)) {
                onRemoveExercise();
              }
            }}
            className="p-1.5 rounded-lg text-[9px] font-bold border text-[#F5EDED]/30 border-[#890404]/20 hover:text-red-400 hover:border-red-500/30 transition-colors"
            title="Retirer cet exercice"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Notes panel */}
      {exState.showNotes && (
        <div className="border-t border-[#890404]/20 bg-[#1f0101] px-4 py-3">
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-2">
            Ta note sur cet exercice
          </p>
          <textarea
            value={exState.clientNotes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Ex. variante testée, gêne à l'épaule, ressenti..."
            rows={2}
            className="w-full bg-[#150000] border border-[#890404]/30 rounded-lg px-3 py-2 text-xs text-white placeholder:text-[#F5EDED]/20 focus:outline-none focus:border-[#E01E1E]/50 resize-none"
          />
        </div>
      )}

      {/* Tips panel */}
      {exState.showTips && (
        <div className="border-t border-[#890404]/20 bg-[#1f0101] px-4 py-3 space-y-3">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-2">
              {libraryInstructions ? "Conseils d'exécution" : "Cues d'exécution"}
            </p>
            {libraryInstructions ? (
              <p className="text-xs text-[#F5EDED]/65 leading-relaxed whitespace-pre-wrap">
                {libraryInstructions}
              </p>
            ) : (
              <ul className="space-y-1.5">
                {tips!.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[#E01E1E] font-black text-xs mt-0 leading-[1.4]">
                      {i + 1}.
                    </span>
                    <span className="text-xs text-[#F5EDED]/65 leading-relaxed">
                      {tip}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {libraryTip?.video_url && (
            <a
              href={libraryTip.video_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#E01E1E]/80 hover:text-[#E01E1E] transition-colors"
            >
              <Video size={11} />
              Voir la vidéo d&apos;exemple
            </a>
          )}
        </div>
      )}

      {/* History hint (real data fetched in coach logbook, here we show prev weight) */}
      {exState.showHistory && prevWeight && (
        <div className="border-t border-[#890404]/20 bg-[#1f0101] px-4 py-3">
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-2">
            Dernière session
          </p>
          <div className="flex gap-4 text-sm font-black text-white">
            {prevWeight.weight != null && (
              <span>
                {prevWeight.weight}
                <span className="text-[10px] font-normal text-[#F5EDED]/40 ml-0.5">
                  kg
                </span>
              </span>
            )}
            {prevWeight.reps != null && (
              <span>
                {prevWeight.reps}
                <span className="text-[10px] font-normal text-[#F5EDED]/40 ml-0.5">
                  reps
                </span>
              </span>
            )}
            {prevWeight.rir != null && (
              <span>
                RIR{" "}
                <span className="text-[#E01E1E]">{prevWeight.rir}</span>
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
            onUnvalidate={() => onUnvalidateSet(idx)}
            onRemove={() => onRemoveSet(idx)}
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
          className="w-full flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/30 hover:text-[#F5EDED]/60 border border-dashed border-[#890404]/20 hover:border-[#890404]/40 rounded-lg transition-colors"
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
        <label className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35">
          {label}
        </label>
        <span className="text-sm font-black text-[#E01E1E]">{value}/5</span>
      </div>
      <input
        type="range"
        min={1}
        max={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#E01E1E]"
      />
      <div className="flex justify-between text-[8px] text-[#F5EDED]/25">
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
        const customExercises = loadCustomExercises(sessionId);
        const combined = applyExerciseOrder(
          [...data.exercises, ...customExercises],
          loadExerciseOrder(sessionId)
        );
        const exStates = buildExerciseState(
          combined,
          data.existingSets,
          loadExerciseNotes(sessionId)
        );
        setExercises(exStates);

        // Determine starting step
        if (data.session.is_completed) {
          setStep("recap");
        } else {
          // Marquer la séance comme active dès qu'elle est chargée (pas
          // seulement après validation de l'échauffement) — sinon revenir sur
          // /logbook pendant l'échauffement ne propose pas de la reprendre et
          // donne l'impression qu'elle a été arrêtée.
          localStorage.setItem("ep-active-session-id", sessionId);
          if (data.session.warmup_validated) {
            setStep("session");
            const saved = localStorage.getItem(`ep-session-start-${sessionId}`);
            sessionStartRef.current = saved ? parseInt(saved, 10) : Date.now();
          }
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

  // Keep the screen awake during the workout — the OS auto-locking the
  // phone between sets was the main reason a séance "felt" interrupted.
  // The Wake Lock is released by the browser whenever the tab loses
  // visibility, so it's re-acquired on visibilitychange (e.g. switching
  // back from another app) rather than just once on mount.
  useEffect(() => {
    if (step !== "session" || typeof navigator === "undefined" || !("wakeLock" in navigator)) return;

    let sentinel: WakeLockSentinel | null = null;

    async function acquire() {
      try {
        sentinel = await navigator.wakeLock.request("screen");
        sentinel.addEventListener("release", () => { sentinel = null; });
      } catch {
        // Unsupported / denied — degrade silently, the session itself
        // still resumes correctly on reopen regardless of screen lock.
      }
    }

    acquire();

    function handleVisibility() {
      if (document.visibilityState === "visible" && !sentinel) acquire();
    }
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      sentinel?.release().catch(() => {});
    };
  }, [step]);

  // Notification système quand on quitte l'app (autre onglet, autre app,
  // écran verrouillé) pendant une séance active — sans ça, rien ne rappelle
  // qu'une séance tourne toujours une fois qu'on a quitté la page, et on
  // peut croire qu'il faut la relancer depuis zéro.
  useEffect(() => {
    if (step === "recap" || typeof window === "undefined" || !("Notification" in window)) return;

    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }

    function handleVisibility() {
      if (document.visibilityState !== "hidden") return;
      if (Notification.permission !== "granted") return;
      try {
        new Notification("Séance en cours 💪", {
          body: "Reviens dans l'app pour continuer. Seul \"Terminer\" y met fin.",
          tag: "ep-active-session",
          icon: "/icon-192.png",
        });
      } catch {
        // Notification API peut être indisponible (iOS Safari hors PWA) —
        // le bandeau in-app reste le filet de sécurité principal.
      }
    }

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [step]);

  const handleWarmupValidate = useCallback(
    (seconds: number) => {
      // Move to the workout immediately — warmup_validated is just metadata
      // for "resume where I left off" on reload, it must never block the
      // transition if the network is slow/flaky.
      const startTime = Date.now();
      sessionStartRef.current = startTime;
      localStorage.setItem(`ep-session-start-${sessionId}`, startTime.toString());
      localStorage.setItem("ep-active-session-id", sessionId);
      localStorage.removeItem(`ep-warmup-start-${sessionId}`);
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
            notes: exState.clientNotes || null,
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
        // Pas d'ajout automatique d'un set vide supplémentaire ici — seul le
        // bouton "Ajouter un set" doit en créer un, sinon ça apparaît comme
        // un set rajouté tout seul sans que le client ait rien demandé.
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
      // 1 set pour démarrer — "Ajouter un set" permet d'en rajouter autant
      // que voulu, mais imposer 3 d'office ne laissait aucun moyen de
      // choisir moins pour une séance libre.
      const defaultSets = 1;
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
        {
          exercise: newExercise,
          sets,
          showTips: false,
          showHistory: false,
          showNotes: false,
          clientNotes: "",
        },
      ]);
      saveCustomExercises(sessionId, [...loadCustomExercises(sessionId), newExercise]);
    },
    [exercises.length, sessionId]
  );

  // Retirer un exercice de la séance — n'affecte que la vue locale, les
  // sets déjà validés (donc déjà enregistrés en base) le restent.
  const handleRemoveExercise = useCallback(
    (exIdx: number) => {
      setExercises((prev) => {
        const removed = prev[exIdx];
        if (removed.exercise.id.startsWith("local-")) {
          saveCustomExercises(
            sessionId,
            loadCustomExercises(sessionId).filter((e) => e.id !== removed.exercise.id)
          );
        }
        return prev.filter((_, i) => i !== exIdx);
      });
    },
    [sessionId]
  );

  // Retirer un set non-validé d'un exercice.
  const handleRemoveSet = useCallback((exIdx: number, setIdx: number) => {
    setExercises((prev) => {
      const next = [...prev];
      next[exIdx] = {
        ...next[exIdx],
        sets: next[exIdx].sets.filter((_, i) => i !== setIdx),
      };
      return next;
    });
  }, []);

  // Dévalider un set déjà validé — repasse en mode édition (les valeurs
  // saisies restent modifiables) et supprime la ligne déjà enregistrée en
  // base pour éviter un doublon si le client revalide ensuite.
  const handleUnvalidateSet = useCallback(
    (exIdx: number, setIdx: number) => {
      setExercises((prev) => {
        const set = prev[exIdx].sets[setIdx];
        if (set.dbId) {
          fetch(`/api/client/sessions/${sessionId}/sets/${set.dbId}`, {
            method: "DELETE",
          }).catch(() => {});
        }
        const next = [...prev];
        const newSets = [...next[exIdx].sets];
        newSets[setIdx] = {
          ...newSets[setIdx],
          validated: false,
          isPR: false,
          dbId: null,
        };
        next[exIdx] = { ...next[exIdx], sets: newSets };
        return next;
      });
    },
    [sessionId]
  );

  // Réordonner les exercices de la séance (flèches haut/bas) — persisté pour
  // survivre à un refresh, sans toucher à l'ordre défini dans le programme.
  const handleMoveExercise = useCallback(
    (exIdx: number, dir: -1 | 1) => {
      setExercises((prev) => {
        const target = exIdx + dir;
        if (target < 0 || target >= prev.length) return prev;
        const next = [...prev];
        [next[exIdx], next[target]] = [next[target], next[exIdx]];
        saveExerciseOrder(sessionId, next.map((e) => e.exercise.id));
        return next;
      });
    },
    [sessionId]
  );

  // Notes libres du client sur un exercice — persistées et jointes aux sets
  // envoyés en base pour rester visibles côté coach.
  const handleExerciseNotesChange = useCallback(
    (exIdx: number, exerciseName: string, notes: string) => {
      saveExerciseNote(sessionId, exerciseName, notes);
      setExercises((prev) => {
        const next = [...prev];
        next[exIdx] = { ...next[exIdx], clientNotes: notes };
        return next;
      });
    },
    [sessionId]
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

  const [canceling, setCanceling] = useState(false);

  // Abandonner une séance de test/erreur sans rien enregistrer — jusqu'ici
  // seul "Terminer" existait, qui sauvegarde toujours tout.
  const handleCancelSession = useCallback(async () => {
    if (!confirm("Annuler cette séance ? Rien ne sera enregistré.")) return;
    setCanceling(true);
    try {
      await fetch(`/api/client/sessions/${sessionId}`, { method: "DELETE" });
    } catch {
      // best-effort — on quitte quand même, la séance restera visible comme
      // "en cours" au pire, sans bloquer l'utilisateur.
    }
    localStorage.removeItem(`ep-session-start-${sessionId}`);
    localStorage.removeItem(`ep-warmup-start-${sessionId}`);
    localStorage.removeItem(customExercisesKey(sessionId));
    localStorage.removeItem("ep-active-session-id");
    router.push(returnPath);
  }, [sessionId, returnPath, router]);

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

      localStorage.removeItem(`ep-session-start-${sessionId}`);
      localStorage.removeItem(`ep-warmup-start-${sessionId}`);
      localStorage.removeItem(customExercisesKey(sessionId));
      localStorage.removeItem("ep-active-session-id");
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
        <div className="w-8 h-8 border-2 border-[#E01E1E] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!initData) {
    return (
      <div className="px-6 py-8 text-center">
        <p className="text-[#F5EDED]/40">Séance introuvable</p>
      </div>
    );
  }

  const { session } = initData;
  const muscleGroups = session.muscle_groups ?? [];

  // ── WARMUP ──────────────────────────────────────────────────────────────────
  if (step === "warmup") {
    return (
      <WarmupStep
        sessionId={sessionId}
        dayLabel={session.day_label}
        muscleGroups={muscleGroups}
        onValidate={handleWarmupValidate}
        onCancel={handleCancelSession}
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
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
            Récap de séance
          </p>
          <h1 className="text-2xl font-black uppercase">{session.day_label}</h1>
          <p className="text-xs text-[#F5EDED]/35 mt-1">
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
            { label: "Sets", value: String(totalSetsCompleted), icon: Dumbbell, color: "#E01E1E" },
            { label: "RIR moy.", value: avgRIR != null ? String(Math.round(avgRIR * 10) / 10) : "N/A", icon: Activity, color: "#4ade80" },
            { label: "Score tech.", value: avgScore > 0 ? `${Math.round(avgScore * 10) / 10}/5` : "N/A", icon: Star, color: "#fbbf24" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div
              key={label}
              className="bg-[#1f0101] border border-[#890404]/25 rounded-xl p-3 flex flex-col items-center gap-1.5"
            >
              <Icon size={16} style={{ color }} strokeWidth={1.8} />
              <p className="text-xl font-black text-white">{value}</p>
              <p className="text-[9px] font-semibold uppercase tracking-widest text-[#F5EDED]/35">
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
                  {pr.exerciseName} : {pr.weightKg} kg
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Feeling sliders */}
        <div className="bg-[#1f0101] border border-[#890404]/25 rounded-xl p-5 mb-5 space-y-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35">
            Ressenti global
          </p>
          {!session.is_completed && (
            <>
              <SliderInput label="Énergie générale" value={energy} onChange={setEnergy} />
              <SliderInput label="Pump" value={pump} onChange={setPump} />
              <SliderInput label="Feeling global" value={feeling} onChange={setFeeling} />
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 block mb-1.5">
                  Notes libres
                </label>
                <textarea
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  placeholder="Observations, fatigue particulière, douleurs..."
                  rows={3}
                  className="w-full bg-[#150000] border border-[#890404]/30 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-[#F5EDED]/20 focus:outline-none focus:border-[#E01E1E]/50 resize-none"
                />
              </div>
            </>
          )}
          {session.is_completed && (
            <div className="flex gap-4">
              <div className="text-center">
                <p className="text-2xl font-black text-white">{session.energy_level ?? "N/A"}</p>
                <p className="text-[9px] text-[#F5EDED]/30 uppercase tracking-wider">Énergie</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-white">{session.pump ?? "N/A"}</p>
                <p className="text-[9px] text-[#F5EDED]/30 uppercase tracking-wider">Pump</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-white">{session.general_feeling ?? "N/A"}</p>
                <p className="text-[9px] text-[#F5EDED]/30 uppercase tracking-wider">Feeling</p>
              </div>
            </div>
          )}
        </div>

        {/* Charts */}
        {volumeData.length > 0 && (
          <div className="bg-[#1f0101] border border-[#890404]/25 rounded-xl p-5 mb-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-4">
              Volume par muscle (sets)
            </p>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={volumeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(137,4,4,0.15)" />
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
                  <Bar dataKey="mev" fill="rgba(137,4,4,0.2)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {rirData.length > 0 && (
          <div className="bg-[#1f0101] border border-[#890404]/25 rounded-xl p-5 mb-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-4">
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
          <div className="bg-[#1f0101] border border-[#890404]/25 rounded-xl p-5 mb-6">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-4">
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
          <>
            <button
              onClick={handleCompleteSession}
              disabled={saving || canceling}
              className="w-full py-4 bg-[#E01E1E] hover:bg-[#B00202] text-white text-sm font-black uppercase tracking-widest rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
            <button
              onClick={handleCancelSession}
              disabled={saving || canceling}
              className="w-full mt-3 py-2 text-[11px] font-bold uppercase tracking-widest text-[#F5EDED]/25 hover:text-red-400 transition-colors disabled:opacity-50"
            >
              {canceling ? "Annulation…" : "Annuler la séance (rien ne sera enregistré)"}
            </button>
          </>
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
      <div className="sticky top-0 z-30 bg-[#150000] border-b border-[#890404]/30 px-4 py-3">
        <div className="max-w-2xl mx-auto">
          {/* Top row: session timer + day label */}
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/35">
                {session.day_label}
              </p>
              <div className="flex items-center gap-1.5">
                <Clock size={12} className="text-[#E01E1E]" />
                <span className="text-lg font-black text-white tabular-nums">
                  {formatTime(sessionElapsed)}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[9px] text-[#F5EDED]/35 uppercase tracking-wider">
                {totalSetsAll} sets validés
              </p>
              {avgRIR != null && (
                <p className="text-[9px] text-[#F5EDED]/35">
                  RIR moy.{" "}
                  <span className="font-black text-white">
                    {Math.round(avgRIR * 10) / 10}
                  </span>
                </p>
              )}
              <button
                onClick={handleCancelSession}
                disabled={canceling}
                className="text-[9px] font-bold uppercase tracking-wider text-[#F5EDED]/25 hover:text-red-400 transition-colors mt-1 disabled:opacity-50"
              >
                {canceling ? "Annulation…" : "Annuler"}
              </button>
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
          <div className="bg-[#1f0101] border border-[#890404]/20 rounded-xl px-5 py-8 text-center">
            <p className="text-sm text-[#F5EDED]/40">
              Séance libre, ajoute tes exercices ci-dessous
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
            libraryTip={initData.libraryByName[exState.exercise.name.toLowerCase()]}
            sessionId={sessionId}
            onUpdate={(patch) =>
              setExercises((prev) => {
                const next = [...prev];
                next[exIdx] = { ...next[exIdx], ...patch };
                return next;
              })
            }
            onValidateSet={(setIdx) => handleValidateSet(exIdx, setIdx)}
            onUnvalidateSet={(setIdx) => handleUnvalidateSet(exIdx, setIdx)}
            onRemoveExercise={() => handleRemoveExercise(exIdx)}
            onRemoveSet={(setIdx) => handleRemoveSet(exIdx, setIdx)}
            onMoveUp={exIdx > 0 ? () => handleMoveExercise(exIdx, -1) : undefined}
            onMoveDown={exIdx < exercises.length - 1 ? () => handleMoveExercise(exIdx, 1) : undefined}
            onNotesChange={(notes) => handleExerciseNotesChange(exIdx, exState.exercise.name, notes)}
          />
        ))}

        <ExercisePicker onAdd={handleAddExercise} />
      </div>

      {/* Terminate button (fixed bottom) — décalé au-dessus de la nav mobile
          (72px + safe-area) avec un z-index supérieur, sinon le bas du
          bouton se retrouvait caché sous la barre d'onglets. */}
      <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+84px)] md:bottom-4 left-0 right-0 px-4 z-50">
        <div className="max-w-md mx-auto">
          <button
            onClick={() => setStep("recap")}
            className="w-full py-3.5 bg-[#1f0101] border border-[#890404]/40 hover:border-[#E01E1E]/50 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-colors"
          >
            Terminer la séance →
          </button>
        </div>
      </div>

      {/* Rest timer overlay — rendu via portail dans <body> : la nav du bas vit
          hors du stacking context de <main> (position relative + z-index),
          donc son z-index dépassait celui de l'overlay peu importe sa valeur
          ici, et le recouvrait complètement en bas d'écran. */}
      {restTimer &&
        typeof document !== "undefined" &&
        createPortal(
          <RestTimerOverlay
            timer={restTimer}
            onUpdate={(patch) => setRestTimer((prev) => prev ? { ...prev, ...patch } : null)}
            onClose={handleRestClose}
          />,
          document.body
        )}
    </div>
  );
}
