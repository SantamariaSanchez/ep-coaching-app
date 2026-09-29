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
  AlertCircle,
  BarChart2,
  Clock,
  Star,
  Video,
  Loader2,
  X,
  Pencil,
  StickyNote,
  Backpack,
  ExternalLink,
  RotateCcw,
  ClipboardList,
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
import { createClientSupabase } from "@/lib/supabase-client";
import { getTips } from "@/lib/execution-tips";
import { VOLUME_LANDMARKS } from "@/lib/volume-data";
import { accessoriesForSession } from "@/lib/session-accessories";
import type { Exercise } from "@/utils/programs";
import type { Session, SessionSet } from "@/utils/sessions";
import { safeExternalUrl } from "@/lib/sanitize";
import { todayInParis } from "@/lib/dates";
import { useConfirm } from "@/components/ui/ConfirmDialogProvider";
import { SessionSetsBreakdown } from "@/components/ui/SessionHistoryCard";
import { TENSION_FOCUS_LABELS } from "@/lib/exercise-library-content";
import {
  parseRepScheme,
  rangeForSet,
  suggestSet,
  formatRange,
  formatRest,
  formatKg,
  type RepRange,
} from "@/lib/set-targets";

// Texte pré-rempli du post Victoire depuis un PR détecté en fin de séance
// (voir le bouton "Partager en Victoire") — le client reste libre de le
// modifier ou de tout effacer avant de publier.
function buildPRShareText(prs: { exerciseName: string; weightKg: number; reps: number | null }[]): string {
  const items = prs.map((pr) => `${pr.exerciseName} à ${pr.weightKg} kg${pr.reps ? ` × ${pr.reps}` : ""}`);
  if (items.length === 1) return `🏆 Nouveau record : ${items[0]} !`;
  return `🏆 Nouveaux records aujourd'hui : ${items.join(", ")} !`;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface PrevWeight {
  weight: number | null;
  reps: string | null;
  rir: number | null;
}

// Item 31 : charge suggérée pour la prochaine série, à partir du RIR réel
// de la dernière fois comparé au RIR cible du programme — autorégulation
// simple (±2,5% de charge par point d'écart), la règle qu'un coach
// appliquerait à l'œil plutôt qu'une "IA". Reste un placeholder éditable
// dans le champ poids, jamais une valeur imposée.
function suggestNextWeight(prevWeight: PrevWeight | null, targetRir: number | null): number | null {
  if (prevWeight?.weight == null) return null;
  if (prevWeight.rir == null || targetRir == null) return prevWeight.weight;

  const diff = prevWeight.rir - targetRir; // positif = trop facile, négatif = trop dur
  if (diff === 0) return prevWeight.weight;

  const suggested = prevWeight.weight * (1 + diff * 0.025);
  // Arrondi au 0,5kg le plus proche : repère indicatif, pas une valeur de
  // plaque exacte (dépend du matériel réellement disponible).
  return Math.round(suggested * 2) / 2;
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
  // Tous les sets de la séance précédente la plus récente pour cet exercice
  // (retour direct 2026-09-17 : "je vois ce que j'ai fait la dernière fois,
  // pas juste un set mais TOUS les sets"), dans l'ordre. Clé = nom en
  // minuscules, même convention que prevWeights.
  prevSets: Record<string, PrevWeight[]>;
  existingSets: SessionSet[];
  libraryByName: Record<string, LibraryTip>;
  accessoriesByName: Record<string, string[]>;
  // Note libre persistante par exercice (client_exercise_notes), clé = nom
  // exact — voir migration 20260917e.
  exerciseNotes: Record<string, string>;
  // Séance terminée : set id → URL signée de la vidéo (récap, "Détail des
  // séries"). Optionnel : absent d'une réponse d'avant ce champ.
  videoUrlsBySetId?: Record<string, string>;
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
  // Enregistrement en base en cours : bloque un second envoi du meme set
  // (double-tap sur "Valider le set" en salle) qui creait une deuxieme ligne.
  saving?: boolean;
  // Le set est valide a l'ecran mais l'enregistrement a echoue (reseau coupe
  // en salle, serveur indisponible). Avant, l'echec etait totalement muet et
  // le set disparaissait au rechargement suivant.
  saveFailed?: boolean;
}

interface ExerciseState {
  exercise: Exercise;
  sets: SetState[];
  showTips: boolean;
  showHistory: boolean;
  showNotes: boolean;
  clientNotes: string;
  // Accordéon (2026-08-19, retour direct : "regarde sur toute l'appli si tu
  // trouve des endroits où c'est mieux de mettre un bouton... pour pas que
  // ya trop de truc d'un coup"). Purement une valeur d'INITIALISATION,
  // jamais recalculée en cours de séance par un effet — la logique de
  // validation/PR/timer live n'est jamais touchée, seul l'affichage du
  // corps de la carte en dépend (voir ExerciseCard).
  collapsed: boolean;
}

type Step = "warmup" | "session" | "recap";

// Retour direct 2026-09-17 ("faut pas qu'on soit bloqué, faut juste le
// mettre en petit en haut mais pas bloquant... 0 clic juste regarder") :
// l'ancien RestTimerOverlay était un plein écran bloquant avec un
// questionnaire "prêt physiquement/mentalement ?" à valider avant de
// pouvoir continuer. Supprimé entièrement (mentalStep/mentalPhysical/
// mentalMental/noWaitStartedAt disparaissent avec) au profit d'un badge
// discret dans l'en-tête (RestTimerBadge) qui ne bloque plus rien : le
// chrono tourne, se referme tout seul (voir handleValidateSet) dès que le
// set suivant est validé, sans aucune action requise.
interface RestTimer {
  startedAt: number;
  suggestedSeconds: number;
  // Le libellé ("1-2 min", "3-5 min"...) correspondant au VRAI RIR de ce
  // set, pas recalculé au hasard dans l'overlay — bug réel trouvé en
  // creusant le retour direct 2026-09-09 sur le système de repos :
  // RestTimerOverlay appelait getSuggestedRest(0) en dur pour l'affichage,
  // donc affichait toujours "3-5 min" même quand le compte à rebours réel
  // (suggestedSeconds, lui calculé avec le bon RIR) visait 90s ("1-2 min").
  suggestedLabel: string;
  // Identifie le set concerne par son localId, pas par sa position : entre
  // l'ouverture et la fermeture du chrono, l'utilisateur peut retirer une
  // serie ou reordonner ses exercices, ce qui decalait les index et faisait
  // atterrir la duree de repos sur le mauvais set.
  setLocalId: string;
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

// Exercice reconstruit côté serveur à partir de séries déjà enregistrées
// (voir syntheticExercisesFor dans app/api/client/sessions/[id]/route.ts).
function isSyntheticExercise(ex: Exercise): boolean {
  return ex.id.startsWith("local-set-");
}

// Chrono de repos persistant. Il ne vivait qu'en state React : la PWA est
// régulièrement tuée quand le téléphone se verrouille entre deux séries, et
// au retour le chrono avait disparu (d'où rest_duration_seconds rempli sur
// seulement 45 séries sur 145). setDbId sert à retrouver la série après un
// rechargement, où son localId devient son id en base. exerciseName +
// setNumber prennent le relais si l'appli a été tuée avant la réponse du
// serveur (la série est bien en base, mais son id n'a jamais été noté ici).
interface StoredRestTimer extends RestTimer {
  setDbId: string | null;
  exerciseName: string | null;
  setNumber: number | null;
}

// Au-delà, ce n'est plus un repos entre deux séries mais une séance
// abandonnée puis rouverte : on ne ressuscite pas un chrono de 2 heures.
const REST_TIMER_MAX_AGE_MS = 30 * 60 * 1000;

function restTimerKey(sessionId: string) {
  return `ep-rest-timer-${sessionId}`;
}

function saveRestTimer(sessionId: string, stored: StoredRestTimer) {
  try {
    localStorage.setItem(restTimerKey(sessionId), JSON.stringify(stored));
  } catch {}
}

function loadRestTimer(sessionId: string): StoredRestTimer | null {
  try {
    const raw = localStorage.getItem(restTimerKey(sessionId));
    if (!raw) return null;
    const t = JSON.parse(raw) as Partial<StoredRestTimer>;
    if (
      typeof t.startedAt !== "number" ||
      typeof t.suggestedSeconds !== "number" ||
      typeof t.suggestedLabel !== "string" ||
      typeof t.setLocalId !== "string"
    ) {
      return null;
    }
    return {
      startedAt: t.startedAt,
      suggestedSeconds: t.suggestedSeconds,
      suggestedLabel: t.suggestedLabel,
      setLocalId: t.setLocalId,
      setDbId: typeof t.setDbId === "string" ? t.setDbId : null,
      exerciseName: typeof t.exerciseName === "string" ? t.exerciseName : null,
      setNumber: typeof t.setNumber === "number" ? t.setNumber : null,
    };
  } catch {
    return null;
  }
}

function clearRestTimer(sessionId: string) {
  try {
    localStorage.removeItem(restTimerKey(sessionId));
  } catch {}
}

// L'id en base n'arrive qu'après l'aller-retour réseau, le chrono est déjà
// lancé : on le complète dès qu'il est connu, seulement si le chrono
// mémorisé concerne toujours cette série.
function attachRestTimerDbId(sessionId: string, setLocalId: string, dbId: string) {
  const stored = loadRestTimer(sessionId);
  if (stored && stored.setLocalId === setLocalId && stored.setDbId !== dbId) {
    saveRestTimer(sessionId, { ...stored, setDbId: dbId });
  }
}

// Série à laquelle rattacher un chrono mémorisé, après un rechargement.
function findRestTimerSet(exStates: ExerciseState[], stored: StoredRestTimer): SetState | undefined {
  if (stored.setDbId) {
    for (const ex of exStates) {
      const hit = ex.sets.find((st) => st.localId === stored.setDbId);
      if (hit) return hit;
    }
  }
  if (stored.exerciseName != null && stored.setNumber != null) {
    const ex = exStates.find((e) => e.exercise.name === stored.exerciseName);
    return ex?.sets.find((st) => st.validated && st.setNumber === stored.setNumber);
  }
  return undefined;
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

function buildExerciseState(
  exercises: Exercise[],
  existingSets: SessionSet[],
  clientNotes: Record<string, string>
): ExerciseState[] {
  return exercises.map((ex) => {
    const targetSets = ex.sets ?? 3;
    // Un set est identifie par (exercice, numero de serie) : deux lignes qui
    // partagent le meme numero sont un doublon d'enregistrement, pas deux
    // series reelles. Sans ce filtre, les doublons deja presents en base
    // s'affichaient litteralement deux fois ("Set 3" puis "Set 3") et
    // comptaient double dans le volume. On garde la derniere version
    // enregistree (existingSets arrive trie par created_at croissant), donc
    // la plus recente correction.
    const bySetNumber = new Map<number, SessionSet>();
    for (const s of existingSets) {
      if (s.exercise_name !== ex.name) continue;
      bySetNumber.set(s.set_number, s);
    }
    const existing = [...bySetNumber.values()].sort((a, b) => a.set_number - b.set_number);

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
    // Le numero repart du plus haut numero deja pris, pas du nombre de sets :
    // si la base contient les series 1 et 3 (une serie a ete retiree en
    // cours de route), repartir de `existingCount + 1` redonnait le numero 3,
    // deja utilise — deux "Set 3" a l'ecran et deux lignes en base.
    const existingCount = sets.length;
    let nextSetNumber = sets.reduce((max, s) => Math.max(max, s.setNumber), 0);
    for (let i = existingCount; i < targetSets; i++) {
      nextSetNumber += 1;
      sets.push({
        localId: newLocalId(),
        setNumber: nextSetNumber,
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
    // Replié d'entrée uniquement si CET exercice était déjà entièrement
    // validé lors d'une session reprise (retour après avoir quitté l'appli,
    // refresh) — un exercice qui reste à faire s'ouvre toujours, jamais
    // besoin de deviner "lequel je dois reprendre".
    const allValidated = sets.length > 0 && sets.every((s) => s.validated);

    return {
      exercise: ex,
      sets,
      showTips: false,
      showHistory: false,
      showNotes: false,
      clientNotes: clientNotes[ex.name] ?? "",
      collapsed: allValidated,
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

      {/* Montée sur les mouvements réels du jour (retour direct 2026-09-01 :
          l'échauffement doit vraiment dépendre de la séance/du programme,
          pas juste de la catégorie push/pull/legs). Basé sur le dernier
          poids de travail connu pour chaque mouvement. */}
      {movementPreps.length > 0 && (
        <div className="mb-5">
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/25 mb-2">
            Montée sur tes mouvements du jour
          </p>
          <div className="space-y-2">
            {movementPreps.map((mp) => (
              <div key={mp.exerciseName} className="bg-[#1f0101] border border-[#890404]/20 rounded-xl px-4 py-3">
                <p className="text-xs font-bold text-white mb-1.5">{mp.exerciseName}</p>
                <div className="flex flex-wrap gap-1.5">
                  {mp.ramps.map((r, i) => (
                    <span
                      key={i}
                      className="text-[10px] font-semibold text-[#F5EDED]/55 bg-[#150000] border border-[#890404]/15 rounded-full px-2.5 py-1"
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
      <p className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/25 mb-2">
        Suggestions, modifie librement
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
            Aucun exercice. Ajoute le tien ci-dessous.
          </p>
        )}
      </div>

      {/* Ajouter son propre exercice d'échauffement */}
      <div className="flex gap-2 mb-8">
        <input
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomExercise(); } }}
          placeholder="Ajouter ton propre exercice…" aria-label="Ajouter ton propre exercice…"
          className="flex-1 bg-[#150000] border border-[#890404]/30 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-[#F5EDED]/20 focus:outline-none focus:border-[#E01E1E]/50"
        />
        <button
          onClick={addCustomExercise}
          disabled={!customName.trim()}
          aria-label="Ajouter l'exercice"
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

// Badge de repos non bloquant (retour direct 2026-09-17, remplace l'ancien
// RestTimerOverlay plein écran + questionnaire "prêt ?" à valider) : juste
// le temps qui défile, en petit, dans l'en-tête. Aucun clic requis, aucun
// backdrop, le reste de l'écran (sets suivants, notes...) reste utilisable
// pendant que ça compte. Se referme tout seul dès que le set suivant est
// validé (voir handleValidateSet) — jamais par une action dédiée.
function RestTimerBadge({ timer }: { timer: RestTimer }) {
  const [elapsed, setElapsed] = useState(() =>
    Math.floor((Date.now() - timer.startedAt) / 1000)
  );
  const beepedRef = useRef(false);

  useEffect(() => {
    // Chrono restauré après un rechargement alors que le repos est déjà
    // écoulé : le bip a eu lieu (ou n'a plus de sens), il ne doit pas
    // sonner à tort au retour dans l'appli. Chrono neuf : 0 s écoulée, donc
    // false comme avant.
    beepedRef.current =
      Math.floor((Date.now() - timer.startedAt) / 1000) >= timer.suggestedSeconds;
    const interval = setInterval(() => {
      const s = Math.floor((Date.now() - timer.startedAt) / 1000);
      setElapsed(s);
      if (s >= timer.suggestedSeconds && !beepedRef.current) {
        beepedRef.current = true;
        playBeep();
        try { navigator.vibrate([200, 100, 200]); } catch {}
      }
    }, 500);
    return () => clearInterval(interval);
  }, [timer.startedAt, timer.suggestedSeconds]);

  const ready = elapsed >= timer.suggestedSeconds;

  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-colors"
      style={{
        background: ready ? "rgba(74,222,128,0.12)" : "rgba(250,204,21,0.12)",
        border: `1px solid ${ready ? "rgba(74,222,128,0.3)" : "rgba(250,204,21,0.3)"}`,
      }}
      title={`Repos suggéré : ${timer.suggestedLabel}`}
    >
      <span
        className="text-[11px] font-black tabular-nums"
        style={{ color: ready ? "#4ade80" : "#facc15" }}
      >
        {formatTime(elapsed)}
      </span>
      <span className="text-[8px] font-bold uppercase tracking-wider text-[#F5EDED]/35 whitespace-nowrap">
        repos {timer.suggestedLabel}
      </span>
    </div>
  );
}

// ── Session Step ──────────────────────────────────────────────────────────────

// "32 kg × 5 · RIR 0" : une série de référence en une ligne. Poids du corps
// (pas de charge) : juste les reps.
function formatPrevSet(p: PrevWeight): string {
  const parts: string[] = [];
  if (p.weight != null && p.reps != null) parts.push(`${formatKg(p.weight)} kg × ${p.reps}`);
  else if (p.weight != null) parts.push(`${formatKg(p.weight)} kg`);
  else if (p.reps != null) parts.push(`${p.reps} reps`);
  if (p.rir != null) parts.push(`RIR ${p.rir}`);
  return parts.join(" · ");
}

const RIR_CHOICES = [0, 1, 2, 3, 4, 5] as const;
const SCORE_CHOICES = [1, 2, 3, 4, 5] as const;

function SetRow({
  set,
  position,
  exercise,
  prevWeight,
  prevSet,
  targetRange,
  prevInSession,
  prThreshold,
  isSessionRecord,
  sessionId,
  onChange,
  onValidate,
  onRemove,
  onUnvalidate,
  onRetrySave,
  onEnsureSetId,
}: {
  set: SetState;
  position: number;
  exercise: Exercise;
  prevWeight: PrevWeight | null;
  /** La même série (même rang) la dernière fois, voir InitData.prevSets. */
  prevSet: PrevWeight | null;
  /** Fourchette de reps du programme pour CETTE série, null si illisible. */
  targetRange: RepRange | null;
  /** Dernière série validée au-dessus de celle-ci, dans la même carte. */
  prevInSession: SetState | null;
  prThreshold: number | null;
  /** Série validée qui détient le record de la séance pour cet exercice. */
  isSessionRecord: boolean;
  sessionId: string;
  onChange: (patch: Partial<SetState>) => void;
  onValidate: () => void;
  onRemove: () => void;
  onUnvalidate: () => void;
  onRetrySave: () => void;
  onEnsureSetId: () => Promise<string | null>;
}) {
  const weight = parseFloat(set.weightKg) || 0;
  // Même règle que persistSet (isPR sauvegardé) : sans seuil (exercice
  // jamais fait avant), n'importe quel poids saisi devient le premier
  // record, donc candidat PR dès qu'il est positif — sinon le badge
  // n'apparaissait qu'après coup, une fois le set sauvegardé, jamais
  // pendant la saisie.
  const isPRCandidate =
    weight > 0 && (prThreshold == null || weight > prThreshold);
  // Série validée : le badge suit le record réel de la séance (un seul par
  // exercice), pas le drapeau enregistré au moment de la validation, qui
  // peut être périmé après une correction ou un rechargement.
  const showPR = set.validated ? isSessionRecord : isPRCandidate;
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  const suggestedWeight = suggestNextWeight(prevWeight, exercise.rir ?? null);
  const suggestionDiffersFromLast =
    suggestedWeight != null && prevWeight?.weight != null && suggestedWeight !== prevWeight.weight;

  // Séance guidée : objectif de double progression calculé depuis la même
  // série de la dernière fois et la fourchette du programme. Sans fourchette
  // lisible ou sans série de référence, on retombe sur l'affichage d'avant
  // (suggestNextWeight en placeholder).
  const suggestion = targetRange
    ? suggestSet({ range: targetRange, prev: prevSet, targetRir: exercise.rir ?? null })
    : null;
  const lastRef = prevSet ?? prevWeight;
  const hasLastRef = lastRef != null && (lastRef.weight != null || lastRef.reps != null);
  const weightPlaceholder = suggestion
    ? `${suggestion.weightKg} kg`
    : suggestedWeight != null
    ? `${suggestedWeight} kg`
    : "0";
  const repsPlaceholder = targetRange
    ? formatRange(targetRange)
    : exercise.reps ?? (prevWeight?.reps != null ? prevWeight.reps : "0");
  const copyableWeight =
    prevInSession && prevInSession.weightKg && prevInSession.weightKg !== set.weightKg
      ? prevInSession.weightKg
      : null;

  async function handleVideoSelect(file: File) {
    setVideoError(null);
    // MASTERCLASS.md Axe O : le bucket set-videos rejette déjà les fichiers
    // trop lourds ou au mauvais type côté serveur, mais sans ce contrôle
    // l'utilisateur attend l'échec de l'upload réseau d'une vidéo de
    // plusieurs centaines de Mo avant de voir l'erreur.
    if (file.size > 100 * 1024 * 1024) {
      setVideoError("Vidéo trop lourde (100 Mo maximum).");
      return;
    }
    setUploadingVideo(true);
    try {
      // Filmer AVANT d'avoir loggé poids/reps est le seul ordre qui a du
      // sens (retour direct 2026-09-09 : "c'est incohérent de filmer après
      // avoir fini le set") — si le set n'a pas encore de ligne en base,
      // onEnsureSetId en crée une (sans le marquer validé, voir
      // handleEnsureSetSaved) juste pour avoir un id à rattacher.
      const dbId = set.dbId ?? (await onEnsureSetId());
      if (!dbId) throw new Error("set non enregistré");

      const supabase = createClientSupabase();
      const ext = file.name.split(".").pop() || "mp4";
      const path = `${sessionId}/${dbId}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("set-videos")
        .upload(path, file, { contentType: file.type || "video/mp4", upsert: false });
      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from("session_sets")
        .update({ video_url: path })
        .eq("id", dbId);
      if (updateError) throw updateError;

      onChange({ hasVideo: true, dbId });
    } catch (e) {
      console.error("Video upload failed:", e);
      setVideoError("Échec de l'envoi de la vidéo. Réessaie.");
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
          Set {position}
        </span>
        {set.validated && (
          <CheckCircle2 size={12} className="text-green-400" />
        )}
        {showPR && (
          <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">
            🏆 PR !
          </span>
        )}
        {set.validated ? (
          <button
            onClick={onUnvalidate}
            className="ml-auto flex items-center gap-1 p-1 rounded-md text-[#F5EDED]/25 hover:text-[#E01E1E] transition-colors"
            title="Modifier ce set"
            aria-label="Modifier ce set"
          >
            <Pencil size={11} />
          </button>
        ) : (
          <button
            onClick={onRemove}
            className="ml-auto p-1 rounded-md text-[#F5EDED]/25 hover:text-red-400 transition-colors"
            title="Retirer ce set"
            aria-label="Retirer ce set"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {set.validated ? (
        <div className="space-y-2">
          <div className="flex gap-4 text-sm font-black text-white">
            <span>
              {set.weightKg || "···"}
              <span className="text-[10px] font-normal text-[#F5EDED]/40 ml-0.5">
                kg
              </span>
            </span>
            <span>
              {set.repsActual || "···"}
              <span className="text-[10px] font-normal text-[#F5EDED]/40 ml-0.5">
                reps
              </span>
            </span>
            <span>
              RIR{" "}
              <span className="text-[#E01E1E]">{set.rirActual || "···"}</span>
            </span>
            {set.standardizationScore && (
              <span className="text-[10px] text-[#F5EDED]/40">
                ★{set.standardizationScore}
              </span>
            )}
          </div>

          {/* Enregistrement echoue : avant, l'erreur etait avalee en silence
              et le set validé à l'écran n'existait nulle part en base — il
              disparaissait au rechargement suivant sans un mot. */}
          {set.saveFailed && (
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/25 rounded-lg px-2.5 py-1.5">
              <AlertCircle size={11} className="text-amber-400 flex-shrink-0" />
              <p className="text-[10px] text-amber-300 flex-1">
                Pas encore enregistré, vérifie ta connexion.
              </p>
              <button
                onClick={onRetrySave}
                disabled={set.saving}
                className="text-[9px] font-black uppercase tracking-widest text-amber-300 hover:text-amber-200 disabled:opacity-50 transition-colors"
              >
                {set.saving ? "Envoi…" : "Réessayer"}
              </button>
            </div>
          )}

          {set.hasVideo ? (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-green-400">
              <Video size={11} /> Vidéo envoyée à ton coach
            </span>
          ) : !set.dbId ? (
            // Filmer un set exige la ligne en base (le chemin de la video y
            // est rattache) — proposer le bouton alors qu'elle n'existe pas
            // ne menait qu'a un clic sans effet.
            <span className="text-[10px] text-[#F5EDED]/25">
              Vidéo possible une fois le set enregistré
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
          {videoError && <p className="text-[10px] text-red-400 mt-1">{videoError}</p>}
        </div>
      ) : (
        <div className="space-y-2">
          {/* Séance guidée : ce qui a été fait sur CETTE série la dernière
              fois, et l'objectif du jour (double progression dans la
              fourchette du programme). "Remplir" pré-remplit poids et reps
              en un tap, rien n'est jamais imposé. */}
          {(hasLastRef || suggestion) && (
            <div className="rounded-lg bg-[#150000] border border-[#890404]/20 px-2.5 py-1.5 space-y-1">
              {hasLastRef && lastRef && (
                <p className="text-[10px] text-[#F5EDED]/50 leading-tight break-words">
                  <span className="text-[#F5EDED]/30">Dernière fois : </span>
                  {formatPrevSet(lastRef)}
                </p>
              )}
              {suggestion && (
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold text-white leading-tight">
                      <span className="text-[#E01E1E]">Objectif : </span>
                      {formatKg(suggestion.weightKg)} kg × {suggestion.reps}
                    </p>
                    <p className="text-[9.5px] text-[#F5EDED]/35 leading-tight mt-0.5 break-words">
                      {suggestion.reason}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        weightKg: String(suggestion.weightKg),
                        repsActual: String(suggestion.reps),
                      })
                    }
                    className="flex-shrink-0 min-h-[36px] px-3 rounded-lg text-[10px] font-black uppercase tracking-widest bg-[#E01E1E]/15 text-[#E01E1E] border border-[#E01E1E]/30 hover:bg-[#E01E1E]/25 transition-colors"
                    aria-label={`Remplir ${formatKg(suggestion.weightKg)} kg et ${suggestion.reps} reps`}
                  >
                    Remplir
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Weight + Reps row */}
          <div className="flex gap-2">
            <div className="flex-1 min-w-0">
              <label className="text-[8px] text-[#F5EDED]/30 uppercase tracking-wider">
                Poids (kg)
              </label>
              <input aria-label="Poids (kg)"
                type="number"
                inputMode="decimal"
                placeholder={weightPlaceholder}
                value={set.weightKg}
                onChange={(e) => onChange({ weightKg: e.target.value })}
                className="w-full bg-[#150000] border border-[#890404]/30 rounded-lg px-2.5 py-2 text-sm font-bold text-white placeholder:text-[#F5EDED]/20 focus:outline-none focus:border-[#E01E1E]/50"
              />
              {!suggestion && suggestionDiffersFromLast && !set.weightKg && (
                <p className="text-[8.5px] text-[#F5EDED]/30 mt-1 leading-tight">
                  💡 {suggestedWeight}kg suggéré (RIR {prevWeight!.rir} la dernière fois pour une cible {exercise.rir})
                </p>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <label className="text-[8px] text-[#F5EDED]/30 uppercase tracking-wider">
                Reps
              </label>
              {/* Placeholder = la fourchette de CETTE série ("6-8"), plus
                  jamais le schéma complet du programme ("1x12-15, 2x10-12")
                  écrasé dans un petit champ numérique. */}
              <input aria-label="Reps"
                type="number"
                inputMode="numeric"
                placeholder={repsPlaceholder}
                value={set.repsActual}
                onChange={(e) => onChange({ repsActual: e.target.value })}
                className="w-full bg-[#150000] border border-[#890404]/30 rounded-lg px-2.5 py-2 text-sm font-bold text-white placeholder:text-[#F5EDED]/20 focus:outline-none focus:border-[#E01E1E]/50"
              />
            </div>
          </div>

          {/* Même charge que la série juste au-dessus, en un tap. */}
          {copyableWeight && (
            <button
              type="button"
              onClick={() => onChange({ weightKg: copyableWeight })}
              className="inline-flex items-center min-h-[36px] px-3 rounded-lg text-[10px] font-bold text-[#F5EDED]/55 hover:text-[#F5EDED]/80 border border-[#890404]/25 hover:border-[#890404]/50 transition-colors"
            >
              = Série précédente ({copyableWeight.replace(".", ",")} kg)
            </button>
          )}

          {/* RIR + Exécution en pastilles : un tap au lieu de deux menus
              déroulants natifs par série (143 séries sur 146 renseignées,
              c'était la saisie la plus répétée de la séance). Re-taper la
              pastille choisie la vide. Même valeur texte qu'avant dans
              SetState, persistSet ne change pas. */}
          <div>
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <span className="text-[8px] text-[#F5EDED]/30 uppercase tracking-wider">
                RIR réel
              </span>
              <span className="text-[8.5px] text-[#F5EDED]/25">0 = échec · 5 = facile</span>
            </div>
            <div className="flex gap-1" role="group" aria-label="RIR réel">
              {RIR_CHOICES.map((v) => {
                const selected = set.rirActual === String(v);
                return (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={selected}
                    aria-label={`RIR ${v}${v === 0 ? " (échec)" : v >= 4 ? " (facile)" : ""}`}
                    onClick={() => onChange({ rirActual: selected ? "" : String(v) })}
                    className={`flex-1 min-w-[36px] h-9 rounded-lg border text-sm font-black tabular-nums transition-colors ${
                      selected
                        ? "bg-[#E01E1E] border-[#E01E1E] text-white"
                        : "bg-[#150000] border-[#890404]/30 text-[#F5EDED]/55 hover:border-[#E01E1E]/50"
                    }`}
                  >
                    {v}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <span className="text-[8px] text-[#F5EDED]/30 uppercase tracking-wider">
                Exécution
              </span>
              <span className="text-[8.5px] text-[#F5EDED]/35 truncate">
                {set.standardizationScore
                  ? STANDARDIZATION_LABELS[set.standardizationScore]
                  : "1 = approximative · 5 = parfaite"}
              </span>
            </div>
            <div className="flex gap-1" role="group" aria-label="Exécution">
              {SCORE_CHOICES.map((v) => {
                const selected = set.standardizationScore === String(v);
                return (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={selected}
                    aria-label={`${v} : ${STANDARDIZATION_LABELS[String(v)]}`}
                    title={STANDARDIZATION_LABELS[String(v)]}
                    onClick={() => onChange({ standardizationScore: selected ? "" : String(v) })}
                    className={`flex-1 min-w-[36px] h-9 rounded-lg border text-sm font-black tabular-nums transition-colors ${
                      selected
                        ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                        : "bg-[#150000] border-[#890404]/30 text-[#F5EDED]/55 hover:border-amber-500/40"
                    }`}
                  >
                    {v}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filmer AVANT de valider, jamais après (retour direct
              2026-09-09 : "c'est incohérent de filmer après avoir fini le
              set, c'est juste con") — le seul moment où filmer capture
              vraiment l'exécution du set, c'est pendant qu'il se fait,
              donc avant que poids/reps soient forcément déjà remplis. */}
          <div className="flex items-center justify-between gap-2">
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
          {videoError && <p className="text-[10px] text-red-400">{videoError}</p>}

          {/* Validate button — desactive pendant l'enregistrement : un
              double-tap partait sinon en deux requetes et creait deux fois
              la meme serie en base. */}
          <button
            onClick={onValidate}
            disabled={set.saving}
            className="w-full py-2.5 bg-[#E01E1E] hover:bg-[#B00202] disabled:opacity-60 text-white text-xs font-black uppercase tracking-widest rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {set.saving ? (
              <>
                <Loader2 size={12} className="animate-spin" /> Enregistrement…
              </>
            ) : (
              "✓ Valider le set"
            )}
          </button>
        </div>
      )}
    </div>
  );
}

function ExerciseCard({
  exState,
  prevWeight,
  prevSets,
  getPrThreshold,
  recordHolderId,
  sessionId,
  libraryTip,
  onUpdate,
  onValidateSet,
  onUnvalidateSet,
  onRetrySaveSet,
  onRemoveExercise,
  onRemoveSet,
  onEnsureSetId,
  onMoveUp,
  onMoveDown,
  onNotesChange,
}: {
  exState: ExerciseState;
  prevWeight: PrevWeight | null;
  /** Tous les sets de la dernière fois, pas juste le dernier — voir InitData.prevSets. */
  prevSets: PrevWeight[];
  /** Seuil PR de l'exercice, hors la série donnée (voir computeThreshold). */
  getPrThreshold: (excludeLocalId: string) => number | null;
  /** localId de la série qui détient le record de la séance, sinon null. */
  recordHolderId: string | null;
  sessionId: string;
  libraryTip?: LibraryTip;
  onUpdate: (patch: Partial<ExerciseState>) => void;
  onValidateSet: (setIdx: number) => void;
  onUnvalidateSet: (setIdx: number) => void;
  onRetrySaveSet: (setIdx: number) => void;
  onRemoveExercise: () => void;
  onRemoveSet: (setIdx: number) => void;
  onEnsureSetId: (setIdx: number) => Promise<string | null>;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onNotesChange: (notes: string) => void;
}) {
  const confirm = useConfirm();
  // Conseils réels de la bibliothèque d'exercices en priorité — sinon les
  // cues génériques (avant : c'était toujours ces cues génériques, quasi
  // identiques pour tous les exercices faute de correspondance).
  const libraryInstructions = libraryTip?.instructions?.trim() || null;
  const tips = libraryInstructions ? null : getTips(exState.exercise.name);
  // Les exercices ajoutés à la volée n'ont pas de nombre de séries cible
  // fiable (défaut arbitraire) — l'afficher induisait en erreur.
  const isCustomExercise = exState.exercise.id.startsWith("local-");

  // Accordéon (voir ExerciseState.collapsed) : résumé de progression visible
  // même repliée, pour ne jamais avoir à rouvrir juste pour savoir où on en
  // est — calcul en lecture seule à partir de sets déjà en scope, aucun
  // effet, aucun risque sur la validation/PR/timer live.
  const validatedCount = exState.sets.filter((s) => s.validated).length;
  const totalSets = exState.sets.length;
  const hasPR = recordHolderId != null && exState.sets.some((s) => s.localId === recordHolderId);

  // Schéma du programme découpé série par série ("1x12-15, 2x10-12" →
  // 12-15, 10-12, 10-12). null si illisible : l'en-tête et les champs
  // retombent alors exactement sur l'affichage d'avant.
  const ranges = parseRepScheme(exState.exercise.reps, exState.exercise.sets);
  const rangesDiffer =
    ranges != null && ranges.some((r) => r.min !== ranges[0].min || r.max !== ranges[0].max);
  const restSeconds = exState.exercise.rest_seconds;
  // Consigne écrite dans le programme pour cet exercice (distincte de la
  // note perso du membre, client_exercise_notes) et zone de tension visée :
  // jamais affichées en séance jusqu'ici, alors que c'est ce que le coach a
  // écrit pour CETTE séance.
  const programNotes = exState.exercise.notes?.trim() || null;
  const tensionFocus = exState.exercise.tension_focus;
  const tensionLabel = tensionFocus ? TENSION_FOCUS_LABELS[tensionFocus] ?? null : null;
  const [programNotesOpen, setProgramNotesOpen] = useState(false);

  return (
    <div className="bg-[#1a0000] border border-[#890404]/25 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3.5 flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={() => onUpdate({ collapsed: !exState.collapsed })}
          aria-expanded={!exState.collapsed}
          className="min-w-0 flex-1 text-left"
        >
          <p className="text-sm font-black text-white flex items-center gap-1.5">
            {exState.exercise.name}
            {hasPR && <span title="Record personnel sur cet exercice">🏆</span>}
          </p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {exState.exercise.muscle_group && (
              <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#890404]/15 text-[#F5EDED]/40 border border-[#890404]/20">
                {exState.exercise.muscle_group}
              </span>
            )}
            {tensionLabel && (
              <span
                className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#E01E1E]/10 text-[#E01E1E]/80 border border-[#E01E1E]/20"
                title="Zone de tension visée sur cet exercice"
              >
                Focus : {tensionLabel}
              </span>
            )}
            {!isCustomExercise && exState.exercise.sets && (
              <span className="text-[9px] text-[#F5EDED]/30">
                {/* Fourchettes différentes selon la série : une par série
                    ("12-15 · 10-12 · 10-12 reps") au lieu de "3 séries ×
                    1x12-15, 2x10-12 reps". Fourchette unique : "3 séries ×
                    10-12 reps" (même pour un schéma écrit "3x10-12").
                    Schéma illisible : texte d'avant, tel quel. */}
                {ranges && rangesDiffer ? (
                  `${ranges.map(formatRange).join(" · ")} reps`
                ) : ranges ? (
                  `${exState.exercise.sets} séries × ${formatRange(ranges[0])} reps`
                ) : (
                  <>
                    {exState.exercise.sets} séries
                    {exState.exercise.reps && ` × ${exState.exercise.reps} reps`}
                  </>
                )}
                {exState.exercise.rir != null &&
                  ` · RIR ${exState.exercise.rir}`}
                {restSeconds != null && restSeconds > 0 && ` · repos ${formatRest(restSeconds)}`}
              </span>
            )}
            <span
              className={`text-[9px] font-bold ${
                validatedCount === totalSets && totalSets > 0 ? "text-green-400" : "text-[#F5EDED]/30"
              }`}
            >
              {validatedCount}/{totalSets} validées
            </span>
          </div>
        </button>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onUpdate({ collapsed: !exState.collapsed })}
            className="p-1.5 text-[#F5EDED]/30 hover:text-[#F5EDED]/70 transition-colors flex-shrink-0"
            title={exState.collapsed ? "Déplier" : "Replier"}
            aria-label={exState.collapsed ? "Déplier l'exercice" : "Replier l'exercice"}
          >
            <ChevronDown
              size={14}
              style={{ transform: exState.collapsed ? "rotate(0deg)" : "rotate(180deg)", transition: "transform 0.15s ease" }}
            />
          </button>
          {(onMoveUp || onMoveDown) && (
            <div className="flex flex-col border border-[#890404]/20 rounded-lg overflow-hidden mr-0.5">
              <button
                onClick={onMoveUp}
                disabled={!onMoveUp}
                className="p-0.5 text-[#F5EDED]/30 hover:text-[#F5EDED]/70 disabled:opacity-20 disabled:hover:text-[#F5EDED]/30 transition-colors"
                title="Monter l'exercice"
                aria-label="Monter l'exercice"
              >
                <ChevronUp size={12} />
              </button>
              <button
                onClick={onMoveDown}
                disabled={!onMoveDown}
                className="p-0.5 text-[#F5EDED]/30 hover:text-[#F5EDED]/70 disabled:opacity-20 disabled:hover:text-[#F5EDED]/30 transition-colors border-t border-[#890404]/20"
                title="Descendre l'exercice"
                aria-label="Descendre l'exercice"
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
            title="Tips d'exécution" aria-label="Tips d'exécution"
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
            title="Historique" aria-label="Historique"
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
            title="Notes" aria-label="Notes"
          >
            <StickyNote size={12} />
          </button>
          <button
            onClick={async () => {
              if (await confirm(`Retirer "${exState.exercise.name}" de cette séance ?`)) {
                onRemoveExercise();
              }
            }}
            className="p-1.5 rounded-lg text-[9px] font-bold border text-[#F5EDED]/30 border-[#890404]/20 hover:text-red-400 hover:border-red-500/30 transition-colors"
            title="Retirer cet exercice" aria-label="Retirer cet exercice"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {!exState.collapsed && (
      <>
      {/* Consigne du programme : 2 lignes, dépliable au tap pour tout lire. */}
      {programNotes && (
        <button
          type="button"
          onClick={() => setProgramNotesOpen((v) => !v)}
          aria-expanded={programNotesOpen}
          className="w-full text-left border-t border-[#890404]/20 px-4 py-2.5 flex items-start gap-2 hover:bg-[#890404]/5 transition-colors"
        >
          <ClipboardList size={12} className="text-[#E01E1E]/70 mt-0.5 flex-shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="ep-label block mb-0.5">Consigne du programme</span>
            <span
              className={`block text-[11px] text-[#F5EDED]/65 leading-snug whitespace-pre-wrap break-words ${
                programNotesOpen ? "" : "line-clamp-2"
              }`}
            >
              {programNotes}
            </span>
          </span>
        </button>
      )}

      {/* Notes panel */}
      {exState.showNotes && (
        <div className="border-t border-[#890404]/20 bg-[#1f0101] px-4 py-3">
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-2">
            Ta note sur cet exercice
          </p>
          <textarea
            value={exState.clientNotes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Ex. variante testée, gêne à l'épaule, ressenti..." aria-label="Notes sur l'exercice"
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
              href={safeExternalUrl(libraryTip.video_url) ?? "#"}
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

      {/* Historique — retour direct 2026-09-17 : "j'arrive sur mon exo et je
          vois ce que j'ai fait la dernière fois, pas juste un set mais TOUS
          les sets". Une ligne par set de la séance précédente (prevSets,
          déjà dans l'ordre), plutôt qu'un seul groupe de chiffres qui ne
          représentait qu'un set choisi arbitrairement (le plus récent
          enregistré, pas forcément le premier de la série). */}
      {exState.showHistory && prevSets.length > 0 && (
        <div className="border-t border-[#890404]/20 bg-[#1f0101] px-4 py-3">
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-2">
            Dernière séance ({prevSets.length} set{prevSets.length > 1 ? "s" : ""})
          </p>
          <div className="flex flex-col gap-1.5">
            {prevSets.map((s, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className="text-[10px] font-bold text-[#F5EDED]/30 w-10 flex-shrink-0">
                  Set {i + 1}
                </span>
                <span className="flex gap-3 font-black text-white">
                  {s.weight != null && (
                    <span>
                      {s.weight}
                      <span className="text-[10px] font-normal text-[#F5EDED]/40 ml-0.5">kg</span>
                    </span>
                  )}
                  {s.reps != null && (
                    <span>
                      {s.reps}
                      <span className="text-[10px] font-normal text-[#F5EDED]/40 ml-0.5">reps</span>
                    </span>
                  )}
                  {s.rir != null && (
                    <span>
                      RIR <span className="text-[#E01E1E]">{s.rir}</span>
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sets */}
      <div className="px-3 pb-3 pt-2 space-y-2">
        {exState.sets.map((set, idx) => (
          <SetRow
            key={set.localId}
            set={set}
            // Le numero AFFICHE est la position dans la liste, jamais le
            // set_number stocke : celui-ci identifie la ligne en base et
            // peut garder des trous apres un retrait de serie, ce qui
            // affichait "Set 1" puis "Set 3" a l'ecran.
            position={idx + 1}
            exercise={exState.exercise}
            prevWeight={prevWeight}
            // Même rang que la dernière fois (prevSets est trié par numéro
            // de série) : la série lourde se compare à la série lourde, plus
            // au dernier set enregistré qui était souvent le back-off.
            prevSet={prevSets[idx] ?? null}
            targetRange={rangeForSet(ranges, idx)}
            prevInSession={
              [...exState.sets.slice(0, idx)].reverse().find((s) => s.validated) ?? null
            }
            prThreshold={getPrThreshold(set.localId)}
            isSessionRecord={set.localId === recordHolderId}
            sessionId={sessionId}
            onChange={(patch) => {
              const newSets = [...exState.sets];
              newSets[idx] = { ...newSets[idx], ...patch };
              onUpdate({ sets: newSets });
            }}
            onValidate={() => onValidateSet(idx)}
            onUnvalidate={() => onUnvalidateSet(idx)}
            onRetrySave={() => onRetrySaveSet(idx)}
            onRemove={() => onRemoveSet(idx)}
            onEnsureSetId={() => onEnsureSetId(idx)}
          />
        ))}

        {/* Add set */}
        <button
          onClick={() => {
            // Numero = le plus haut deja utilise + 1, jamais `length + 1` :
            // apres le retrait d'une serie du milieu, `length + 1` redonnait
            // un numero deja pris et creait un doublon (a l'ecran et en base).
            const nextNumber =
              exState.sets.reduce((max, s) => Math.max(max, s.setNumber), 0) + 1;
            const newSets = [
              ...exState.sets,
              {
                localId: newLocalId(),
                setNumber: nextNumber,
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
      </>
      )}
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
        aria-label={label}
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
  const confirm = useConfirm();
  // SessionView est aussi utilisé pour le logbook perso du coach
  // (/dashboard/coach/moi/logbook) — le lien de partage doit pointer vers
  // le mur Victoires du bon rôle, pas toujours celui du client.
  const communityBasePath = returnPath.startsWith("/dashboard/coach") ? "/dashboard/coach" : "/dashboard/client";

  // Init state
  const [loading, setLoading] = useState(true);
  const [initData, setInitData] = useState<InitData | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  // Session state
  const [step, setStep] = useState<Step>("warmup");
  const [sessionElapsed, setSessionElapsed] = useState(0);
  // MASTERCLASS (react-hooks/purity, 2026-08-16) : la vraie valeur de
  // départ est toujours écrite avant lecture, soit par l'effet de
  // chargement de séance ci-dessous (ligne ~1451, avant tout passage de
  // `step` à "session"), soit par handleWarmupValidate — jamais lue tant
  // que ces deux chemins n'ont pas tourné. Pas besoin d'un Date.now() ici
  // (impur, interdit pendant le rendu), 0 est une valeur de repos sûre.
  const sessionStartRef = useRef<number>(0);
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
  const [completeError, setCompleteError] = useState<string | null>(null);

  // Fetch initial data
  useEffect(() => {
    fetch(`/api/client/sessions/${sessionId}`)
      .then((r) => {
        // Une réponse d'erreur ({ error }) était traitée comme des données :
        // l'écran plantait sur data.exercises au lieu d'afficher "Séance
        // introuvable".
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: InitData) => {
        setInitData(data);
        // Exercices ajoutés en cours de séance (localStorage) : celui qui
        // porte le même nom qu'un exercice synthétique renvoyé par le
        // serveur le remplace (même exercice, et son id garde l'ordre
        // mémorisé des cartes) ; celui qui double un exercice du programme
        // est ignoré (même nom = mêmes séries en base, deux cartes se
        // seraient écrasé leurs séries l'une l'autre).
        const customExercises = loadCustomExercises(sessionId);
        const customNames = new Set(customExercises.map((e) => e.name));
        const serverExercises = data.exercises.filter(
          (e) => !(isSyntheticExercise(e) && customNames.has(e.name))
        );
        const serverNames = new Set(serverExercises.map((e) => e.name));
        const combined = applyExerciseOrder(
          [...serverExercises, ...customExercises.filter((e) => !serverNames.has(e.name))],
          loadExerciseOrder(sessionId)
        );
        const exStates = buildExerciseState(
          combined,
          data.existingSets,
          data.exerciseNotes
        );
        setExercises(exStates);

        // Chrono de repos en cours avant le rechargement (voir
        // saveRestTimer) : on le reprend là où il en était, rattaché à sa
        // série par son id en base (le localId d'une série rechargée).
        if (!data.session.is_completed && data.session.warmup_validated) {
          const stored = loadRestTimer(sessionId);
          if (stored) {
            const age = Date.now() - stored.startedAt;
            const target = findRestTimerSet(exStates, stored);
            if (target && age >= 0 && age < REST_TIMER_MAX_AGE_MS) {
              setRestTimer({
                startedAt: stored.startedAt,
                suggestedSeconds: stored.suggestedSeconds,
                suggestedLabel: stored.suggestedLabel,
                setLocalId: target.localId,
              });
            } else {
              clearRestTimer(sessionId);
            }
          }
        }

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
      .catch((e) => {
        // 404 : la séance n'existe pas (ou plus) pour ce compte. Tout le
        // reste (réseau coupé en salle, serveur indisponible) ne doit pas
        // se faire passer pour une séance perdue.
        setLoadFailed(!(e instanceof Error && e.message === "HTTP 404"));
        setLoading(false);
      });
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

  // Bug réel confirmé sur son compte (88 sets tapés, 0 PR jamais détecté
  // malgré des charges lourdes, ex. 120kg au soulevé de terre) : isPR
  // exigeait un prThreshold déjà existant (initData.prMap, dérivé de
  // personal_records) — sur un exercice jamais fait avant, ce seuil est
  // toujours null, donc AUCUN poids ne peut jamais devenir un premier PR.
  // Premier poids validé sur un exercice sans historique = PR (c'est
  // littéralement son seul record), et il relève la barre pour les sets
  // suivants de la même séance.
  // Le seuil se recalcule désormais à partir des séries validées à l'écran
  // (computeThreshold) au lieu d'un state "meilleur poids de la séance"
  // perdu à chaque rechargement : partagé entre persistSet (vrai isPR
  // sauvegardé) et le badge "🏆 PR !" affiché pendant la saisie, pour que
  // les deux racontent toujours la même histoire.
  const getEffectiveThreshold = useCallback(
    (exerciseName: string, excludeLocalId?: string): number | null =>
      computeThreshold(exercises, initData?.prMap ?? {}, exerciseName, excludeLocalId),
    [exercises, initData]
  );

  // Envois en vol, par set : un double-tap sur "Valider le set" partait en
  // deux requetes a ~1s d'ecart et enregistrait deux fois la meme serie
  // (doublons reels constates en base, comptes double dans le volume et le
  // recap). Le bouton est aussi desactive pendant l'envoi, ce garde couvre
  // les cas ou l'etat React n'a pas encore ete rendu.
  const savingSetsRef = useRef<Set<string>>(new Set());

  // Debounce des notes libres par exercice (client_exercise_notes) — un
  // PATCH par frappe saturerait l'API pour rien, un par exercice suffit
  // (une Map plutôt qu'un seul timer : deux exercices différents notés
  // presque en même temps ne doivent pas s'annuler l'un l'autre).
  const noteSaveTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Enregistre (ou re-enregistre) un set. La route POST est idempotente sur
  // (seance, exercice, numero de serie) : la rappeler pour un set deja
  // enregistre met a jour la meme ligne, elle n'en cree jamais une seconde.
  const persistSet = useCallback(
    // markValidated=false : utilisé pour créer la ligne en base juste pour
    // pouvoir y rattacher une vidéo AVANT que le set soit réellement fini
    // (voir handleEnsureSetSaved plus bas) — le formulaire poids/reps reste
    // affiché, jamais basculé sur le récapitulatif comme si le set était
    // déjà validé alors qu'il ne l'est pas encore.
    async (exIdx: number, setIdx: number, options?: { markValidated?: boolean }): Promise<string | null> => {
      const markValidated = options?.markValidated ?? true;
      const exState = exercises[exIdx];
      const set = exState?.sets[setIdx];
      if (!exState || !set) return null;
      if (savingSetsRef.current.has(set.localId)) return set.dbId;
      savingSetsRef.current.add(set.localId);

      const ex = exState.exercise;
      const prevWeight =
        initData?.prevWeights[ex.name.toLowerCase()] ?? null;

      const weight = parseFloat(set.weightKg) || null;
      // Hors la série elle-même : la revalider (après correction) ne doit
      // pas lui retirer son PR parce qu'elle "égale" son propre poids.
      const effectiveThreshold = getEffectiveThreshold(ex.name, set.localId);
      const isPR = weight != null && (effectiveThreshold == null || weight > effectiveThreshold);

      // Retrouve le set par son localId plutot que par son index : entre le
      // depart de la requete et sa reponse, l'utilisateur a pu retirer une
      // serie ou reordonner ses exercices.
      const patchSet = (patch: Partial<SetState>) =>
        setExercises((prev) =>
          prev.map((exItem) => {
            const idx = exItem.sets.findIndex((s) => s.localId === set.localId);
            if (idx === -1) return exItem;
            const newSets = [...exItem.sets];
            newSets[idx] = { ...newSets[idx], ...patch };
            return { ...exItem, sets: newSets };
          })
        );

      patchSet({ saving: true });

      // Insert set in DB
      let dbId: string | null = null;
      let failed = false;
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
        // res.ok n'etait jamais teste : sur un 403/429/500 on lisait `id`
        // dans un corps { error }, donc undefined, et le set passait quand
        // meme au vert alors qu'il n'existait nulle part en base. Il
        // disparaissait au rechargement suivant, sans un mot.
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as { id?: string };
        dbId = typeof json.id === "string" ? json.id : null;
        if (!dbId) throw new Error("réponse sans identifiant");
      } catch (e) {
        console.error("Enregistrement du set impossible:", e);
        failed = true;
      }

      savingSetsRef.current.delete(set.localId);
      if (dbId) attachRestTimerDbId(sessionId, set.localId, dbId);

      // Update local state — le geste de l'utilisateur est conserve meme si
      // le reseau a laché, mais le set porte alors un avertissement visible
      // et un bouton "Réessayer" (voir SetRow).
      // Pas d'ajout automatique d'un set vide supplémentaire ici — seul le
      // bouton "Ajouter un set" doit en créer un, sinon ça apparaît comme
      // un set rajouté tout seul sans que le client ait rien demandé.
      patchSet({
        ...(markValidated ? { validated: true } : {}),
        isPR,
        saving: false,
        saveFailed: failed,
        ...(dbId ? { dbId } : {}),
      });

      return dbId;
    },
    [exercises, initData, sessionId, getEffectiveThreshold]
  );

  // Rattacher une vidéo au set exige une ligne en base, mais filmer AVANT
  // d'avoir logué poids/reps est justement le seul ordre qui a du sens
  // (retour direct 2026-09-09 : "c'est incohérent de filmer après avoir
  // fini le set, c'est juste con") — la ligne se crée alors avec ce qui est
  // déjà rempli (même vide), sans marquer le set comme validé : le
  // formulaire reste ouvert, la vidéo s'attache simplement en plus.
  const handleEnsureSetSaved = useCallback(
    async (exIdx: number, setIdx: number): Promise<string | null> => {
      const existing = exercises[exIdx]?.sets[setIdx]?.dbId;
      if (existing) return existing;
      return persistSet(exIdx, setIdx, { markValidated: false });
    },
    [exercises, persistSet]
  );

  // Referme le chrono de repos EN COURS (celui du set précédent) et
  // persiste sa durée réelle — retour direct 2026-09-17 : plus aucun clic
  // ne ferme le chrono explicitement (voir RestTimerBadge, non bloquant),
  // donc c'est la validation du set SUIVANT qui referme celui d'avant.
  // Extrait de l'ancien handleRestClose (déclenché jusque-là par le bouton
  // "C'est parti" de RestTimerOverlay), même logique de persistance.
  const closeRestTimer = useCallback(
    (timer: RestTimer, elapsedSeconds: number) => {
      let dbId: string | null = null;
      for (const ex of exercises) {
        const s = ex.sets.find((x) => x.localId === timer.setLocalId);
        if (s) {
          dbId = s.dbId;
          break;
        }
      }

      setExercises((exs) =>
        exs.map((ex) => {
          const idx = ex.sets.findIndex((s) => s.localId === timer.setLocalId);
          if (idx === -1) return ex;
          const newSets = [...ex.sets];
          newSets[idx] = { ...newSets[idx], restDuration: elapsedSeconds };
          return { ...ex, sets: newSets };
        })
      );

      // La duree de repos n'est connue qu'a la fermeture du chrono, donc
      // apres l'enregistrement du set : sans ce PATCH la colonne
      // rest_duration_seconds n'a jamais ete remplie pour un seul set, alors
      // qu'elle figure dans l'export CSV du logbook.
      if (dbId) {
        fetch(`/api/client/sessions/${sessionId}/sets/${dbId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rest_duration_seconds: elapsedSeconds }),
        }).catch(() => {});
      }
    },
    [exercises, sessionId]
  );

  const handleValidateSet = useCallback(
    (exIdx: number, setIdx: number) => {
      const set = exercises[exIdx]?.sets[setIdx];
      // Le ref est teste en plus de `set.saving` : sur un double-tap, les
      // deux clics arrivent avant que React n'ait rendu le premier etat, et
      // le second relancait aussi le chrono de repos a zero.
      if (!set || set.saving || savingSetsRef.current.has(set.localId)) return;

      // Plus aucun blocage entre deux sets (retour direct 2026-09-17) : si
      // un chrono de repos tournait déjà pour le set précédent, il se
      // referme ici et sa durée réelle est celle qui vient de s'écouler.
      if (restTimer) {
        closeRestTimer(restTimer, Math.floor((Date.now() - restTimer.startedAt) / 1000));
      }

      // Chrono de repos ouvert immediatement : il doit demarrer quand la
      // serie se termine, pas a la fin de l'aller-retour reseau.
      // Repos du programme en priorité (45 s aux élévations latérales, 60 s
      // au pec deck...) : avant, seul le RIR comptait, et avec un RIR 0
      // partout le bip sonnait toujours à 3:00. Le barème par RIR reste pour
      // un exercice sans repos programmé (séance libre, exercice ajouté).
      const rir = set.rirActual ? parseInt(set.rirActual) : 2;
      const programmedRest = exercises[exIdx]?.exercise.rest_seconds;
      const suggested =
        programmedRest != null && programmedRest > 0
          ? { seconds: programmedRest, label: formatRest(programmedRest) }
          : getSuggestedRest(rir);
      const timer: RestTimer = {
        startedAt: Date.now(),
        suggestedSeconds: suggested.seconds,
        suggestedLabel: suggested.label,
        setLocalId: set.localId,
      };
      setRestTimer(timer);
      saveRestTimer(sessionId, {
        ...timer,
        setDbId: set.dbId,
        exerciseName: exercises[exIdx]?.exercise.name ?? null,
        setNumber: set.setNumber,
      });

      void persistSet(exIdx, setIdx);
    },
    [exercises, persistSet, restTimer, closeRestTimer, sessionId]
  );

  const handleRetrySaveSet = useCallback(
    (exIdx: number, setIdx: number) => {
      void persistSet(exIdx, setIdx);
    },
    [persistSet]
  );

  const handleAddExercise = useCallback(
    (input: { name: string; muscleGroup: string | null }) => {
      // Exercice déjà présent sous ce nom exact : une seconde carte
      // partagerait les mêmes séries en base (le POST est idempotent sur
      // exercice + numéro de série) et sa "Set 1" écraserait celle déjà
      // faite. On ajoute plutôt une série à la carte existante.
      const existingIdx = exercises.findIndex((e) => e.exercise.name === input.name);
      if (existingIdx !== -1) {
        setExercises((prev) =>
          prev.map((e, i) => {
            if (i !== existingIdx) return e;
            const nextNumber = e.sets.reduce((max, st) => Math.max(max, st.setNumber), 0) + 1;
            return {
              ...e,
              collapsed: false,
              sets: [
                ...e.sets,
                {
                  localId: newLocalId(),
                  setNumber: nextNumber,
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
              ],
            };
          })
        );
        return;
      }
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
          collapsed: false,
        },
      ]);
      saveCustomExercises(sessionId, [...loadCustomExercises(sessionId), newExercise]);
    },
    [exercises, sessionId]
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

  // Retirer un set d'un exercice.
  const handleRemoveSet = useCallback(
    (exIdx: number, setIdx: number) => {
      const removed = exercises[exIdx]?.sets[setIdx];
      // Retirer une serie ne supprimait jamais la ligne deja enregistree en
      // base : elle reapparaissait telle quelle au rechargement suivant.
      // (Le bouton n'apparait que sur un set non valide, mais un set peut
      // avoir ete devalide juste avant tout en gardant sa ligne en base.)
      if (removed?.dbId) {
        fetch(`/api/client/sessions/${sessionId}/sets/${removed.dbId}`, {
          method: "DELETE",
        }).catch(() => {});
      }
      setExercises((prev) => {
        const next = [...prev];
        next[exIdx] = {
          ...next[exIdx],
          sets: next[exIdx].sets.filter((_, i) => i !== setIdx),
        };
        return next;
      });
    },
    [exercises, sessionId]
  );

  // Dévalider un set déjà validé — repasse en mode édition, les valeurs
  // saisies restent modifiables. La ligne en base est CONSERVEE : la route
  // POST est idempotente sur (séance, exercice, numéro de série), donc
  // revalider écrase la même ligne au lieu d'en créer une seconde. Avant,
  // on supprimait tout de suite en base : cliquer sur le crayon puis
  // quitter la séance sans revalider effaçait la série pour de bon, sans le
  // moindre message.
  const handleUnvalidateSet = useCallback((exIdx: number, setIdx: number) => {
    setExercises((prev) => {
      const next = [...prev];
      const newSets = [...next[exIdx].sets];
      newSets[setIdx] = {
        ...newSets[setIdx],
        validated: false,
        isPR: false,
        saveFailed: false,
      };
      next[exIdx] = { ...next[exIdx], sets: newSets };
      return next;
    });
  }, []);

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

  // Notes libres du client sur un exercice — persistées en base
  // (client_exercise_notes, toujours la même quelle que soit la séance) ET
  // jointes aux sets envoyés pour rester visibles côté coach dans l'export.
  // PATCH débouncé à 800ms : la frappe met à jour l'écran tout de suite,
  // l'enregistrement réseau suit une fois que le client a fini d'écrire.
  const handleExerciseNotesChange = useCallback(
    (exIdx: number, exerciseName: string, notes: string) => {
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
      setExercises((prev) => {
        const next = [...prev];
        next[exIdx] = { ...next[exIdx], clientNotes: notes };
        return next;
      });
    },
    []
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

  // PRs from this session : un seul par exercice (la série la plus lourde),
  // et seulement s'il bat le record en base. Avant, TOUTES les séries
  // marquées PR partaient à /complete, d'où les doublons dans
  // personal_records. Séance déjà terminée : ses propres records sont dans
  // prMap, on relit donc les drapeaux enregistrés (dédoublonnés).
  const sessionRecords = computeSessionRecords(exercises, initData?.prMap ?? {});
  const sessionPRs = (
    initData?.session.is_completed ? recordsFromFlags(exercises) : [...sessionRecords.values()]
  ).map((r) => ({ exerciseName: r.exerciseName, weightKg: r.weightKg, reps: r.reps }));

  const [canceling, setCanceling] = useState(false);

  // Abandonner une séance de test/erreur sans rien enregistrer — jusqu'ici
  // seul "Terminer" existait, qui sauvegarde toujours tout.
  const handleCancelSession = useCallback(async () => {
    if (!(await confirm("Annuler cette séance ? Rien ne sera enregistré."))) return;
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
    clearRestTimer(sessionId);
    router.push(returnPath);
  }, [sessionId, returnPath, router, confirm]);

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
          // Recalculé ici depuis les séries validées plutôt que lu dans
          // sessionPRs : même résultat (un record par exercice, au-dessus
          // de prMap), sans dépendre d'une valeur dérivée d'une Map.
          prs: [...computeSessionRecords(exercises, initData?.prMap ?? {}).values()].map((r) => ({
            exerciseName: r.exerciseName,
            weightKg: r.weightKg,
            reps: r.reps,
          })),
          workoutData,
        }),
      });
      // La réponse n'était jamais lue : sur une erreur serveur, l'écran
      // effaçait la séance en cours et repartait au logbook comme si tout
      // était sauvegardé. On reste sur le récap, rien n'est perdu.
      if (!res.ok) {
        setCompleteError("La séance n'a pas pu être sauvegardée. Réessaie.");
        setSaving(false);
        return;
      }

      // Séance sauvegardée : un stockage local inaccessible ne doit pas
      // faire croire le contraire (le catch plus bas parle de connexion).
      try {
        localStorage.removeItem(`ep-session-start-${sessionId}`);
        localStorage.removeItem(`ep-warmup-start-${sessionId}`);
        localStorage.removeItem(customExercisesKey(sessionId));
        localStorage.removeItem("ep-active-session-id");
      } catch {}
      clearRestTimer(sessionId);
      router.push(returnPath);
    } catch {
      setCompleteError("Pas de connexion, la séance n'est pas encore sauvegardée. Réessaie.");
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
    initData,
    router,
    returnPath,
  ]);

  const [reopening, setReopening] = useState(false);
  const [reopenError, setReopenError] = useState<string | null>(null);

  // "Faut un bouton retour en arrière" (note laissée sur une séance "Pull",
  // 2026-09-09) : jusqu'ici, une fois "Terminer" cliqué par erreur, c'était
  // définitif — seul moyen de corriger était de contacter le coach. Défait
  // précisément ce que /complete a produit (PR, volume, points), sans jamais
  // toucher aux sets déjà tapés (session_sets) : ils restent là, prêts à
  // être corrigés puis revalidés. Voir app/api/client/sessions/[id]/reopen.
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
      // Rechargement complet plutôt qu'un simple router.refresh() : session,
      // exercises, existingSets... sont tous chargés une seule fois au
      // montage dans du state local (pas des Server Components), un refresh
      // Next.js seul ne les referait pas repasser par le fetch initial.
      window.location.reload();
    } catch {
      setReopenError("Erreur, réessaie.");
      setReopening(false);
    }
  }, [sessionId, confirm]);

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
        {loadFailed ? (
          <>
            <p className="text-[#F5EDED]/60 text-sm mb-1">Impossible de charger la séance.</p>
            <p className="text-[#F5EDED]/35 text-xs mb-4">
              Vérifie ta connexion : tes séries déjà validées sont enregistrées.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="ep-btn-primary"
              style={{ padding: "12px 22px", fontSize: 12, borderRadius: 12 }}
            >
              Réessayer
            </button>
          </>
        ) : (
          <p className="text-[#F5EDED]/40">Séance introuvable</p>
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
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
            Récap de séance
          </p>
          <h1 className="text-2xl font-black uppercase">{session.day_label}</h1>
          <p className="text-xs text-[#F5EDED]/35 mt-1">
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
            { label: "Sets", value: String(totalSetsCompleted), icon: Dumbbell, color: "#E01E1E" },
            { label: "RIR moy.", value: avgRIR != null ? String(Math.round(avgRIR * 10) / 10) : "···", icon: Activity, color: "#4ade80" },
            { label: "Score tech.", value: avgScore > 0 ? `${Math.round(avgScore * 10) / 10}/5` : "···", icon: Star, color: "#fbbf24" },
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
            <div className="flex flex-wrap gap-2 mb-3">
              {sessionPRs.map((pr, i) => (
                <span
                  key={i}
                  className="text-xs font-bold text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20"
                >
                  {pr.exerciseName} : {pr.weightKg} kg
                </span>
              ))}
            </div>
            {/* Le PR est détecté ici, mais rien ne poussait le client vers
                Victoires ensuite — l'onglet est resté vide malgré des PR
                réels en logbook. Pré-remplit le post plutôt que de le
                publier à sa place : partager reste son choix. */}
            <a
              href={`${communityBasePath}/communaute/victoires?share=${encodeURIComponent(buildPRShareText(sessionPRs))}`}
              className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 px-3 py-1.5 rounded-lg border border-amber-500/30 transition-colors"
            >
              <Trophy size={11} /> Partager en Victoire
            </a>
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
                  placeholder="Observations, fatigue particulière, douleurs..." aria-label="Observations, fatigue particulière, douleurs..."
                  rows={3}
                  className="w-full bg-[#150000] border border-[#890404]/30 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-[#F5EDED]/20 focus:outline-none focus:border-[#E01E1E]/50 resize-none"
                />
              </div>
            </>
          )}
          {session.is_completed && (
            <div className="flex gap-4">
              <div className="text-center">
                <p className="text-2xl font-black text-white">{session.energy_level ?? "···"}</p>
                <p className="text-[9px] text-[#F5EDED]/30 uppercase tracking-wider">Énergie</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-white">{session.pump ?? "···"}</p>
                <p className="text-[9px] text-[#F5EDED]/30 uppercase tracking-wider">Pump</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-white">{session.general_feeling ?? "···"}</p>
                <p className="text-[9px] text-[#F5EDED]/30 uppercase tracking-wider">Feeling</p>
              </div>
            </div>
          )}
          {/* Les notes libres saisies en fin de séance n'étaient visibles
              nulle part dans le récap. */}
          {session.is_completed && session.notes && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1.5">
                Notes libres
              </p>
              <p className="text-sm text-[#F5EDED]/70 leading-relaxed whitespace-pre-wrap break-words">
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
          <div className="bg-[#1f0101] border border-[#890404]/25 rounded-xl p-5 mb-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-3">
              Détail des séries
            </p>
            <SessionSetsBreakdown
              sets={recapBreakdownSets}
              videoUrlFor={(s) => initData.videoUrlsBySetId?.[s.id] ?? null}
            />
          </div>
        )}

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
            {completeError && (
              <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3 mb-3">
                <AlertCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-300">{completeError}</p>
              </div>
            )}
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

        {/* Rouvrir une séance terminée par erreur — uniquement le jour même
            (voir app/api/client/sessions/[id]/reopen, même borne côté
            serveur). Ne remplace pas "Annuler" ci-dessus : celui-là supprime
            une séance jamais terminée, celui-ci rouvre une séance terminée
            par erreur pour la corriger. */}
        {session.is_completed && session.session_date === todayInParis() && (
          <div className="mt-2">
            {reopenError && (
              <p className="text-[11px] text-red-400 text-center mb-2">{reopenError}</p>
            )}
            <button
              onClick={handleReopenSession}
              disabled={reopening}
              className="w-full py-3 flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[#F5EDED]/35 hover:text-amber-400 border border-[#890404]/25 hover:border-amber-500/40 rounded-xl transition-colors disabled:opacity-50"
            >
              {reopening ? (
                <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <RotateCcw size={13} />
              )}
              {reopening ? "Réouverture…" : "Terminée par erreur ? Rouvrir la séance"}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── SESSION ──────────────────────────────────────────────────────────────────
  const totalSetsAll = exercises.flatMap((e) => e.sets.filter((s) => s.validated)).length;
  const musclesBeingTrained = Object.keys(volumeByMuscle);
  // Accessoires à prévoir : UNIQUEMENT le bagage choisi explicitement par
  // exercice (exercise_library.accessories) — plus aucune devinette par
  // mots-clés affichée ici depuis le 2026-09-10, voir lib/session-accessories.ts.
  const sessionAccessories = accessoriesForSession(
    exercises.map((e) => e.exercise.name),
    initData?.accessoriesByName
  );

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
              <div className="flex items-center gap-1.5 flex-wrap">
                <Clock size={12} style={{ color: restTimer ? "#facc15" : "#E01E1E" }} />
                {/* Retour direct 2026-09-17 : "change subtilement la couleur
                    du temps total dès que le set est fini et dès qu'on
                    reprend, comme ça pas besoin de valider le repos, 0 clic
                    juste regarder". Le temps total change de couleur au lieu
                    d'ouvrir un questionnaire à valider — le badge de repos
                    juste à côté donne le détail pour qui veut le temps exact. */}
                <span
                  className="text-lg font-black tabular-nums transition-colors"
                  style={{ color: restTimer ? "#facc15" : "#fff" }}
                >
                  {formatTime(sessionElapsed)}
                </span>
                {restTimer && <RestTimerBadge timer={restTimer} />}
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

      {/* À prévoir : accessoires déduits des exercices de la séance (demande
          directe 2026-09-08). Rien ne s'affiche si aucun exercice ne le
          justifie, plutôt qu'une carte vide. */}
      {sessionAccessories.length > 0 && (
        <div className="px-4 pt-5 max-w-2xl mx-auto">
          <div className="bg-[#1f0101] border border-[#890404]/20 rounded-xl px-4 py-3">
            <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-2">
              <Backpack size={11} /> À prévoir pour cette séance
            </p>
            {/* La raison est affichée, pas cachée dans un title : sur mobile le
                survol n'existe pas, et sans le pourquoi la liste n'est qu'un
                nom de produit de plus. */}
            <ul className="space-y-2">
              {sessionAccessories.map((a) => {
                // ALWAYS_ACCESSORIES (trépied, shaker) n'ont ni fiche produit
                // ni exercice à justifier (lib/session-accessories.ts) : pas
                // de lien cliquable ni de ligne "Pour ...".
                const content = (
                  <>
                    <span className="flex items-center gap-1 text-[12.5px] font-bold text-white group-hover:text-[#E01E1E] transition-colors">
                      {a.accessory}
                      {a.url && <ExternalLink size={10} className="text-[#F5EDED]/30" />}
                    </span>
                    <span className="block text-[11px] text-[#F5EDED]/45 leading-snug">{a.reason}</span>
                    {a.forExercises.length > 0 && (
                      <span className="block text-[10px] text-[#F5EDED]/25 mt-0.5">
                        Pour {a.forExercises.slice(0, 3).join(", ")}
                      </span>
                    )}
                  </>
                );
                return (
                  <li key={a.accessory}>
                    {a.url ? (
                      <a href={a.url} target="_blank" rel="noopener noreferrer" className="block group">
                        {content}
                      </a>
                    ) : (
                      <div className="block">{content}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

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
            prevSets={initData.prevSets[exState.exercise.name.toLowerCase()] ?? []}
            getPrThreshold={(excludeLocalId) =>
              getEffectiveThreshold(exState.exercise.name, excludeLocalId)
            }
            recordHolderId={
              sessionRecords.get(exState.exercise.name.toLowerCase())?.localId ?? null
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
            onRetrySaveSet={(setIdx) => handleRetrySaveSet(exIdx, setIdx)}
            onRemoveExercise={() => handleRemoveExercise(exIdx)}
            onRemoveSet={(setIdx) => handleRemoveSet(exIdx, setIdx)}
            onEnsureSetId={(setIdx) => handleEnsureSetSaved(exIdx, setIdx)}
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
            onClick={() => {
              // Referme le chrono de repos du dernier set validé — sans set
              // suivant pour le déclencher, sa durée ne serait sinon jamais
              // persistée (voir closeRestTimer).
              if (restTimer) {
                closeRestTimer(restTimer, Math.floor((Date.now() - restTimer.startedAt) / 1000));
                setRestTimer(null);
                clearRestTimer(sessionId);
              }
              setStep("recap");
            }}
            className="ep-btn-primary w-full"
            style={{ padding: "14px 24px", fontSize: 12, borderRadius: 12 }}
          >
            Terminer la séance →
          </button>
        </div>
      </div>

    </div>
  );
}
