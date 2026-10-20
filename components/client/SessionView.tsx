"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { Fragment, useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Timer,
  CheckCircle2,
  Plus,
  Trophy,
  Dumbbell,
  Activity,
  AlertCircle,
  Star,
  X,
  Backpack,
  ExternalLink,
  RotateCcw,
  ChevronDown,
  Flag,
  MoreVertical,
  Trash2,
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
  buildMovementPreps,
  type WarmupExercise,
  type MovementPrep,
} from "@/lib/warmup-data";
import ExercisePicker from "@/components/client/ExercisePicker";
import { VOLUME_LANDMARKS } from "@/lib/volume-data";
import { accessoriesForSession } from "@/lib/session-accessories";
import type { Exercise } from "@/utils/programs";
import type { Session, SessionSet } from "@/utils/sessions";
import { todayInParis } from "@/lib/dates";
import { useConfirm } from "@/components/ui/ConfirmDialogProvider";
import { SessionSetsBreakdown } from "@/components/ui/SessionHistoryCard";
import { getDeviceSettings } from "@/lib/device-settings";
import { isLastOfSuperset, supersetLabels } from "@/lib/program-sheet";
import { withAlpha } from "@/lib/theme-color";
import {
  emptyPlan,
  exerciseKey,
  parsePlan,
  newestPlan,
  loadLocalPlan,
  saveLocalPlan,
  clearLocalPlan,
  parseDetails,
  detailsToDrafts,
  buildDetails,
  detailsAsNote,
  techniqueForm,
  REST_MAX_AGE_MS,
  type LivePlan,
  type LiveExercise,
  type LiveRest,
  type SetDraft,
} from "@/lib/live-session";
import { uploadSetVideo, normalizeVideoType, videoExtension, isProbablyVideo } from "@/lib/set-video-upload";
import { useWakeLock } from "@/hooks/useWakeLock";
import ExerciseBlock from "@/components/client/session/ExerciseBlock";
import RestBar from "@/components/client/session/RestBar";
import SessionClock from "@/components/client/session/SessionClock";
import { useTypingInSession } from "@/components/client/session/useTypingInSession";
import SwapSheet from "@/components/client/session/SwapSheet";
import VideoSheet, { MAX_VIDEO_BYTES, formatBytes } from "@/components/client/session/VideoSheet";
import type { ExerciseState, LibraryTip, PrevWeight, SetState, VideoState } from "@/components/client/session/types";

// Texte pré-rempli du post Victoire depuis un PR détecté en fin de séance
// (voir le bouton "Partager en Victoire") : le client reste libre de le
// modifier ou de tout effacer avant de publier.
function buildPRShareText(prs: { exerciseName: string; weightKg: number; reps: number | null }[]): string {
  const items = prs.map((pr) => `${pr.exerciseName} à ${pr.weightKg} kg${pr.reps ? ` × ${pr.reps}` : ""}`);
  if (items.length === 1) return `🏆 Nouveau record : ${items[0]} !`;
  return `🏆 Nouveaux records aujourd'hui : ${items.join(", ")} !`;
}

// ── Types ─────────────────────────────────────────────────────────────────────

type DbSet = SessionSet & { details?: unknown; video_sent_at?: string | null };

interface InitData {
  session: Session & { live_state?: unknown };
  exercises: Exercise[];
  prMap: Record<string, number>;
  prevWeights: Record<string, PrevWeight>;
  // Tous les sets de la séance précédente la plus récente pour cet exercice
  // (retour direct 2026-09-17 : "je vois ce que j'ai fait la dernière fois,
  // pas juste un set mais TOUS les sets"), dans l'ordre. Clé = nom en
  // minuscules, même convention que prevWeights.
  prevSets: Record<string, PrevWeight[]>;
  existingSets: DbSet[];
  libraryByName: Record<string, LibraryTip>;
  accessoriesByName: Record<string, string[]>;
  // Note libre persistante par exercice (client_exercise_notes), clé = nom
  // exact, voir migration 20260917e.
  exerciseNotes: Record<string, string>;
  // Séance terminée : set id → URL signée de la vidéo (récap, "Détail des
  // séries"). Optionnel : absent d'une réponse d'avant ce champ.
  videoUrlsBySetId?: Record<string, string>;
  /** A un coach à qui envoyer ses vidéos de série. */
  hasCoach?: boolean;
}

type Step = "warmup" | "session" | "recap";

const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: "var(--ep-s1)",
    border: "1px solid rgba(var(--ep-line-rgb),0.4)",
    borderRadius: "8px",
    color: "var(--ep-ink)",
    fontSize: "11px",
  },
  labelStyle: { color: "rgba(var(--ep-ink-rgb),0.6)", fontSize: "10px" },
};

const TICK_STYLE = { fill: "rgba(var(--ep-ink-rgb),0.35)", fontSize: 9 };

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// Repos sans repos programmé ni réglage de l'appareil : barème par RIR.
function getSuggestedRest(rir: number): number {
  if (rir <= 1) return 180;
  if (rir <= 3) return 150;
  return 90;
}

function newLocalId() {
  return Math.random().toString(36).slice(2);
}

// Exercice reconstruit côté serveur à partir de séries déjà enregistrées
// (voir syntheticExercisesFor dans app/api/client/sessions/[id]/route.ts).
function isSyntheticExercise(ex: Pick<Exercise, "id">): boolean {
  return ex.id.startsWith("local-set-");
}

function emptySet(setNumber: number): SetState {
  return {
    localId: newLocalId(),
    setNumber,
    weightKg: "",
    repsActual: "",
    rirActual: "",
    standardizationScore: "",
    validated: false,
    isPR: false,
    dbId: null,
    restDuration: null,
    hasVideo: false,
  };
}

function patchSetIn(
  list: ExerciseState[],
  localId: string,
  patch: Partial<SetState> | ((s: SetState) => Partial<SetState>)
): ExerciseState[] {
  return list.map((ex) => {
    const idx = ex.sets.findIndex((s) => s.localId === localId);
    if (idx === -1) return ex;
    const sets = [...ex.sets];
    sets[idx] = { ...sets[idx], ...(typeof patch === "function" ? patch(sets[idx]) : patch) };
    return { ...ex, sets };
  });
}

// ── Anciennes clés locales (avant LivePlan) ───────────────────────────────────
//
// Exercices ajoutés, ordre des cartes et chrono de repos vivaient chacun dans
// leur clé. Relus une fois pour une séance commencée avant cette version,
// puis effacés avec le reste à la fin de la séance.

function legacyKeys(sessionId: string): string[] {
  return [
    `ep-custom-exercises-${sessionId}`,
    `ep-exercise-order-${sessionId}`,
    `ep-rest-timer-${sessionId}`,
  ];
}

function loadLegacyPlan(sessionId: string, exercises: Exercise[]): LivePlan | null {
  try {
    const rawCustom = localStorage.getItem(`ep-custom-exercises-${sessionId}`);
    const rawOrder = localStorage.getItem(`ep-exercise-order-${sessionId}`);
    if (!rawCustom && !rawOrder) return null;
    const plan = emptyPlan();
    const custom = rawCustom ? (JSON.parse(rawCustom) as Exercise[]) : [];
    plan.added = custom.filter((e) => e && typeof e.id === "string" && e.id.startsWith("local-"));
    const ids = rawOrder ? (JSON.parse(rawOrder) as string[]) : [];
    const byId = new Map([...exercises, ...plan.added].map((e) => [e.id, e]));
    plan.order = ids.map((id) => byId.get(id)).filter((e): e is Exercise => !!e).map(exerciseKey);
    return plan;
  } catch {
    return null;
  }
}

function clearSessionLocal(sessionId: string) {
  try {
    localStorage.removeItem(`ep-session-start-${sessionId}`);
    localStorage.removeItem(`ep-warmup-start-${sessionId}`);
    for (const k of legacyKeys(sessionId)) localStorage.removeItem(k);
    localStorage.removeItem("ep-active-session-id");
  } catch {}
  clearLocalPlan(sessionId);
}

// ── Reprise de la séance ──────────────────────────────────────────────────────

function str(v: number | null | undefined): string {
  return v != null ? String(v) : "";
}

function applyDraft(base: SetState, d: SetDraft): SetState {
  return {
    ...base,
    weightKg: d.w,
    repsActual: d.r,
    rirActual: d.rir,
    standardizationScore: d.score,
    segs: d.segs ?? base.segs,
    partials: d.partials ?? base.partials,
    validated: !!d.pending,
    // Validée hors ligne : renvoyée automatiquement après la reprise.
    saveFailed: !!d.pending,
    wasValidated: base.dbId != null && !d.pending ? true : base.wasValidated,
  };
}

function buildOne(ex: LiveExercise, existingSets: DbSet[], notes: Record<string, string>, plan: LivePlan): ExerciseState {
  const key = exerciseKey(ex);
  // Un set est identifié par (exercice, numéro de série) : deux lignes au
  // même numéro sont un doublon d'enregistrement. On garde la dernière
  // (existingSets arrive trié par created_at croissant).
  const bySetNumber = new Map<number, DbSet>();
  for (const s of existingSets) {
    if (s.exercise_name === ex.name) bySetNumber.set(s.set_number, s);
  }
  const dbNumbers = [...bySetNumber.keys()].sort((a, b) => a - b);
  const planned = plan.setNumbers[key];
  let numbers: number[];
  if (planned && planned.length > 0) {
    numbers = [...new Set([...planned, ...dbNumbers])].sort((a, b) => a - b);
  } else {
    // Jamais au-delà de la cible : rouvrir la séance ne doit pas rajouter
    // de série vide. Les numéros repartent du plus haut déjà pris.
    numbers = [...dbNumbers];
    let next = numbers.reduce((m, n) => Math.max(m, n), 0);
    while (numbers.length < (ex.sets ?? 3)) numbers.push(++next);
  }
  const drafts = plan.drafts[key] ?? {};
  const sets = numbers.map((n): SetState => {
    const db = bySetNumber.get(n);
    const d = drafts[String(n)];
    if (db) {
      const det = detailsToDrafts(parseDetails(db.details));
      const base: SetState = {
        localId: db.id,
        setNumber: n,
        weightKg: str(db.weight_kg),
        repsActual: str(db.reps_actual),
        rirActual: str(db.rir_actual),
        standardizationScore: str(db.standardization_score),
        segs: det.segs,
        partials: det.partials,
        validated: true,
        isPR: db.is_pr,
        dbId: db.id,
        restDuration: db.rest_duration_seconds,
        hasVideo: !!db.video_url,
        videoSentAt: db.video_sent_at ?? null,
      };
      return d ? applyDraft(base, d) : base;
    }
    const s = emptySet(n);
    return d ? applyDraft(s, d) : s;
  });
  return { key, exercise: ex, sets, clientNotes: notes[ex.name] ?? "" };
}

function restoreExercises(data: InitData, plan: LivePlan): ExerciseState[] {
  const removedKeys = new Set(plan.removed);
  const removedNames = new Set(plan.removedNames);
  const addedNames = new Set(plan.added.map((e) => e.name));
  const base = data.exercises.filter((e) => {
    if (removedKeys.has(exerciseKey(e))) return false;
    if (isSyntheticExercise(e) && (addedNames.has(e.name) || removedNames.has(e.name))) return false;
    return true;
  });
  const baseNames = new Set(base.map((e) => e.name));
  let combined: LiveExercise[] = [
    ...base,
    ...plan.added.filter((e) => !baseNames.has(e.name) && !removedKeys.has(e.id)),
  ];
  if (plan.order.length > 0) {
    const byKey = new Map(combined.map((e) => [exerciseKey(e), e]));
    const ordered: LiveExercise[] = [];
    for (const k of plan.order) {
      const e = byKey.get(k);
      if (e) {
        ordered.push(e);
        byKey.delete(k);
      }
    }
    ordered.push(...byKey.values());
    combined = ordered;
  }
  return combined.map((ex) => buildOne(ex, data.existingSets, data.exerciseNotes, plan));
}

function snapshotPlan(
  exercises: ExerciseState[],
  meta: { removed: string[]; removedNames: string[]; deferred: string[]; focus: string | null; rest: LiveRest | null }
): LivePlan {
  const plan = emptyPlan();
  plan.order = exercises.map((e) => e.key);
  plan.removed = meta.removed;
  plan.removedNames = meta.removedNames;
  plan.deferred = meta.deferred.filter((k) => plan.order.includes(k));
  plan.focus = meta.focus;
  plan.rest = meta.rest;
  plan.added = exercises
    .map((e) => e.exercise)
    .filter((e) => e.id.startsWith("local-") && !isSyntheticExercise(e));
  for (const ex of exercises) {
    plan.setNumbers[ex.key] = ex.sets.map((s) => s.setNumber);
    const drafts: Record<string, SetDraft> = {};
    for (const s of ex.sets) {
      const pending = s.validated && (s.saveFailed || !s.dbId);
      const hasValues = !!(s.weightKg || s.repsActual || s.rirActual || s.standardizationScore || s.segs?.length || s.partials);
      if (pending || (!s.validated && (hasValues || s.dbId))) {
        drafts[String(s.setNumber)] = {
          w: s.weightKg,
          r: s.repsActual,
          rir: s.rirActual,
          score: s.standardizationScore,
          ...(s.segs ? { segs: s.segs } : {}),
          ...(s.partials ? { partials: s.partials } : {}),
          ...(pending ? { pending: true } : {}),
        };
      }
    }
    if (Object.keys(drafts).length > 0) plan.drafts[ex.key] = drafts;
  }
  return plan;
}

function hasOpenSet(ex: ExerciseState): boolean {
  return ex.sets.some((s) => !s.validated);
}

/** Exercice à déplier après une série validée (rotation dans un superset). */
function nextFocus(exs: ExerciseState[], fromIdx: number): string | null {
  const groups = exs.map((e) => e.exercise.superset_group ?? null);
  const g = groups[fromIdx];
  if (g) {
    let start = fromIdx;
    while (start > 0 && groups[start - 1] === g) start--;
    let end = fromIdx;
    while (end + 1 < groups.length && groups[end + 1] === g) end++;
    if (end > start) {
      const size = end - start + 1;
      for (let k = 1; k <= size; k++) {
        const i = start + ((fromIdx - start + k) % size);
        if (hasOpenSet(exs[i])) return exs[i].key;
      }
      for (let i = end + 1; i < exs.length; i++) if (hasOpenSet(exs[i])) return exs[i].key;
      for (let i = 0; i < start; i++) if (hasOpenSet(exs[i])) return exs[i].key;
      return null;
    }
  }
  if (hasOpenSet(exs[fromIdx])) return exs[fromIdx].key;
  for (let i = fromIdx + 1; i < exs.length; i++) if (hasOpenSet(exs[i])) return exs[i].key;
  for (let i = 0; i < fromIdx; i++) if (hasOpenSet(exs[i])) return exs[i].key;
  return null;
}

function firstOpenKey(exs: ExerciseState[]): string | null {
  return exs.find(hasOpenSet)?.key ?? null;
}

/** Blocs d'affichage : un exercice seul, ou un superset entier. */
function blocksOf(exs: ExerciseState[]): number[][] {
  const out: number[][] = [];
  exs.forEach((e, i) => {
    const g = e.exercise.superset_group ?? null;
    const last = out[out.length - 1];
    if (g && last && exs[last[last.length - 1]].exercise.superset_group === g) last.push(i);
    else out.push([i]);
  });
  return out;
}

// ── Records de séance ─────────────────────────────────────────────────────────
//
// Le seuil PR combinait prMap (figé au chargement, alimenté seulement par
// /complete) et un state React perdu à chaque rechargement. Or la PWA est
// souvent tuée écran verrouillé : au retour, les séries déjà validées de la
// séance ne comptaient plus. Constaté le 23/09 : "Crunch poulie haute" série
// 3 à 35 kg marquée PR après la série 1 à 37,5 kg, "Tirage horizontal assis
// uni" marqué PR deux fois à 60 kg. Tout est désormais recalculé à partir
// des séries VALIDÉES à l'écran, qui reviennent validées après un
// rechargement (buildExerciseState) : le calcul survit donc au rechargement.

function setWeight(s: SetState): number | null {
  const w = parseFloat(s.weightKg);
  return Number.isFinite(w) && w > 0 ? w : null;
}

/**
 * Seuil à battre pour un exercice : le meilleur entre l'historique en base
 * (prMap) et les séries déjà validées de cette séance, hors `excludeLocalId`
 * (la série qu'on évalue : la revalider ne doit pas lui retirer son PR).
 */
function computeThreshold(
  exercises: ExerciseState[],
  prMap: Record<string, number>,
  exerciseName: string,
  excludeLocalId?: string
): number | null {
  const key = exerciseName.toLowerCase();
  let best: number | null = prMap[key] ?? null;
  for (const ex of exercises) {
    if (ex.exercise.name.toLowerCase() !== key) continue;
    for (const s of ex.sets) {
      if (!s.validated || s.localId === excludeLocalId) continue;
      const w = setWeight(s);
      if (w != null && (best == null || w > best)) best = w;
    }
  }
  return best;
}

interface SessionRecord {
  localId: string;
  exerciseName: string;
  weightKg: number;
  reps: number | null;
}

/**
 * Un seul record par exercice (nom en minuscules) : la série validée la plus
 * lourde (la première en cas d'égalité), et seulement si elle bat le record
 * déjà en base. Sert au badge des séries validées, au trophée de la carte et
 * à la liste envoyée à /complete.
 */
function computeSessionRecords(
  exercises: ExerciseState[],
  prMap: Record<string, number>
): Map<string, SessionRecord> {
  const best = new Map<string, SessionRecord>();
  for (const ex of exercises) {
    const key = ex.exercise.name.toLowerCase();
    for (const s of ex.sets) {
      if (!s.validated) continue;
      const w = setWeight(s);
      if (w == null) continue;
      const current = best.get(key);
      if (!current || w > current.weightKg) {
        const reps = parseInt(s.repsActual, 10);
        best.set(key, {
          localId: s.localId,
          exerciseName: ex.exercise.name,
          weightKg: w,
          reps: Number.isFinite(reps) ? reps : null,
        });
      }
    }
  }
  for (const [key, rec] of best) {
    const previous = prMap[key];
    if (previous != null && rec.weightKg <= previous) best.delete(key);
  }
  return best;
}

/**
 * Séance déjà terminée : prMap contient ses propres records, on ne peut donc
 * plus les "battre". On relit les séries marquées PR en base, réduites à une
 * par exercice (la plus lourde) pour ne plus afficher les doublons historiques.
 */
function recordsFromFlags(exercises: ExerciseState[]): SessionRecord[] {
  const best = new Map<string, SessionRecord>();
  for (const ex of exercises) {
    const key = ex.exercise.name.toLowerCase();
    for (const s of ex.sets) {
      if (!s.validated || !s.isPR) continue;
      const w = setWeight(s);
      if (w == null) continue;
      const current = best.get(key);
      if (!current || w > current.weightKg) {
        const reps = parseInt(s.repsActual, 10);
        best.set(key, {
          localId: s.localId,
          exerciseName: ex.exercise.name,
          weightKg: w,
          reps: Number.isFinite(reps) ? reps : null,
        });
      }
    }
  }
  return [...best.values()];
}

// ── Warmup Step ───────────────────────────────────────────────────────────────

function WarmupStep({
  sessionId,
  dayLabel,
  muscleGroups,
  movementPreps,
  onValidate,
  onCancel,
}: {
  sessionId: string;
  movementPreps: MovementPrep[];
  dayLabel: string;
  muscleGroups: string[];
  onValidate: (seconds: number) => void;
  onCancel: () => void;
}) {
  const tr = useT();
  // Le point de départ est persisté (comme le timer de séance) — sans ça,
  // changer d'onglet démonte ce composant et le décompte repart de zéro,
  // donnant l'impression que la séance vient d'être interrompue/annulée
  // alors que rien ne l'a été : seul le bouton "Terminer" doit y mettre fin.
  const storageKey = `ep-warmup-start-${sessionId}`;
  // MASTERCLASS (react-hooks/purity, 2026-08-16) : un useRef(expression)
  // évalue son argument à CHAQUE rendu (seul le premier résultat est
  // gardé), contrairement à useState(initialiseur) qui garantit un seul
  // appel. L'IIFE relisait donc localStorage à chaque rendu ; regroupé ici
  // en un seul useState paresseux, lu normalement (plus de useRef.current
  // accédé pendant le rendu, deuxième avertissement du même lint).
  const [warmupStart] = useState<number>(() => {
    if (typeof window === "undefined") return Date.now();
    const saved = localStorage.getItem(storageKey);
    if (saved) return parseInt(saved, 10);
    const now = Date.now();
    localStorage.setItem(storageKey, now.toString());
    return now;
  });
  const [elapsed, setElapsed] = useState(() =>
    Math.floor((Date.now() - warmupStart) / 1000)
  );
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(
      () => setElapsed(Math.floor((Date.now() - warmupStart) / 1000)),
      1000
    );
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [warmupStart]);

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
    <div className="px-6 py-8 max-w-2xl mx-auto pb-24 page-transition">
      {/* Timer */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-(--ep-ink)/35">
            {tr("Échauffement :")}{" "}{dayLabel}
          </p>
          <div className="flex items-center gap-2">
            <Timer size={14} className="text-(--ep-accent)" />
            <span className="text-2xl font-black text-(--ep-strong) tabular-nums">
              {formatTime(elapsed)}
            </span>
          </div>
        </div>

        {/* Progress bar 0 → 15 min */}
        <div className="h-2 bg-(--ep-line)/15 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.min((elapsed / 900) * 100, 100)}%`,
              backgroundColor: isOptimal ? "var(--ep-ok)" : isLate ? "var(--ep-warn)" : "var(--ep-accent)",
            }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[8px] text-(--ep-ink)/25">{tr("0 min")}</span>
          <span className="text-[8px] text-(--ep-ok)">{tr("5 min ✓")}</span>
          <span className="text-[8px] text-(--ep-ink)/25">{tr("15 min")}</span>
        </div>
      </div>

      {/* Status message */}
      {!canValidate && (
        <div className="flex items-start gap-2.5 bg-(--ep-bad)/10 border border-(--ep-bad)/25 rounded-xl px-4 py-3 mb-5">
          <AlertCircle size={14} className="text-(--ep-bad) flex-shrink-0 mt-0.5" />
          <p className="text-xs text-(--ep-bad)">
            {tr("Minimum 5 minutes d'échauffement requis pour préparer tes articulations")}
          </p>
        </div>
      )}
      {isOptimal && (
        <div className="flex items-center gap-2 bg-(--ep-ok)/10 border border-(--ep-ok)/25 rounded-xl px-4 py-2.5 mb-5">
          <CheckCircle2 size={14} className="text-(--ep-ok)" />
          <p className="text-xs font-bold text-(--ep-ok)">
            {tr("Durée recommandée atteinte ✓")}
          </p>
        </div>
      )}
      {isLate && (
        <div className="flex items-center gap-2 bg-(--ep-warn)/10 border border-(--ep-warn)/25 rounded-xl px-4 py-2.5 mb-5">
          <AlertCircle size={14} className="text-(--ep-warn)" />
          <p className="text-xs font-bold text-(--ep-warn)">
            {tr("Tu peux commencer, n'attends pas trop")}
          </p>
        </div>
      )}

      {/* Articulations */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {suggested.articulations.map((a) => (
          <span
            key={a}
            className="text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-(--ep-line)/15 text-(--ep-ink)/50 border border-(--ep-line)/20"
          >
            {a}
          </span>
        ))}
      </div>

      {/* Tip */}
      <p className="text-xs text-(--ep-ink)/50 italic mb-5 leading-relaxed">
        💡 {suggested.tips}
      </p>

      {/* Montée sur les mouvements réels du jour (retour direct 2026-09-01 :
          l'échauffement doit vraiment dépendre de la séance/du programme,
          pas juste de la catégorie push/pull/legs). Basé sur le dernier
          poids de travail connu pour chaque mouvement. */}
      {movementPreps.length > 0 && (
        <div className="mb-5">
          <p className="text-[9px] font-bold uppercase tracking-widest text-(--ep-ink)/25 mb-2">
            {tr("Montée sur tes mouvements du jour")}
          </p>
          <div className="space-y-2">
            {movementPreps.map((mp) => (
              <div key={mp.exerciseName} className="bg-(--ep-s1) border border-(--ep-line)/20 rounded-xl px-4 py-3">
                <p className="text-xs font-bold text-(--ep-strong) mb-1.5">{mp.exerciseName}</p>
                <div className="flex flex-wrap gap-1.5">
                  {mp.ramps.map((r, i) => (
                    <span
                      key={i}
                      className="text-[10px] font-semibold text-(--ep-ink)/55 bg-(--ep-s2) border border-(--ep-line)/15 rounded-full px-2.5 py-1"
                    >
                      {r.weightKg != null ? `${r.weightKg}kg × ${r.reps}` : r.reps}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Exercises list — suggestions éditables : retire ce que tu ne veux
          pas, ajoute les tiens. */}
      <p className="text-[9px] font-bold uppercase tracking-widest text-(--ep-ink)/25 mb-2">
        {tr("Suggestions, modifie librement")}
      </p>
      <div className="space-y-2 mb-3">
        {exercises.map((ex, i) => (
          <div
            key={i}
            className="flex items-center gap-3 bg-(--ep-s1) border border-(--ep-line)/20 rounded-xl px-4 py-3"
          >
            <div className="flex-1">
              <p className="text-sm font-semibold text-(--ep-strong)">{ex.name}</p>
              {ex.sets && <p className="text-[10px] text-(--ep-ink)/40">{ex.sets}</p>}
            </div>
            <span
              className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border"
              style={{
                color: EQUIPMENT_COLORS[ex.equipment],
                borderColor: `${withAlpha(EQUIPMENT_COLORS[ex.equipment], "30")}`,
                backgroundColor: `${withAlpha(EQUIPMENT_COLORS[ex.equipment], "10")}`,
              }}
            >
              {ex.equipment}
            </span>
            <button
              onClick={() => removeExercise(i)}
              aria-label={tr("Retirer")}
              className="-mr-2 h-11 w-11 flex items-center justify-center text-(--ep-ink)/35 hover:text-(--ep-bad) transition-colors flex-shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        ))}
        {exercises.length === 0 && (
          <p className="text-xs text-(--ep-ink)/25 italic text-center py-3">
            {tr("Aucun exercice. Ajoute le tien ci-dessous.")}
          </p>
        )}
      </div>

      {/* Ajouter son propre exercice d'échauffement */}
      <div className="flex gap-2 mb-8">
        <input
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomExercise(); } }}
          placeholder={tr("Ajouter ton propre exercice…")} aria-label={tr("Ajouter ton propre exercice…")}
          className="flex-1 bg-(--ep-s2) border border-(--ep-line)/30 rounded-lg px-3 py-2.5 text-sm text-(--ep-strong) placeholder:text-(--ep-ink)/20 focus:outline-none focus:border-(--ep-accent)/50"
        />
        <button
          onClick={addCustomExercise}
          disabled={!customName.trim()}
          aria-label={tr("Ajouter l'exercice")}
          className="px-4 rounded-lg bg-(--ep-line)/30 hover:bg-(--ep-line)/50 disabled:opacity-30 text-(--ep-ink)/70 transition-colors"
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
            ? "bg-(--ep-accent) hover:bg-(--ep-accent-2) text-(--ep-strong)"
            : "bg-(--ep-line)/20 text-(--ep-ink)/20 cursor-not-allowed"
        }`}
      >
        {canValidate ? tr("Valider l'échauffement → Commencer") : `Encore ${formatTime(300 - elapsed)}`}
      </button>

      <button
        onClick={onCancel}
        className="w-full mt-3 min-h-11 text-[11px] font-bold uppercase tracking-widest text-(--ep-ink)/45 hover:text-(--ep-bad) transition-colors"
      >
        {tr("Annuler la séance")}
      </button>
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
  const tr = useT();
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-[10px] font-semibold uppercase tracking-widest text-(--ep-ink)/35">
          {label}
        </label>
        <span className="text-sm font-black text-(--ep-accent)">{value}/5</span>
      </div>
      <input
        type="range"
        min={1}
        max={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="w-full accent-(--ep-accent)"
      />
      <div className="flex justify-between text-[8px] text-(--ep-ink)/25">
        <span>{tr("Faible")}</span>
        <span>{tr("Excellent")}</span>
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
  const tr = useT();
  const router = useRouter();
  const confirm = useConfirm();
  // SessionView sert aussi au logbook perso du coach
  // (/dashboard/coach/moi/logbook) : le lien de partage doit pointer vers le
  // mur Victoires du bon rôle.
  const communityBasePath = returnPath.startsWith("/dashboard/coach") ? "/dashboard/coach" : "/dashboard/client";

  // Init state
  const [loading, setLoading] = useState(true);
  const [initData, setInitData] = useState<InitData | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  // Session state
  const [step, setStep] = useState<Step>("warmup");
  // Durée de séance figée à l'entrée du récap (pas de chrono qui fait
  // re-rendre toute la séance chaque seconde : la barre du bas a le sien).
  const [sessionElapsed, setSessionElapsed] = useState(0);
  const [sessionStart, setSessionStart] = useState(0);

  // État de la séance en cours, sauvegardé à chaque changement (LivePlan).
  const [exercises, setExercises] = useState<ExerciseState[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [removedNames, setRemovedNames] = useState<string[]>([]);
  const [deferred, setDeferred] = useState<string[]>([]);
  const [focus, setFocus] = useState<string | null>(null);
  const [rest, setRest] = useState<LiveRest | null>(null);
  const [planReady, setPlanReady] = useState(false);

  // « Dernière fois » des exercices choisis en cours de séance.
  const [extraPrev, setExtraPrev] = useState<{ prevWeights: Record<string, PrevWeight>; prevSets: Record<string, PrevWeight[]> }>({
    prevWeights: {},
    prevSets: {},
  });

  // Feuilles du bas, vidéos, messages courts.
  const [swap, setSwap] = useState<{ mode: "busy" | "replace"; key: string } | null>(null);
  const [videoStates, setVideoStates] = useState<Record<string, VideoState>>({});
  const [videoDraft, setVideoDraft] = useState<{ key: string; localId: string; file: File; url: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [accessoriesOpen, setAccessoriesOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // Clavier ouvert sur un champ de la séance (note, charge, reps) : avec
  // l'appli native (Keyboard resize "body"), la barre de repos et la nav du
  // bas remontaient au-dessus du clavier et recouvraient le champ en cours
  // de saisie — la note d'exercice passait sous le bouton de fin de séance.
  const typing = useTypingInSession(step === "session");

  // Recap state
  const [feeling, setFeeling] = useState(3);
  const [energy, setEnergy] = useState(3);
  const [pump, setPump] = useState(3);
  const [sessionNotes, setSessionNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);

  // Toujours la dernière version des exercices pour les suites asynchrones
  // (réponse réseau, envoi de vidéo) qui ne doivent pas lire un état périmé.
  const exercisesRef = useRef<ExerciseState[]>([]);
  useEffect(() => {
    exercisesRef.current = exercises;
  }, [exercises]);

  const showNotice = useCallback((text: string) => {
    setNotice(text);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(null), 4500);
    return () => clearTimeout(id);
  }, [notice]);

  // ── Chargement et reprise exacte ────────────────────────────────────────────
  useEffect(() => {
    fetch(`/api/client/sessions/${sessionId}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: InitData) => {
        setInitData(data);
        // La version la plus récente gagne : téléphone (fermé en pleine
        // séance) ou serveur (autre appareil). Sinon les anciennes clés.
        const plan =
          newestPlan(loadLocalPlan(sessionId), parsePlan(data.session.live_state)) ??
          loadLegacyPlan(sessionId, data.exercises) ??
          emptyPlan();
        const exStates = restoreExercises(data, plan);
        setExercises(exStates);
        setRemoved(plan.removed);
        setRemovedNames(plan.removedNames);
        setDeferred(plan.deferred);
        setFocus(plan.focus && exStates.some((e) => e.key === plan.focus) ? plan.focus : firstOpenKey(exStates));

        if (!data.session.is_completed && plan.rest) {
          const age = Date.now() - plan.rest.startedAt;
          if (age >= 0 && age < REST_MAX_AGE_MS) setRest(plan.rest);
        }

        // Exercice retiré dont les séries n'avaient pas pu être effacées
        // (réseau coupé) : on retente, pour qu'il ne revienne jamais.
        const removedNameSet = new Set(plan.removedNames);
        const keptNames = new Set(exStates.map((e) => e.exercise.name));
        for (const s of data.existingSets) {
          if (removedNameSet.has(s.exercise_name) && !keptNames.has(s.exercise_name)) {
            fetch(`/api/client/sessions/${sessionId}/sets/${s.id}`, { method: "DELETE" }).catch(() => {});
          }
        }

        // Historique des remplaçants et ajouts déjà choisis.
        const programNames = new Set(data.exercises.map((e) => e.name.toLowerCase()));
        const missing = plan.added.map((e) => e.name).filter((n) => !programNames.has(n.toLowerCase()) && !(n.toLowerCase() in data.prevSets));
        if (missing.length > 0) {
          const qs = missing.slice(0, 10).map((n) => `name=${encodeURIComponent(n)}`).join("&");
          fetch(`/api/client/sessions/${sessionId}/previous?${qs}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((prev) => {
              if (prev) setExtraPrev((cur) => ({ prevWeights: { ...cur.prevWeights, ...prev.prevWeights }, prevSets: { ...cur.prevSets, ...prev.prevSets } }));
            })
            .catch(() => {});
        }

        if (data.session.is_completed) {
          setStep("recap");
        } else {
          // Séance active dès son chargement (bandeau « reprendre » ailleurs
          // dans l'appli), même pendant l'échauffement.
          try {
            localStorage.setItem("ep-active-session-id", sessionId);
          } catch {}
          if (data.session.warmup_validated) {
            setStep("session");
            let saved: string | null = null;
            try {
              saved = localStorage.getItem(`ep-session-start-${sessionId}`);
            } catch {}
            setSessionStart(saved ? parseInt(saved, 10) : new Date(data.session.created_at).getTime() || Date.now());
          }
        }
        setPlanReady(true);
        setLoading(false);
      })
      .catch((e) => {
        // 404 : la séance n'existe pas (ou plus). Le reste (réseau coupé en
        // salle) ne doit pas se faire passer pour une séance perdue.
        setLoadFailed(!(e instanceof Error && e.message === "HTTP 404"));
        setLoading(false);
      });
  }, [sessionId]);

  // ── Sauvegarde : téléphone tout de suite, serveur juste après ───────────────
  const lastSavedRef = useRef("");
  const pendingServerRef = useRef<LivePlan | null>(null);
  const serverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushServer = useCallback(
    (keepalive = false) => {
      if (serverTimerRef.current) {
        clearTimeout(serverTimerRef.current);
        serverTimerRef.current = null;
      }
      const plan = pendingServerRef.current;
      if (!plan) return;
      pendingServerRef.current = null;
      fetch(`/api/client/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ live_state: plan }),
        keepalive,
      })
        .then((r) => {
          if (!r.ok) throw new Error(String(r.status));
        })
        .catch(() => {
          // Réseau coupé : on garde l'envoi pour la prochaine occasion, sauf
          // si une version plus récente attend déjà.
          if (!pendingServerRef.current) pendingServerRef.current = plan;
        });
    },
    [sessionId]
  );

  const isCompleted = !!initData?.session.is_completed;
  useEffect(() => {
    if (!planReady || isCompleted || step === "recap") return;
    const plan = snapshotPlan(exercises, { removed, removedNames, deferred, focus, rest });
    const signature = JSON.stringify(plan);
    if (signature === lastSavedRef.current) return;
    lastSavedRef.current = signature;
    plan.updatedAt = Date.now();
    saveLocalPlan(sessionId, plan);
    pendingServerRef.current = plan;
    if (serverTimerRef.current) clearTimeout(serverTimerRef.current);
    serverTimerRef.current = setTimeout(() => flushServer(), 1500);
  }, [planReady, isCompleted, step, exercises, removed, removedNames, deferred, focus, rest, sessionId, flushServer]);

  // Appli mise en arrière-plan ou fermée : envoi immédiat de ce qui attend.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") flushServer(true);
    };
    const onPageHide = () => flushServer(true);
    const onOnline = () => flushServer();
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("online", onOnline);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("online", onOnline);
    };
  }, [flushServer]);

  // Écran gardé allumé pendant la séance, repris au retour au premier plan.
  useWakeLock(step === "session");

  // Notification système quand on quitte l'app pendant une séance active :
  // rien ne rappelait sinon qu'une séance tourne toujours.
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
        // indisponible (iOS Safari hors PWA)
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [step]);

  const handleWarmupValidate = useCallback(
    (seconds: number) => {
      // On passe à la séance tout de suite : warmup_validated ne sert qu'à
      // reprendre au bon endroit, jamais à bloquer si le réseau traîne.
      const startTime = Date.now();
      setSessionStart(startTime);
      try {
        localStorage.setItem(`ep-session-start-${sessionId}`, startTime.toString());
        localStorage.setItem("ep-active-session-id", sessionId);
        localStorage.removeItem(`ep-warmup-start-${sessionId}`);
      } catch {}
      setStep("session");

      const patchWarmup = () =>
        fetch(`/api/client/sessions/${sessionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ warmup_validated: true, warmup_duration_seconds: seconds }),
        });
      patchWarmup().catch(() => {
        patchWarmup().catch(() => {});
      });
    },
    [sessionId]
  );

  // ── Records ─────────────────────────────────────────────────────────────────
  const getEffectiveThreshold = useCallback(
    (exerciseName: string, excludeLocalId?: string): number | null =>
      computeThreshold(exercises, initData?.prMap ?? {}, exerciseName, excludeLocalId),
    [exercises, initData]
  );

  // Envois en vol, par set : un double-tap sur « Valider » partait en deux
  // requêtes et enregistrait deux fois la même série.
  const savingSetsRef = useRef<Set<string>>(new Set());
  // Séries supprimées pendant leur enregistrement : la ligne créée par le
  // POST en cours est effacée dès que le serveur répond, sinon elle
  // réapparaissait au rechargement.
  const removedWhileSavingRef = useRef<Set<string>>(new Set());
  const noteSaveTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const prevSetsFor = useCallback(
    (name: string): PrevWeight[] =>
      initData?.prevSets[name.toLowerCase()] ?? extraPrev.prevSets[name.toLowerCase()] ?? [],
    [initData, extraPrev]
  );
  const prevWeightFor = useCallback(
    (name: string): PrevWeight | null =>
      initData?.prevWeights[name.toLowerCase()] ?? extraPrev.prevWeights[name.toLowerCase()] ?? null,
    [initData, extraPrev]
  );

  // Enregistre (ou ré-enregistre) une série. La route POST est idempotente
  // sur (séance, exercice, numéro de série) : jamais de seconde ligne.
  // markValidated=false : ligne créée juste pour y rattacher une vidéo filmée
  // AVANT de valider la série (le formulaire reste ouvert).
  const persistSet = useCallback(
    async (exState: ExerciseState, set: SetState, markValidated = true): Promise<string | null> => {
      if (savingSetsRef.current.has(set.localId)) return set.dbId;
      savingSetsRef.current.add(set.localId);

      const ex = exState.exercise;
      const setIdx = Math.max(0, exState.sets.findIndex((s) => s.localId === set.localId));
      const form = techniqueForm(ex.technique, setIdx, exState.sets.length);
      const details = buildDetails(ex.technique, form, set.segs, set.partials);
      const weight = parseFloat(set.weightKg.replace(",", ".")) || null;
      const threshold = computeThreshold(exercisesRef.current, initData?.prMap ?? {}, ex.name, set.localId);
      const isPR = markValidated && weight != null && (threshold == null || weight > threshold);

      setExercises((prev) => patchSetIn(prev, set.localId, { saving: true }));

      let dbId: string | null = null;
      let failed = false;
      try {
        const res = await fetch(`/api/client/sessions/${sessionId}/sets`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            // Exercice ajouté ou remplaçant : id « local-… » sans ligne dans
            // la table exercises, jamais envoyé comme uuid.
            exercise_id: ex.id && !ex.id.startsWith("local-") ? ex.id : null,
            exercise_name: ex.name,
            muscle_group: ex.muscle_group ?? null,
            set_number: set.setNumber,
            reps_target: ex.reps ?? null,
            reps_actual: set.repsActual ? parseInt(set.repsActual, 10) : null,
            weight_kg: weight,
            previous_weight_kg: prevWeightFor(ex.name)?.weight ?? null,
            rir_target: ex.rir ?? null,
            rir_actual: set.rirActual ? parseInt(set.rirActual, 10) : null,
            standardization_score: set.standardizationScore ? parseInt(set.standardizationScore, 10) : null,
            is_pr: isPR,
            notes: exState.clientNotes || null,
            details,
            details_note: detailsAsNote(details),
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as { id?: string };
        dbId = typeof json.id === "string" ? json.id : null;
        if (!dbId) throw new Error("réponse sans identifiant");
      } catch (e) {
        console.error("Enregistrement du set impossible:", e);
        failed = true;
      }
      savingSetsRef.current.delete(set.localId);

      if (removedWhileSavingRef.current.has(set.localId)) {
        removedWhileSavingRef.current.delete(set.localId);
        if (dbId) fetch(`/api/client/sessions/${sessionId}/sets/${dbId}`, { method: "DELETE" }).catch(() => {});
        return null;
      }

      setExercises((prev) =>
        patchSetIn(prev, set.localId, {
          isPR,
          saving: false,
          // Seule une série validée peut être « en attente d'envoi ».
          saveFailed: markValidated ? failed : false,
          ...(dbId ? { dbId } : {}),
        })
      );
      return dbId;
    },
    [initData, sessionId, prevWeightFor]
  );

  // Séries validées hors ligne : renvoyées à la reprise et au retour du réseau.
  const retryFailed = useCallback(() => {
    for (const ex of exercisesRef.current) {
      for (const s of ex.sets) {
        if (s.validated && s.saveFailed && !s.saving) void persistSet(ex, s);
      }
    }
  }, [persistSet]);
  useEffect(() => {
    if (!planReady) return;
    const id = setTimeout(retryFailed, 1200);
    window.addEventListener("online", retryFailed);
    return () => {
      clearTimeout(id);
      window.removeEventListener("online", retryFailed);
    };
  }, [planReady, retryFailed]);

  // ── Repos ───────────────────────────────────────────────────────────────────
  // Referme le repos en cours et enregistre sa durée réelle sur la série
  // concernée (colonne rest_duration_seconds, exportée dans le CSV).
  const closeRest = useCallback(() => {
    if (!rest) return;
    if (rest.kind === "set" && rest.exKey != null && rest.setNumber != null) {
      const elapsed = Math.max(0, Math.round((Date.now() - rest.startedAt) / 1000));
      const ex = exercises.find((e) => e.key === rest.exKey);
      const set = ex?.sets.find((s) => s.setNumber === rest.setNumber);
      if (set) {
        setExercises((prev) => patchSetIn(prev, set.localId, { restDuration: elapsed }));
        if (set.dbId) {
          fetch(`/api/client/sessions/${sessionId}/sets/${set.dbId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rest_duration_seconds: elapsed }),
          }).catch(() => {});
        }
      }
    }
    setRest(null);
  }, [rest, exercises, sessionId]);

  const handlePause = useCallback(
    (seconds: number, label: string) => {
      closeRest();
      setRest({ startedAt: Date.now(), seconds, label, exKey: null, setNumber: null, kind: "pause" });
    },
    [closeRest]
  );

  // ── Séries ──────────────────────────────────────────────────────────────────
  const handleSetChange = useCallback((localId: string, patch: Partial<SetState>) => {
    setExercises((prev) => patchSetIn(prev, localId, patch));
  }, []);

  const handleValidateSet = useCallback(
    (exIdx: number, setIdx: number, values: Partial<SetState>) => {
      const exState = exercises[exIdx];
      const set = exState?.sets[setIdx];
      if (!exState || !set || set.saving || savingSetsRef.current.has(set.localId)) return;
      const merged: SetState = { ...set, ...values, validated: true, wasValidated: false };
      const isEdit = !!set.wasValidated;

      const nextExs = exercises.map((e, i) =>
        i === exIdx ? { ...e, sets: e.sets.map((s, k) => (k === setIdx ? merged : s)) } : e
      );
      setExercises(nextExs);
      setDeferred((d) => d.filter((k) => k !== exState.key));

      if (!isEdit) {
        // Repos lancé à la fin de la série, pas après l'aller-retour réseau.
        // Repos du programme d'abord, puis le réglage de l'appareil, puis le
        // barème par RIR. Superset : juste le temps de changer de poste.
        closeRest();
        const groups = exercises.map((e) => e.exercise.superset_group ?? null);
        const chainTo = !isLastOfSuperset(groups, exIdx) ? exercises[exIdx + 1]?.exercise.name ?? null : null;
        const programmed = exState.exercise.rest_seconds;
        const deviceRest = getDeviceSettings().restDefaultSeconds;
        const seconds = chainTo
          ? 15
          : programmed != null && programmed > 0
            ? programmed
            : deviceRest > 0
              ? deviceRest
              : getSuggestedRest(merged.rirActual ? parseInt(merged.rirActual, 10) : 2);
        setRest({
          startedAt: Date.now(),
          seconds,
          label: chainTo ? `${tr("Enchaîne :")} ${chainTo}` : "",
          exKey: exState.key,
          setNumber: set.setNumber,
          kind: "set",
        });
        setFocus(nextFocus(nextExs, exIdx));
      }
      void persistSet(nextExs[exIdx], merged);
    },
    [exercises, closeRest, persistSet, tr]
  );

  const handleEditSet = useCallback((localId: string) => {
    setExercises((prev) =>
      patchSetIn(prev, localId, { validated: false, wasValidated: true, isPR: false, saveFailed: false })
    );
  }, []);

  const handleRemoveSet = useCallback(
    (key: string, localId: string) => {
      const ex = exercises.find((e) => e.key === key);
      const removedSet = ex?.sets.find((s) => s.localId === localId);
      // Une ligne déjà en base (série dévalidée, ligne créée pour une vidéo)
      // est effacée aussi : sinon elle réapparaissait au rechargement.
      if (removedSet?.dbId) {
        fetch(`/api/client/sessions/${sessionId}/sets/${removedSet.dbId}`, { method: "DELETE" }).catch(() => {});
      }
      if (savingSetsRef.current.has(localId)) removedWhileSavingRef.current.add(localId);
      setExercises((prev) =>
        prev.map((e) => (e.key === key ? { ...e, sets: e.sets.filter((s) => s.localId !== localId) } : e))
      );
    },
    [exercises, sessionId]
  );

  const handleAddSet = useCallback((key: string) => {
    setExercises((prev) =>
      prev.map((e) => {
        if (e.key !== key) return e;
        // Le plus haut numéro déjà pris + 1, jamais length + 1 (doublons).
        const next = e.sets.reduce((m, s) => Math.max(m, s.setNumber), 0) + 1;
        return { ...e, sets: [...e.sets, emptySet(next)] };
      })
    );
  }, []);

  // ── Exercices : retirer, déplacer, machine prise, remplacer, ajouter ────────
  const fetchPrevious = useCallback(
    (name: string) => {
      const lower = name.toLowerCase();
      if (initData?.prevSets[lower] || extraPrev.prevSets[lower]) return;
      fetch(`/api/client/sessions/${sessionId}/previous?name=${encodeURIComponent(name)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((prev) => {
          if (prev) setExtraPrev((cur) => ({ prevWeights: { ...cur.prevWeights, ...prev.prevWeights }, prevSets: { ...cur.prevSets, ...prev.prevSets } }));
        })
        .catch(() => {});
    },
    [initData, extraPrev, sessionId]
  );

  // Retirer est définitif pour la séance (retour direct du fondateur : « si
  // je supprime un exo il réapparaît quand je rouvre l'appli ») : mémorisé
  // dans LivePlan, et ses séries déjà enregistrées sont effacées.
  const handleRemoveExercise = useCallback(
    async (key: string) => {
      const ex = exercises.find((e) => e.key === key);
      if (!ex) return;
      const done = ex.sets.filter((s) => s.validated).length;
      const ok = await confirm(
        done > 0
          ? `Retirer « ${ex.exercise.name} » de la séance ? Ses ${done} série${done > 1 ? "s" : ""} déjà faite${done > 1 ? "s" : ""} seront effacée${done > 1 ? "s" : ""}.`
          : `Retirer « ${ex.exercise.name} » de la séance ?`
      );
      if (!ok) return;
      for (const s of ex.sets) {
        if (s.dbId) fetch(`/api/client/sessions/${sessionId}/sets/${s.dbId}`, { method: "DELETE" }).catch(() => {});
      }
      const idx = exercises.findIndex((e) => e.key === key);
      const nextExs = exercises.filter((e) => e.key !== key);
      setExercises(nextExs);
      setRemoved((r) => (r.includes(key) ? r : [...r, key]));
      setRemovedNames((n) => (n.includes(ex.exercise.name) ? n : [...n, ex.exercise.name]));
      setDeferred((d) => d.filter((k) => k !== key));
      if (focus === key) {
        const after = nextExs.slice(idx).find(hasOpenSet) ?? nextExs.find(hasOpenSet);
        setFocus(after?.key ?? null);
      }
    },
    [exercises, confirm, sessionId, focus]
  );

  const handleMoveExercise = useCallback((key: string, dir: -1 | 1) => {
    setExercises((prev) => {
      const i = prev.findIndex((e) => e.key === key);
      const target = i + dir;
      if (i === -1 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[target]] = [next[target], next[i]];
      return next;
    });
  }, []);

  // « Machine prise » : l'exercice (ou son superset entier) passe après le
  // bloc suivant, marqué « À reprendre ». Le choix est mémorisé.
  const handleDefer = useCallback(
    (key: string) => {
      const idx = exercises.findIndex((e) => e.key === key);
      if (idx === -1) return;
      const blocks = blocksOf(exercises);
      const b = blocks.findIndex((bl) => bl.includes(idx));
      if (b === -1 || b >= blocks.length - 1) return;
      const order = [...blocks];
      [order[b], order[b + 1]] = [order[b + 1], order[b]];
      const nextExs = order.flat().map((i) => exercises[i]);
      const movedKeys = blocks[b].map((i) => exercises[i].key);
      setExercises(nextExs);
      setDeferred((d) => [...new Set([...d, ...movedKeys])]);
      // L'exercice qui remonte à sa place devient l'exercice en cours.
      const startPos = blocks.slice(0, b).flat().length;
      const open = (e: ExerciseState) => hasOpenSet(e) && !movedKeys.includes(e.key);
      const candidate =
        nextExs.slice(startPos).find(open) ?? nextExs.find(open) ?? nextExs.find(hasOpenSet) ?? null;
      setFocus(candidate?.key ?? null);
      setSwap(null);
      showNotice(tr("C'est noté : tu y reviens après."));
    },
    [exercises, showNotice, tr]
  );

  const handleReplace = useCallback(
    (key: string, alt: { name: string; muscleGroup: string | null; muscleSubgroup: string | null }) => {
      const idx = exercises.findIndex((e) => e.key === key);
      const ex = exercises[idx];
      if (!ex) return;
      const already = exercises.find((e) => e.exercise.name.toLowerCase() === alt.name.toLowerCase());
      if (already) {
        setSwap(null);
        setFocus(already.key);
        showNotice(tr("Cet exercice est déjà dans ta séance."));
        return;
      }
      const done = ex.sets.filter((s) => s.validated);
      const remaining = Math.max(1, ex.sets.length - done.length);
      const newEx: LiveExercise = {
        ...ex.exercise,
        id: `local-${newLocalId()}`,
        day_id: "",
        name: alt.name,
        muscle_group: alt.muscleGroup ?? ex.exercise.muscle_group,
        muscle_subgroup: alt.muscleSubgroup ?? null,
        sets: remaining,
        replaces: ex.exercise.replaces ?? ex.exercise.name,
      };
      const newState: ExerciseState = {
        key: newEx.id,
        exercise: newEx,
        sets: Array.from({ length: remaining }, (_, i) => emptySet(i + 1)),
        clientNotes: initData?.exerciseNotes[alt.name] ?? "",
      };
      // Lignes en base des séries pas faites (vidéo filmée avant de valider) :
      // effacées, elles n'appartiennent plus à rien.
      for (const s of ex.sets) {
        if (!s.validated && s.dbId) fetch(`/api/client/sessions/${sessionId}/sets/${s.dbId}`, { method: "DELETE" }).catch(() => {});
      }
      let nextExs: ExerciseState[];
      if (done.length === 0) {
        // Rien de fait : remplacé sur place, l'original disparaît de la séance.
        nextExs = exercises.map((e, i) => (i === idx ? newState : e));
        setRemoved((r) => (r.includes(key) ? r : [...r, key]));
        setRemovedNames((n) => (n.includes(ex.exercise.name) ? n : [...n, ex.exercise.name]));
      } else {
        // Séries déjà faites : elles restent, le remplaçant prend la suite.
        nextExs = [...exercises];
        nextExs[idx] = { ...ex, sets: done };
        nextExs.splice(idx + 1, 0, newState);
      }
      setRemovedNames((n) => n.filter((x) => x !== alt.name));
      setExercises(nextExs);
      setDeferred((d) => d.filter((k) => k !== key));
      setFocus(newState.key);
      setSwap(null);
      fetchPrevious(alt.name);
    },
    [exercises, initData, sessionId, fetchPrevious, showNotice, tr]
  );

  const handleAddExercise = useCallback(
    (input: { name: string; muscleGroup: string | null }) => {
      // Déjà présent sous ce nom : une seconde carte partagerait les mêmes
      // séries en base. On ajoute plutôt une série à la carte existante.
      const existing = exercises.find((e) => e.exercise.name === input.name);
      if (existing) {
        handleAddSet(existing.key);
        setFocus(existing.key);
        return;
      }
      const newExercise: LiveExercise = {
        id: `local-${newLocalId()}`,
        day_id: "",
        name: input.name,
        sets: 1,
        reps: null,
        rir: null,
        rest_seconds: null,
        notes: null,
        position: exercises.length,
        muscle_group: input.muscleGroup,
        muscle_subgroup: null,
        is_direct: true,
      };
      setExercises((prev) => [
        ...prev,
        { key: newExercise.id, exercise: newExercise, sets: [emptySet(1)], clientNotes: initData?.exerciseNotes[input.name] ?? "" },
      ]);
      setRemovedNames((n) => n.filter((x) => x !== input.name));
      setFocus(newExercise.id);
      fetchPrevious(input.name);
    },
    [exercises, handleAddSet, initData, fetchPrevious]
  );

  // Note libre par exercice (client_exercise_notes) : écran tout de suite,
  // enregistrement 800 ms après la dernière frappe.
  const handleExerciseNotesChange = useCallback((key: string, exerciseName: string, notes: string) => {
    const existing = noteSaveTimersRef.current.get(exerciseName);
    if (existing) clearTimeout(existing);
    noteSaveTimersRef.current.set(
      exerciseName,
      setTimeout(() => {
        noteSaveTimersRef.current.delete(exerciseName);
        fetch("/api/client/exercise-notes", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ exercise_name: exerciseName, note: notes }),
        }).catch(() => {});
      }, 800)
    );
    setExercises((prev) => prev.map((e) => (e.key === key ? { ...e, clientNotes: notes } : e)));
  }, []);

  // ── Vidéo d'une série ───────────────────────────────────────────────────────
  const videoFilesRef = useRef<Map<string, { file: File; sendToCoach: boolean }>>(new Map());
  const setVideo = useCallback((localId: string, patch: Partial<VideoState> | null) => {
    setVideoStates((cur) => {
      if (patch === null) {
        const next = { ...cur };
        delete next[localId];
        return next;
      }
      const base: VideoState = cur[localId] ?? { status: "uploading", progress: null, sendToCoach: false };
      return { ...cur, [localId]: { ...base, ...patch } };
    });
  }, []);

  const handleFilm = useCallback(
    (key: string, localId: string, file: File) => {
      if (!isProbablyVideo(file)) {
        showNotice(tr("Ce fichier n'est pas une vidéo."));
        return;
      }
      if (file.size > MAX_VIDEO_BYTES) {
        showNotice(`${tr("Vidéo trop lourde")} (${formatBytes(file.size)}, ${tr("100 Mo maximum")}). ${tr("Filme juste la série.")}`);
        return;
      }
      setVideoDraft({ key, localId, file, url: URL.createObjectURL(file) });
    },
    [showNotice, tr]
  );

  const closeVideoDraft = useCallback(() => {
    setVideoDraft((d) => {
      if (d) URL.revokeObjectURL(d.url);
      return null;
    });
  }, []);

  const findSet = (key: string, localId: string) => {
    const ex = exercisesRef.current.find((e) => e.key === key);
    const idx = ex ? ex.sets.findIndex((s) => s.localId === localId) : -1;
    return ex && idx !== -1 ? { ex, set: ex.sets[idx], position: idx + 1 } : null;
  };

  const sendVideoToCoach = useCallback(
    async (key: string, localId: string) => {
      const found = findSet(key, localId);
      if (!found?.set.dbId) return;
      setVideo(localId, { status: "sending", progress: null, sendToCoach: true, error: undefined });
      try {
        const res = await fetch(`/api/client/sessions/${sessionId}/sets/${found.set.dbId}/send-video`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ position: found.position }),
        });
        const json = (await res.json().catch(() => ({}))) as { error?: string; sentAt?: string };
        if (!res.ok) throw new Error(json.error || tr("Envoi au coach impossible, réessaie."));
        setExercises((prev) => patchSetIn(prev, localId, { videoSentAt: json.sentAt ?? new Date().toISOString() }));
        setVideo(localId, { status: "sent", error: undefined });
        videoFilesRef.current.delete(localId);
        showNotice(tr("Vidéo envoyée à ton coach."));
      } catch (e) {
        const msg = e instanceof Error ? e.message : tr("Envoi au coach impossible, réessaie.");
        setVideo(localId, { status: "error", error: msg });
        showNotice(msg);
      }
    },
    [sessionId, setVideo, showNotice, tr]
  );

  const uploadVideo = useCallback(
    async (key: string, localId: string) => {
      const entry = videoFilesRef.current.get(localId);
      const found = findSet(key, localId);
      if (!entry || !found || !initData) return;
      setVideo(localId, { status: "uploading", progress: 0, sendToCoach: entry.sendToCoach, error: undefined });
      try {
        // Filmer AVANT de valider est l'ordre logique en salle : la ligne de
        // la série est créée sans la valider, juste pour y rattacher la vidéo.
        const dbId = found.set.dbId ?? (await persistSet(found.ex, found.set, found.set.validated));
        if (!dbId) throw new Error(tr("Série pas encore enregistrée, vérifie ta connexion."));
        const type = normalizeVideoType(entry.file);
        const path = `${initData.session.client_id}/${sessionId}/${dbId}-${Date.now()}.${videoExtension(type)}`;
        await uploadSetVideo(path, entry.file, (p) => setVideo(localId, { progress: p }));
        const res = await fetch(`/api/client/sessions/${sessionId}/sets/${dbId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ video_url: path }),
        });
        if (!res.ok) throw new Error(tr("Vidéo envoyée mais pas rattachée à la série, réessaie."));
        setExercises((prev) => patchSetIn(prev, localId, { hasVideo: true, dbId }));
        if (entry.sendToCoach) {
          await sendVideoToCoach(key, localId);
        } else {
          setVideo(localId, { status: "uploaded", progress: 1 });
          videoFilesRef.current.delete(localId);
          showNotice(tr("Vidéo enregistrée avec ta série."));
        }
      } catch (e) {
        const msg = e instanceof Error && e.message ? e.message : tr("Échec de l'envoi de la vidéo, réessaie.");
        setVideo(localId, { status: "error", error: msg });
        showNotice(msg);
      }
    },
    [initData, sessionId, persistSet, sendVideoToCoach, setVideo, showNotice, tr]
  );

  const confirmVideo = useCallback(
    (sendToCoach: boolean) => {
      if (!videoDraft) return;
      videoFilesRef.current.set(videoDraft.localId, { file: videoDraft.file, sendToCoach });
      const { key, localId } = videoDraft;
      closeVideoDraft();
      void uploadVideo(key, localId);
    },
    [videoDraft, closeVideoDraft, uploadVideo]
  );

  const retryVideo = useCallback(
    (key: string, localId: string) => {
      const found = findSet(key, localId);
      if (found?.set.hasVideo) {
        void sendVideoToCoach(key, localId);
      } else if (videoFilesRef.current.has(localId)) {
        void uploadVideo(key, localId);
      } else {
        setVideo(localId, null);
        showNotice(tr("Vidéo perdue (appli fermée pendant l'envoi) : refilme ta série."));
      }
    },
    [sendVideoToCoach, uploadVideo, setVideo, showNotice, tr]
  );

  // ── Dérivés ─────────────────────────────────────────────────────────────────
  const volumeByMuscle: Record<string, number> = {};
  for (const ex of exercises) {
    const mg = ex.exercise.muscle_group;
    if (!mg) continue;
    const validated = ex.sets.filter((s) => s.validated).length;
    if (validated > 0) volumeByMuscle[mg] = (volumeByMuscle[mg] ?? 0) + validated;
  }
  const validatedSets = exercises.flatMap((ex) => ex.sets.filter((s) => s.validated && s.rirActual !== ""));
  const avgRIR =
    validatedSets.length > 0
      ? validatedSets.reduce((s, v) => s + parseInt(v.rirActual || "0"), 0) / validatedSets.length
      : null;

  // Un seul record par exercice (la série la plus lourde), et seulement s'il
  // bat le record en base. Séance déjà terminée : drapeaux enregistrés.
  const sessionRecords = computeSessionRecords(exercises, initData?.prMap ?? {});
  const sessionPRs = (
    initData?.session.is_completed ? recordsFromFlags(exercises) : [...sessionRecords.values()]
  ).map((r) => ({ exerciseName: r.exerciseName, weightKg: r.weightKg, reps: r.reps }));

  const [canceling, setCanceling] = useState(false);

  // Abandonner une séance de test/erreur sans rien enregistrer.
  const handleCancelSession = useCallback(async () => {
    if (!(await confirm("Annuler cette séance ? Rien ne sera enregistré."))) return;
    setCanceling(true);
    try {
      await fetch(`/api/client/sessions/${sessionId}`, { method: "DELETE" });
    } catch {
      // best-effort : on quitte quand même
    }
    pendingServerRef.current = null;
    clearSessionLocal(sessionId);
    router.push(returnPath);
  }, [sessionId, returnPath, router, confirm]);

  const goToRecap = useCallback(() => {
    // Referme le repos du dernier set : sans set suivant, sa durée ne serait
    // jamais enregistrée.
    closeRest();
    flushServer();
    setSessionElapsed(sessionStart > 0 ? Math.floor((Date.now() - sessionStart) / 1000) : 0);
    setStep("recap");
    window.scrollTo({ top: 0 });
  }, [closeRest, flushServer, sessionStart]);

  const handleCompleteSession = useCallback(async () => {
    setSaving(true);
    try {
      const workoutData = exercises.map((ex) => {
        const validated = ex.sets.filter((s) => s.validated);
        const withRIR = validated.filter((s) => s.rirActual !== "");
        const avgRirEx = withRIR.length > 0 ? withRIR.reduce((s, v) => s + parseInt(v.rirActual || "0"), 0) / withRIR.length : null;
        const maxWeight = validated.map((s) => parseFloat(s.weightKg) || 0).reduce((a, b) => Math.max(a, b), 0);
        return {
          exerciseName: ex.exercise.name,
          muscleGroup: ex.exercise.muscle_group ?? "",
          isDirect: ex.exercise.is_direct ?? true,
          setsCompleted: validated.length,
          rirActual: avgRirEx != null ? Math.round(avgRirEx) : null,
          weightKg: maxWeight > 0 ? maxWeight : null,
        };
      });

      setCompleteError(null);
      const res = await fetch(`/api/client/sessions/${sessionId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          duration_minutes: Math.round(sessionElapsed / 60),
          general_feeling: feeling,
          energy_level: energy,
          pump,
          notes: sessionNotes,
          prs: [...computeSessionRecords(exercises, initData?.prMap ?? {}).values()].map((r) => ({
            exerciseName: r.exerciseName,
            weightKg: r.weightKg,
            reps: r.reps,
          })),
          workoutData,
        }),
      });
      // Erreur serveur : on reste sur le récap, rien n'est perdu.
      if (!res.ok) {
        setCompleteError("La séance n'a pas pu être sauvegardée. Réessaie.");
        setSaving(false);
        return;
      }
      pendingServerRef.current = null;
      clearSessionLocal(sessionId);
      router.push(returnPath);
    } catch {
      setCompleteError("Pas de connexion, la séance n'est pas encore sauvegardée. Réessaie.");
      setSaving(false);
    }
  }, [exercises, sessionId, sessionElapsed, feeling, energy, pump, sessionNotes, initData, router, returnPath]);

  const [reopening, setReopening] = useState(false);
  const [reopenError, setReopenError] = useState<string | null>(null);

  // Rouvrir une séance terminée par erreur (le jour même) : défait le récap
  // (PR, volume, points), les séries restent. Voir .../reopen.
  const handleReopenSession = useCallback(async () => {
    if (!(await confirm("Rouvrir cette séance ? Le récap (PR, volume, points) sera annulé, tes sets restent."))) return;
    setReopening(true);
    setReopenError(null);
    try {
      const res = await fetch(`/api/client/sessions/${sessionId}/reopen`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setReopenError(json.error ?? "Erreur, réessaie.");
        setReopening(false);
        return;
      }
      window.location.reload();
    } catch {
      setReopenError("Erreur, réessaie.");
      setReopening(false);
    }
  }, [sessionId, confirm]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-(--ep-accent) border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!initData) {
    return (
      <div className="px-6 py-8 text-center">
        {loadFailed ? (
          <>
            <p className="text-(--ep-ink)/60 text-sm mb-1">{tr("Impossible de charger la séance.")}</p>
            <p className="text-(--ep-ink)/35 text-xs mb-4">
              {tr("Vérifie ta connexion : tes séries déjà validées sont enregistrées.")}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="ep-btn-primary"
              style={{ padding: "12px 22px", fontSize: 12, borderRadius: 12 }}
            >
              {tr("Réessayer")}
            </button>
          </>
        ) : (
          <p className="text-(--ep-ink)/40">{tr("Séance introuvable")}</p>
        )}
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
        movementPreps={buildMovementPreps(initData.exercises, initData.prevWeights, initData.prevSets)}
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

    const recapBreakdownSets = session.is_completed
      ? initData.existingSets
      : exercises.flatMap((ex) =>
          ex.sets
            .filter((st) => st.validated)
            .map((st) => {
              const reps = parseInt(st.repsActual, 10);
              const rirValue = parseInt(st.rirActual, 10);
              return {
                id: st.localId,
                exercise_name: ex.exercise.name,
                set_number: st.setNumber,
                weight_kg: setWeight(st),
                reps_actual: Number.isFinite(reps) ? reps : null,
                rir_actual: Number.isFinite(rirValue) ? rirValue : null,
                is_pr: sessionRecords.get(ex.exercise.name.toLowerCase())?.localId === st.localId,
                notes: null,
                video_url: null,
              };
            })
        );

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
      <div className="px-6 py-8 max-w-2xl mx-auto pb-24 page-transition">
        {/* Header */}
        <div className="mb-6">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-(--ep-ink)/35 mb-1">
            {tr("Récap de séance")}
          </p>
          <h1 className="text-2xl font-black uppercase">{session.day_label}</h1>
          <p className="text-xs text-(--ep-ink)/35 mt-1">
            {/* Séance passée : SA date et SA durée enregistrée. Avant, le
                récap d'une séance terminée affichait la date du jour et
                "00:00" (le chrono de séance ne tourne que pendant
                l'entraînement). Séance en cours : aujourd'hui + chrono. */}
            {new Intl.DateTimeFormat("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            }).format(
              session.is_completed ? new Date(session.session_date + "T12:00:00") : new Date()
            )}
            {session.is_completed
              ? session.duration_minutes != null && ` · ${session.duration_minutes} min de séance`
              : ` · ${formatTime(sessionElapsed)} de séance`}
          </p>
        </div>

        {/* Stats summary */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          {[
            { label: tr("Sets"), value: String(totalSetsCompleted), icon: Dumbbell, color: "var(--ep-accent)" },
            { label: tr("RIR moy."), value: avgRIR != null ? String(Math.round(avgRIR * 10) / 10) : "···", icon: Activity, color: "var(--ep-ok)" },
            { label: tr("Score tech."), value: avgScore > 0 ? `${Math.round(avgScore * 10) / 10}/5` : "···", icon: Star, color: "var(--ep-warn)" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div
              key={label}
              className="bg-(--ep-s1) border border-(--ep-line)/25 rounded-xl p-3 flex flex-col items-center gap-1.5"
            >
              <Icon size={16} style={{ color }} strokeWidth={1.8} />
              <p className="text-xl font-black text-(--ep-strong)">{value}</p>
              <p className="text-[9px] font-semibold uppercase tracking-widest text-(--ep-ink)/35">
                {label}
              </p>
            </div>
          ))}
        </div>

        {/* PRs */}
        {sessionPRs.length > 0 && (
          <div className="bg-(--ep-gold)/10 border border-(--ep-gold)/30 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Trophy size={14} className="text-(--ep-gold)" />
              <p className="text-xs font-black uppercase tracking-widest text-(--ep-gold)">
                {sessionPRs.length}{" "}{tr("nouveau")}{sessionPRs.length > 1 ? "x" : ""}{" "}{tr("PR")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {sessionPRs.map((pr, i) => (
                <span
                  key={i}
                  className="text-xs font-bold text-(--ep-gold) bg-(--ep-gold)/10 px-2.5 py-1 rounded-full border border-(--ep-gold)/25"
                >
                  {pr.exerciseName} : {pr.weightKg}{" "}{tr("kg")}
                </span>
              ))}
            </div>
            {/* Le PR est détecté ici, mais rien ne poussait le client vers
                Victoires ensuite — l'onglet est resté vide malgré des PR
                réels en logbook. Pré-remplit le post plutôt que de le
                publier à sa place : partager reste son choix. */}
            <a
              href={`${communityBasePath}/communaute/victoires?share=${encodeURIComponent(buildPRShareText(sessionPRs))}`}
              className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-(--ep-gold)/15 hover:bg-(--ep-gold)/25 text-(--ep-gold) px-3 min-h-11 rounded-lg border border-(--ep-gold)/35 transition-colors"
            >
              <Trophy size={11} />{" "}{tr("Partager en Victoire")}
            </a>
          </div>
        )}

        {/* Feeling sliders */}
        <div className="bg-(--ep-s1) border border-(--ep-line)/25 rounded-xl p-5 mb-5 space-y-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-(--ep-ink)/35">
            {tr("Ressenti global")}
          </p>
          {!session.is_completed && (
            <>
              <SliderInput label={tr("Énergie générale")} value={energy} onChange={setEnergy} />
              <SliderInput label={tr("Pump")} value={pump} onChange={setPump} />
              <SliderInput label={tr("Feeling global")} value={feeling} onChange={setFeeling} />
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-widest text-(--ep-ink)/35 block mb-1.5">
                  {tr("Notes libres")}
                </label>
                <textarea
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  placeholder={tr("Observations, fatigue particulière, douleurs...")} aria-label={tr("Observations, fatigue particulière, douleurs...")}
                  rows={3}
                  className="w-full bg-(--ep-s2) border border-(--ep-line)/30 rounded-lg px-3 py-2.5 text-sm text-(--ep-strong) placeholder:text-(--ep-ink)/20 focus:outline-none focus:border-(--ep-accent)/50 resize-none"
                />
              </div>
            </>
          )}
          {session.is_completed && (
            <div className="flex gap-4">
              <div className="text-center">
                <p className="text-2xl font-black text-(--ep-strong)">{session.energy_level ?? "···"}</p>
                <p className="text-[9px] text-(--ep-ink)/30 uppercase tracking-wider">{tr("Énergie")}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-(--ep-strong)">{session.pump ?? "···"}</p>
                <p className="text-[9px] text-(--ep-ink)/30 uppercase tracking-wider">{tr("Pump")}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-(--ep-strong)">{session.general_feeling ?? "···"}</p>
                <p className="text-[9px] text-(--ep-ink)/30 uppercase tracking-wider">{tr("Feeling")}</p>
              </div>
            </div>
          )}
          {/* Les notes libres saisies en fin de séance n'étaient visibles
              nulle part dans le récap. */}
          {session.is_completed && session.notes && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-(--ep-ink)/35 mb-1.5">
                {tr("Notes libres")}
              </p>
              <p className="text-sm text-(--ep-ink)/70 leading-relaxed whitespace-pre-wrap break-words">
                {session.notes}
              </p>
            </div>
          )}
        </div>

        {/* Détail des séries : ce qui a vraiment été fait, exercice par
            exercice (poids × reps, RIR, PR, vidéo). Le récap ne montrait
            que 3 graphiques. Séance terminée : les séries enregistrées en
            base ; séance en cours : les séries validées à l'écran, pour
            relire avant de sauvegarder. */}
        {recapBreakdownSets.length > 0 && (
          <div className="bg-(--ep-s1) border border-(--ep-line)/25 rounded-xl p-5 mb-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-(--ep-ink)/35 mb-3">
              {tr("Détail des séries")}
            </p>
            <SessionSetsBreakdown
              sets={recapBreakdownSets}
              videoUrlFor={(s) => initData.videoUrlsBySetId?.[s.id] ?? null}
            />
          </div>
        )}

        {/* Charts */}
        {volumeData.length > 0 && (
          <div className="bg-(--ep-s1) border border-(--ep-line)/25 rounded-xl p-5 mb-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-(--ep-ink)/35 mb-4">
              {tr("Volume par muscle (sets)")}
            </p>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={volumeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(var(--ep-line-rgb),0.15)" />
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
                        sets < lm.mev ? "var(--ep-bad)" : sets <= lm.mav ? "var(--ep-ok)" : "var(--ep-warn)";
                      return <Cell key={i} fill={color} />;
                    })}
                  </Bar>
                  <Bar dataKey="mev" fill="rgba(var(--ep-line-rgb),0.2)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {rirData.length > 0 && (
          <div className="bg-(--ep-s1) border border-(--ep-line)/25 rounded-xl p-5 mb-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-(--ep-ink)/35 mb-4">
              {tr("RIR moyen par exercice")}
            </p>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rirData} layout="vertical">
                  <XAxis type="number" domain={[0, 5]} tick={TICK_STYLE} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" tick={TICK_STYLE} axisLine={false} tickLine={false} width={55} />
                  <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`RIR ${v}`, ""]} />
                  <Bar dataKey="rir" fill="var(--ep-ok)" radius={[0, 3, 3, 0]}>
                    {rirData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={
                          entry.rir <= 1 ? "var(--ep-bad)" : entry.rir <= 3 ? "var(--ep-ok)" : "var(--ep-info)"
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
          <div className="bg-(--ep-s1) border border-(--ep-line)/25 rounded-xl p-5 mb-6">
            <p className="text-[10px] font-bold uppercase tracking-widest text-(--ep-ink)/35 mb-4">
              {tr("Score standardisation par exercice")}
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
                          entry.score < 3 ? "var(--ep-bad)" : entry.score < 4 ? "var(--ep-warn)" : "var(--ep-ok)"
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
            {completeError && (
              <div className="flex items-start gap-2 bg-(--ep-bad)/10 border border-(--ep-bad)/25 rounded-xl px-4 py-3 mb-3">
                <AlertCircle size={14} className="text-(--ep-bad) flex-shrink-0 mt-0.5" />
                <p className="text-xs text-(--ep-bad)">{completeError}</p>
              </div>
            )}
            <button
              onClick={handleCompleteSession}
              disabled={saving || canceling}
              className="w-full py-4 bg-(--ep-accent) hover:bg-(--ep-accent-2) text-(--ep-strong) text-sm font-black uppercase tracking-widest rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  {tr("Enregistrer la séance")}
                </>
              )}
            </button>
            <button
              onClick={handleCancelSession}
              disabled={saving || canceling}
              className="w-full mt-3 min-h-11 text-[11px] font-bold uppercase tracking-widest text-(--ep-ink)/45 hover:text-(--ep-bad) transition-colors disabled:opacity-50"
            >
              {canceling ? tr("Annulation…") : tr("Annuler la séance (rien ne sera enregistré)")}
            </button>
          </>
        )}

        {/* Rouvrir une séance terminée par erreur — uniquement le jour même
            (voir app/api/client/sessions/[id]/reopen, même borne côté
            serveur). Ne remplace pas "Annuler" ci-dessus : celui-là supprime
            une séance jamais terminée, celui-ci rouvre une séance terminée
            par erreur pour la corriger. */}
        {session.is_completed && session.session_date === todayInParis() && (
          <div className="mt-2">
            {reopenError && (
              <p className="text-[11px] text-(--ep-bad) text-center mb-2">{reopenError}</p>
            )}
            <button
              onClick={handleReopenSession}
              disabled={reopening}
              className="w-full py-3 flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-(--ep-ink)/35 hover:text-(--ep-warn) border border-(--ep-line)/25 hover:border-(--ep-warn)/40 rounded-xl transition-colors disabled:opacity-50"
            >
              {reopening ? (
                <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <RotateCcw size={13} />
              )}
              {reopening ? tr("Réouverture…") : tr("Terminée par erreur ? Rouvrir la séance")}
            </button>
          </div>
        )}
      </div>
    );
  }


  // ── SESSION ──────────────────────────────────────────────────────────────────
  const totalSetsAll = exercises.reduce((n, e) => n + e.sets.length, 0);
  const doneSetsAll = exercises.reduce((n, e) => n + e.sets.filter((s) => s.validated).length, 0);
  const allSetsDone = totalSetsAll > 0 && doneSetsAll >= totalSetsAll;
  const groups = exercises.map((e) => e.exercise.superset_group ?? null);
  const tags = supersetLabels(groups);
  const blocks = blocksOf(exercises);
  // Accessoires à prévoir : uniquement le bagage choisi explicitement par
  // exercice (exercise_library.accessories), voir lib/session-accessories.ts.
  const sessionAccessories = accessoriesForSession(
    exercises.map((e) => e.exercise.name),
    initData.accessoriesByName
  );

  // Prochaine série à faire, affichée dans la barre du bas.
  const focusedEx = exercises.find((e) => e.key === focus) ?? exercises.find(hasOpenSet) ?? null;
  const nextSetIdx = focusedEx ? focusedEx.sets.findIndex((s) => !s.validated) : -1;
  const nextLabel =
    focusedEx && nextSetIdx !== -1
      ? `${tr("Ensuite :")} ${focusedEx.exercise.name} · ${tr("série")} ${nextSetIdx + 1}/${focusedEx.sets.length}`
      : doneSetsAll > 0
        ? tr("Toutes tes séries sont faites, bravo !")
        : null;

  const swapEx = swap ? exercises.find((e) => e.key === swap.key) ?? null : null;
  const swapIdx = swapEx ? exercises.indexOf(swapEx) : -1;
  const swapBlock = swapIdx !== -1 ? blocks.findIndex((bl) => bl.includes(swapIdx)) : -1;
  const videoDraftCaption = (() => {
    if (!videoDraft) return "";
    const ex = exercises.find((e) => e.key === videoDraft.key);
    const idx = ex ? ex.sets.findIndex((s) => s.localId === videoDraft.localId) : -1;
    return ex ? `${ex.exercise.name} · ${tr("série")} ${idx + 1}` : "";
  })();

  const renderBlock = (exIdx: number) => {
    const exState = exercises[exIdx];
    const isLast = isLastOfSuperset(groups, exIdx);
    return (
      <ExerciseBlock
        key={exState.key}
        ex={exState}
        focused={focus === exState.key}
        deferred={deferred.includes(exState.key)}
        supersetTag={tags[exIdx] ?? null}
        chainNextName={exState.exercise.superset_group && !isLast ? exercises[exIdx + 1]?.exercise.name ?? null : null}
        prevSets={prevSetsFor(exState.exercise.name)}
        prevWeight={prevWeightFor(exState.exercise.name)}
        recordHolderId={sessionRecords.get(exState.exercise.name.toLowerCase())?.localId ?? null}
        getPrThreshold={(excludeLocalId) => getEffectiveThreshold(exState.exercise.name, excludeLocalId)}
        libraryTip={initData.libraryByName[exState.exercise.name.toLowerCase()]}
        videoStates={videoStates}
        hasCoach={!!initData.hasCoach}
        canMoveUp={exIdx > 0}
        canMoveDown={exIdx < exercises.length - 1}
        onFocus={() => setFocus((f) => (f === exState.key ? null : exState.key))}
        onSetChange={(setIdx, patch) => handleSetChange(exState.sets[setIdx].localId, patch)}
        onValidateSet={(setIdx, values) => handleValidateSet(exIdx, setIdx, values)}
        onEditSet={(setIdx) => handleEditSet(exState.sets[setIdx].localId)}
        onRemoveSet={(setIdx) => handleRemoveSet(exState.key, exState.sets[setIdx].localId)}
        onAddSet={() => handleAddSet(exState.key)}
        onRetrySave={(setIdx) => void persistSet(exState, exState.sets[setIdx])}
        onBusy={() => setSwap({ mode: "busy", key: exState.key })}
        onReplace={() => setSwap({ mode: "replace", key: exState.key })}
        onRemove={() => void handleRemoveExercise(exState.key)}
        onMove={(dir) => handleMoveExercise(exState.key, dir)}
        onNotesChange={(notes) => handleExerciseNotesChange(exState.key, exState.exercise.name, notes)}
        onFilm={(setIdx, file) => handleFilm(exState.key, exState.sets[setIdx].localId, file)}
        onRetryVideo={(setIdx) => retryVideo(exState.key, exState.sets[setIdx].localId)}
        onSendVideo={(setIdx) => void sendVideoToCoach(exState.key, exState.sets[setIdx].localId)}
        onPause={handlePause}
      />
    );
  };

  return (
    <div className="pb-40">
      {/* En-tête : la séance, le chrono (toujours visible), la progression.
          Terminer / annuler passent dans le menu « ⋯ » : plus de bouton de
          fin planté en permanence (retour direct 2026-10-20). */}
      <div className="sticky top-0 z-30 bg-(--ep-s2) border-b border-(--ep-line)/25 px-3 pt-[max(8px,env(safe-area-inset-top))] pb-2">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black uppercase tracking-tight text-(--ep-strong) truncate leading-5">{session.day_label}</p>
              <p className="text-[11px] text-(--ep-ink)/55 tabular-nums leading-4 truncate">
                {doneSetsAll}/{totalSetsAll} {tr("séries")}
                {avgRIR != null ? ` · ${tr("RIR moy.")} ${Math.round(avgRIR * 10) / 10}` : ""}
              </p>
            </div>
            <SessionClock sessionStart={sessionStart} rest={rest} showRest={typing} />
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label={tr("Options de la séance")}
                className="h-11 w-11 -mr-1.5 flex items-center justify-center rounded-xl text-(--ep-ink)/60 active:bg-(--ep-line)/15"
              >
                <MoreVertical size={18} />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" aria-hidden onClick={() => setMenuOpen(false)} />
                  <div
                    role="menu"
                    className="absolute right-0 top-full mt-1 z-50 w-60 rounded-xl border border-(--ep-line)/35 bg-(--ep-s4) p-1 shadow-[0_12px_32px_rgba(var(--ep-shade-rgb),0.45)]"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        goToRecap();
                      }}
                      className="w-full min-h-11 px-3 flex items-center gap-2 rounded-lg text-left text-[13px] font-bold text-(--ep-strong) active:bg-(--ep-line)/15"
                    >
                      <Flag size={15} className="text-(--ep-accent)" />
                      {tr("Terminer la séance")}
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      disabled={canceling}
                      onClick={() => {
                        setMenuOpen(false);
                        void handleCancelSession();
                      }}
                      className="w-full min-h-11 px-3 flex items-center gap-2 rounded-lg text-left text-[13px] font-bold text-(--ep-bad) active:bg-(--ep-bad)/10 disabled:opacity-50"
                    >
                      <Trash2 size={15} />
                      {canceling ? tr("Annulation…") : tr("Annuler la séance")}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="mt-1.5 h-1 rounded-full bg-(--ep-line)/20 overflow-hidden">
            <div
              className="h-full rounded-full transition-[width] duration-300"
              style={{
                width: `${totalSetsAll > 0 ? (doneSetsAll / totalSetsAll) * 100 : 0}%`,
                background: allSetsDone ? "var(--ep-ok)" : "var(--ep-accent)",
              }}
            />
          </div>
        </div>
      </div>

      <div className="px-3 pt-3 max-w-2xl mx-auto space-y-2">
        {/* À prévoir : replié en une ligne, déplié au tap. */}
        {sessionAccessories.length > 0 && (
          <div className="rounded-2xl border border-(--ep-line)/20 bg-(--ep-s1)">
            <button
              type="button"
              onClick={() => setAccessoriesOpen((v) => !v)}
              aria-expanded={accessoriesOpen}
              className="w-full min-h-11 flex items-center gap-2 px-3 text-left"
            >
              <Backpack size={14} className="text-(--ep-ink)/45 shrink-0" />
              <span className="flex-1 min-w-0 truncate text-[12px] font-bold text-(--ep-ink)/70">
                {tr("À prévoir :")} {sessionAccessories.map((a) => a.accessory).join(", ")}
              </span>
              <ChevronDown size={14} className="text-(--ep-ink)/35 shrink-0" style={{ transform: accessoriesOpen ? "rotate(180deg)" : undefined }} />
            </button>
            {accessoriesOpen && (
              <ul className="px-3 pb-3 space-y-2">
                {sessionAccessories.map((a) => (
                  <li key={a.accessory}>
                    {a.url ? (
                      <a href={a.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[12px] font-bold text-(--ep-strong)">
                        {a.accessory}
                        <ExternalLink size={10} className="text-(--ep-ink)/30" />
                      </a>
                    ) : (
                      <span className="text-[12px] font-bold text-(--ep-strong)">{a.accessory}</span>
                    )}
                    <span className="block text-[11px] text-(--ep-ink)/45 leading-snug">{a.reason}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {exercises.length === 0 && (
          <div className="bg-(--ep-s1) border border-(--ep-line)/20 rounded-2xl px-5 py-8 text-center">
            <p className="text-sm text-(--ep-ink)/50">{tr("Séance libre, ajoute tes exercices ci-dessous")}</p>
          </div>
        )}

        {blocks.map((bl) => {
          if (bl.length === 1) return <Fragment key={exercises[bl[0]].key}>{renderBlock(bl[0])}</Fragment>;
          const letter = (tags[bl[0]] ?? "").replace(/\d+$/, "");
          return (
            <div
              key={`ss-${exercises[bl[0]].key}`}
              className="rounded-2xl border border-dashed border-(--ep-accent)/35 p-1.5 space-y-1.5"
            >
              <p className="px-1.5 pt-0.5 text-[10px] font-black uppercase tracking-widest text-(--ep-accent)">
                {bl.length > 2 ? tr("Circuit") : tr("Superset")} {letter}
                <span className="ml-1.5 normal-case tracking-normal font-bold text-(--ep-ink)/45">
                  {tr("enchaîne sans repos, repos après le dernier")}
                </span>
              </p>
              {bl.map((i) => renderBlock(i))}
            </div>
          );
        })}

        <div className="pt-1">
          <ExercisePicker onAdd={handleAddExercise} />
        </div>

        {/* Fin de liste : finir la séance, même avant la dernière série
            (le bouton de la barre du bas n'apparaît qu'une fois tout fait). */}
        {exercises.length > 0 && (
          <div className="pt-3 pb-2 space-y-1">
            <button
              type="button"
              onClick={goToRecap}
              className={`w-full min-h-12 rounded-xl flex items-center justify-center gap-2 text-[12px] font-black uppercase tracking-wider transition-colors ${
                allSetsDone
                  ? "bg-(--ep-accent) text-(--ep-strong)"
                  : "border border-(--ep-line)/35 bg-(--ep-s1) text-(--ep-ink)/75"
              }`}
            >
              <Flag size={14} />
              {allSetsDone ? tr("Terminer la séance") : tr("Terminer la séance maintenant")}
            </button>
            {!allSetsDone && totalSetsAll > 0 && (
              <p className="text-center text-[11px] text-(--ep-ink)/45">
                {totalSetsAll - doneSetsAll}{" "}
                {totalSetsAll - doneSetsAll > 1 ? tr("séries pas encore faites") : tr("série pas encore faite")}
              </p>
            )}
          </div>
        )}
      </div>

      {notice && (
        <div className="fixed left-0 right-0 bottom-[calc(env(safe-area-inset-bottom)+150px)] md:bottom-24 z-[60] px-4 pointer-events-none">
          <p
            role="status"
            className="max-w-md mx-auto rounded-xl px-3.5 py-2.5 text-xs font-bold text-(--ep-strong) bg-(--ep-s4) border border-(--ep-line)/35 shadow-[0_8px_24px_rgba(var(--ep-shade-rgb),0.4)]"
          >
            {notice}
          </p>
        </div>
      )}

      <RestBar
        rest={rest}
        doneSets={doneSetsAll}
        totalSets={totalSetsAll}
        nextLabel={nextLabel}
        hidden={typing}
        onAdjust={(delta) => setRest((r) => (r ? { ...r, seconds: Math.max(5, r.seconds + delta) } : r))}
        onSkip={closeRest}
        onFinish={goToRecap}
      />

      {swap && swapEx && (
        <SwapSheet
          mode={swap.mode}
          exerciseName={swapEx.exercise.name}
          muscleGroup={swapEx.exercise.muscle_group}
          muscleSubgroup={swapEx.exercise.muscle_subgroup}
          doneSets={swapEx.sets.filter((s) => s.validated).length}
          canDefer={swapBlock !== -1 && swapBlock < blocks.length - 1}
          excludeNames={exercises.map((e) => e.exercise.name)}
          onDefer={() => handleDefer(swapEx.key)}
          onPick={(alt) => handleReplace(swapEx.key, alt)}
          onClose={() => setSwap(null)}
        />
      )}

      {videoDraft && (
        <VideoSheet
          file={videoDraft.file}
          url={videoDraft.url}
          caption={videoDraftCaption}
          hasCoach={!!initData.hasCoach}
          onConfirm={confirmVideo}
          onClose={closeVideoDraft}
        />
      )}
    </div>
  );
}
