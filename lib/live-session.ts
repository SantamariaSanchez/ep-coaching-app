// État de la séance en cours (logbook, components/client/SessionView.tsx).
//
// Retour direct du fondateur (2026-10-14) : « si je supprime un exo il
// réapparaît quand je rouvre l'appli parce que mon tel s'est éteint 5 min »,
// « si je switch les exos ça doit rester ». Tout ce que la personne change en
// séance (ordre, exercices retirés, remplacés ou ajoutés, machine prise,
// séries saisies pas encore validées, chrono de repos) tient dans un seul
// objet, LivePlan, écrit à chaque changement dans le stockage local ET sur
// le serveur (sessions.live_state, migration 20261014). Au rechargement, la
// version la plus récente des deux gagne.
//
// Module pur, sans import serveur : il tourne côté client.

import type { Exercise } from "@/utils/programs";

// ── Techniques d'intensification ───────────────────────────────────────────

/** Forme du mini-formulaire d'une série selon la technique du programme. */
export type SegmentMode = "myo" | "rest_pause" | "cluster" | "drop";

export interface TechniqueForm {
  /** Sous-séries à saisir après la série principale (null = aucune). */
  segments: SegmentMode | null;
  /** Nombre de sous-séries proposées d'office. */
  defaultCount: number;
  /** Pause courte entre deux sous-séries, en secondes (chrono en un tap). */
  pauseSeconds: number | null;
  /** Reps partielles après l'échec. */
  partials: boolean;
  /** Série au maximum de reps (pas de cible). */
  amrap: boolean;
  /** Libellé de la série principale (« Activation » pour les myo-reps). */
  mainLabel: string | null;
}

const NO_TECHNIQUE: TechniqueForm = {
  segments: null,
  defaultCount: 0,
  pauseSeconds: null,
  partials: false,
  amrap: false,
  mainLabel: null,
};

/**
 * Ce que la série n° setIndex (0-based) doit proposer pour la technique du
 * programme. Myo-reps et cluster s'appliquent à chaque série ; dégressive,
 * rest-pause, partielles et AMRAP à la dernière (c'est ce que dit la
 * consigne affichée au client, voir TECHNIQUES dans lib/program-sheet.ts).
 */
export function techniqueForm(technique: string | null | undefined, setIndex: number, totalSets: number): TechniqueForm {
  const isLast = setIndex >= totalSets - 1;
  switch (technique) {
    case "myo_reps":
      return { ...NO_TECHNIQUE, segments: "myo", defaultCount: 3, pauseSeconds: 15, mainLabel: "Activation" };
    case "cluster":
      return { ...NO_TECHNIQUE, segments: "cluster", defaultCount: 2, pauseSeconds: 20, mainLabel: "Bloc 1" };
    case "rest_pause":
      return isLast
        ? { ...NO_TECHNIQUE, segments: "rest_pause", defaultCount: 2, pauseSeconds: 15 }
        : NO_TECHNIQUE;
    case "drop_set":
      return isLast ? { ...NO_TECHNIQUE, segments: "drop", defaultCount: 2 } : NO_TECHNIQUE;
    case "partials":
      return isLast ? { ...NO_TECHNIQUE, partials: true } : NO_TECHNIQUE;
    case "amrap":
      return isLast ? { ...NO_TECHNIQUE, amrap: true } : NO_TECHNIQUE;
    default:
      return NO_TECHNIQUE;
  }
}

export function segmentLabel(mode: SegmentMode, index: number): string {
  switch (mode) {
    case "myo":
      return `Mini ${index + 1}`;
    case "rest_pause":
      return `Après pause ${index + 1}`;
    case "cluster":
      return `Bloc ${index + 2}`;
    case "drop":
      return `Palier ${index + 1}`;
  }
}

/** Saisie d'une sous-série (texte, comme les champs du formulaire). */
export interface SegmentDraft {
  /** Charge (paliers de dégressive uniquement). */
  w?: string;
  r: string;
}

/** Détail enregistré en base (session_sets.details). */
export interface SetDetails {
  technique: string;
  segments?: { weight_kg?: number | null; reps: number | null }[];
  partials?: number | null;
}

function toNum(v: string | undefined): number | null {
  if (v == null || v.trim() === "") return null;
  const n = parseFloat(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** Détail à enregistrer, null si la série n'a rien de spécial à garder. */
export function buildDetails(
  technique: string | null | undefined,
  form: TechniqueForm,
  segs: SegmentDraft[] | undefined,
  partials: string | undefined
): SetDetails | null {
  if (!technique) return null;
  const out: SetDetails = { technique };
  let hasContent = false;
  if (form.segments && segs && segs.length > 0) {
    const rows = segs
      .map((s) => ({
        ...(form.segments === "drop" ? { weight_kg: toNum(s.w) } : {}),
        reps: toNum(s.r) != null ? Math.round(toNum(s.r) as number) : null,
      }))
      .filter((s) => s.reps != null || ("weight_kg" in s && s.weight_kg != null));
    if (rows.length > 0) {
      out.segments = rows;
      hasContent = true;
    }
  }
  if (form.partials) {
    const p = toNum(partials);
    if (p != null && p > 0) {
      out.partials = Math.round(p);
      hasContent = true;
    }
  }
  return hasContent ? out : null;
}

/** Lecture tolérante d'un détail venu de la base (colonne jsonb libre). */
export function parseDetails(raw: unknown): SetDetails | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.technique !== "string") return null;
  const out: SetDetails = { technique: r.technique };
  if (Array.isArray(r.segments)) {
    out.segments = r.segments
      .filter((s): s is Record<string, unknown> => !!s && typeof s === "object")
      .map((s) => ({
        weight_kg: typeof s.weight_kg === "number" ? s.weight_kg : null,
        reps: typeof s.reps === "number" ? s.reps : null,
      }));
  }
  if (typeof r.partials === "number") out.partials = r.partials;
  return out;
}

export function detailsToDrafts(details: SetDetails | null): { segs?: SegmentDraft[]; partials?: string } {
  if (!details) return {};
  return {
    segs: details.segments?.map((s) => ({
      ...(s.weight_kg != null ? { w: String(s.weight_kg) } : {}),
      r: s.reps != null ? String(s.reps) : "",
    })),
    partials: details.partials != null ? String(details.partials) : undefined,
  };
}

function kg(v: number): string {
  return String(Math.round(v * 10) / 10).replace(".", ",");
}

/**
 * Résumé d'une série sur une ligne : « 80 kg × 8 », « 60 kg × 12 + 5 + 4 + 4 »
 * (myo-reps), « 100 kg × 6 › 75 × 6 › 55 × 8 » (dégressive), « 40 s ».
 */
export function formatSetLine(input: {
  weight: number | null;
  reps: number | null;
  unit: string | null | undefined;
  details?: SetDetails | null;
}): string {
  const unit = input.unit === "sec" ? " s" : input.unit === "m" ? " m" : "";
  const parts: string[] = [];
  const reps = input.reps != null ? `${input.reps}${unit}` : "···";
  parts.push(input.weight != null && input.weight > 0 ? `${kg(input.weight)} kg × ${reps}` : unit ? reps : `${reps} reps`);
  const d = input.details;
  if (d?.segments && d.segments.length > 0) {
    if (d.technique === "drop_set") {
      for (const s of d.segments) {
        parts.push(`› ${s.weight_kg != null ? `${kg(s.weight_kg)} × ` : ""}${s.reps ?? "···"}`);
      }
    } else {
      parts.push(`+ ${d.segments.map((s) => s.reps ?? "···").join(" + ")}`);
    }
  }
  if (d?.partials) parts.push(`+ ${d.partials} part.`);
  return parts.join(" ");
}

/** Texte de repli quand la colonne details n'existe pas encore en base. */
export function detailsAsNote(details: SetDetails | null): string | null {
  if (!details) return null;
  const segs = details.segments ?? [];
  const label =
    details.technique === "myo_reps"
      ? "Myo-reps"
      : details.technique === "rest_pause"
        ? "Rest-pause"
        : details.technique === "drop_set"
          ? "Dégressive"
          : details.technique === "cluster"
            ? "Cluster"
            : details.technique === "partials"
              ? "Partielles"
              : details.technique;
  const body =
    details.technique === "drop_set"
      ? segs.map((s) => `${s.weight_kg != null ? `${kg(s.weight_kg)} kg × ` : ""}${s.reps ?? "?"}`).join(", ")
      : segs.map((s) => s.reps ?? "?").join(" + ");
  const partials = details.partials ? `${body ? ", " : ""}${details.partials} partielles` : "";
  return `[${label} : ${body}${partials}]`;
}

// ── Tempo, unités, pas des boutons +/- ─────────────────────────────────────

/** « 3-1-1-0 » → « 3 s descente · 1 s en bas · 1 s montée · 0 s en haut ». */
export function describeTempo(tempo: string | null | undefined): string | null {
  if (!tempo) return null;
  const parts = tempo
    .replace(/[\u2013\u2014\u2212/.:]/g, "-")
    .split("-")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length < 3 || parts.length > 4) return null;
  const labels = ["descente", "en bas", "montée", "en haut"];
  return parts
    .map((p, i) => {
      const v = p.toUpperCase() === "X" ? "explosif" : /^\d+$/.test(p) ? `${p} s` : p;
      return `${v} ${labels[i]}`;
    })
    .join(" · ");
}

export function repsStep(unit: string | null | undefined): number {
  if (unit === "sec" || unit === "m") return 5;
  return 1;
}

export function weightStep(weight: number | null): number {
  if (weight == null || weight < 20) return 1;
  return 2.5;
}

/** Ajoute `delta` à une saisie texte (« 32,5 ») en restant à 0 minimum. */
export function bumpValue(raw: string, delta: number, decimals = 1): string {
  const cur = toNum(raw) ?? 0;
  const next = Math.max(0, Math.round((cur + delta) * 10 ** decimals) / 10 ** decimals);
  return String(next);
}

/** Charge d'un palier de dégressive : environ -25 % du palier précédent. */
export function dropWeight(prev: number | null): number | null {
  if (prev == null || prev <= 0) return null;
  const step = prev >= 20 ? 2.5 : 1;
  return Math.max(step, Math.round((prev * 0.75) / step) * step);
}

// ── État persistant de la séance ───────────────────────────────────────────

export interface SetDraft {
  w: string;
  r: string;
  rir: string;
  score: string;
  segs?: SegmentDraft[];
  partials?: string;
  /** Validée à l'écran mais pas encore enregistrée (réseau coupé). */
  pending?: boolean;
}

export interface LiveRest {
  /** Heure de départ (Date.now) : le décompte reste juste même appli en fond. */
  startedAt: number;
  seconds: number;
  label: string;
  /** Série dont c'est le repos (clé d'exercice + numéro), null pour une pause. */
  exKey: string | null;
  setNumber: number | null;
  /** « set » = repos entre deux séries, « pause » = pause courte de technique. */
  kind: "set" | "pause";
}

export interface LivePlan {
  v: 1;
  updatedAt: number;
  /** Clés d'exercice dans l'ordre affiché. */
  order: string[];
  /** Exercices retirés pour cette séance (clés) et leurs noms. */
  removed: string[];
  removedNames: string[];
  /** Exercices ajoutés ou remplaçants (id « local-… »). */
  added: LiveExercise[];
  /** « Machine prise » : exercices repoussés, à reprendre plus tard. */
  deferred: string[];
  /** Numéros des séries prévues par exercice (après ajout ou retrait). */
  setNumbers: Record<string, number[]>;
  /** Saisies pas encore enregistrées : clé d'exercice → numéro → valeurs. */
  drafts: Record<string, Record<string, SetDraft>>;
  /** Exercice déplié. */
  focus: string | null;
  rest: LiveRest | null;
}

/** Exercice ajouté en séance : remplaçant d'un exercice du programme ou ajout libre. */
export interface LiveExercise extends Exercise {
  /** Nom de l'exercice du programme qu'il remplace (« machine prise »). */
  replaces?: string | null;
}

export function emptyPlan(): LivePlan {
  return {
    v: 1,
    updatedAt: 0,
    order: [],
    removed: [],
    removedNames: [],
    added: [],
    deferred: [],
    setNumbers: {},
    drafts: {},
    focus: null,
    rest: null,
  };
}

/**
 * Clé stable d'un exercice pour toute la séance. Les exercices du programme
 * sont repérés par leur NOM : chaque sauvegarde du programme par le coach
 * recrée les lignes (nouveaux id), le nom reste. Les ajouts gardent leur id
 * « local-… », les exercices reconstruits depuis la base aussi.
 */
export function exerciseKey(ex: Pick<Exercise, "id" | "name">): string {
  if (ex.id.startsWith("local-")) return ex.id;
  return `p:${ex.name}`;
}

function strArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

function parseDraft(v: unknown): SetDraft | null {
  if (!v || typeof v !== "object") return null;
  const d = v as Record<string, unknown>;
  const s = (x: unknown) => (typeof x === "string" ? x : typeof x === "number" ? String(x) : "");
  const out: SetDraft = { w: s(d.w), r: s(d.r), rir: s(d.rir), score: s(d.score) };
  if (Array.isArray(d.segs)) {
    out.segs = d.segs
      .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
      .map((x) => ({ ...(x.w != null ? { w: s(x.w) } : {}), r: s(x.r) }));
  }
  if (d.partials != null) out.partials = s(d.partials);
  if (d.pending === true) out.pending = true;
  return out;
}

function parseExercise(v: unknown): LiveExercise | null {
  if (!v || typeof v !== "object") return null;
  const e = v as Record<string, unknown>;
  if (typeof e.id !== "string" || !e.id.startsWith("local-") || typeof e.name !== "string" || !e.name.trim()) {
    return null;
  }
  const str = (x: unknown) => (typeof x === "string" ? x : null);
  const num = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? x : null);
  return {
    id: e.id,
    day_id: "",
    name: e.name,
    sets: num(e.sets),
    reps: str(e.reps),
    rir: num(e.rir),
    rest_seconds: num(e.rest_seconds),
    notes: str(e.notes),
    position: num(e.position) ?? 0,
    muscle_group: str(e.muscle_group),
    muscle_subgroup: str(e.muscle_subgroup),
    is_direct: e.is_direct !== false,
    superset_group: str(e.superset_group),
    reps_unit: str(e.reps_unit),
    technique: str(e.technique),
    tempo: str(e.tempo),
    replaces: str(e.replaces),
  };
}

/** Lecture tolérante (stockage local ou colonne jsonb) : jamais d'exception. */
export function parsePlan(raw: unknown): LivePlan | null {
  let v = raw;
  if (typeof v === "string") {
    try {
      v = JSON.parse(v);
    } catch {
      return null;
    }
  }
  if (!v || typeof v !== "object") return null;
  const p = v as Record<string, unknown>;
  if (p.v !== 1) return null;
  const plan = emptyPlan();
  plan.updatedAt = typeof p.updatedAt === "number" ? p.updatedAt : 0;
  plan.order = strArray(p.order);
  plan.removed = strArray(p.removed);
  plan.removedNames = strArray(p.removedNames);
  plan.deferred = strArray(p.deferred);
  plan.focus = typeof p.focus === "string" ? p.focus : null;
  plan.added = Array.isArray(p.added) ? p.added.map(parseExercise).filter((e): e is LiveExercise => !!e) : [];
  if (p.setNumbers && typeof p.setNumbers === "object") {
    for (const [k, nums] of Object.entries(p.setNumbers as Record<string, unknown>)) {
      if (Array.isArray(nums)) {
        plan.setNumbers[k] = nums.filter((n): n is number => typeof n === "number" && Number.isInteger(n) && n > 0);
      }
    }
  }
  if (p.drafts && typeof p.drafts === "object") {
    for (const [k, bySet] of Object.entries(p.drafts as Record<string, unknown>)) {
      if (!bySet || typeof bySet !== "object") continue;
      const out: Record<string, SetDraft> = {};
      for (const [n, d] of Object.entries(bySet as Record<string, unknown>)) {
        const parsed = parseDraft(d);
        if (parsed) out[n] = parsed;
      }
      plan.drafts[k] = out;
    }
  }
  if (p.rest && typeof p.rest === "object") {
    const r = p.rest as Record<string, unknown>;
    if (typeof r.startedAt === "number" && typeof r.seconds === "number") {
      plan.rest = {
        startedAt: r.startedAt,
        seconds: r.seconds,
        label: typeof r.label === "string" ? r.label : "",
        exKey: typeof r.exKey === "string" ? r.exKey : null,
        setNumber: typeof r.setNumber === "number" ? r.setNumber : null,
        kind: r.kind === "pause" ? "pause" : "set",
      };
    }
  }
  return plan;
}

/** La plus récente des deux versions (téléphone ou serveur). */
export function newestPlan(a: LivePlan | null, b: LivePlan | null): LivePlan | null {
  if (!a) return b;
  if (!b) return a;
  return b.updatedAt > a.updatedAt ? b : a;
}

export function livePlanKey(sessionId: string): string {
  return `ep-live-session-${sessionId}`;
}

export function loadLocalPlan(sessionId: string): LivePlan | null {
  try {
    return parsePlan(localStorage.getItem(livePlanKey(sessionId)));
  } catch {
    return null;
  }
}

export function saveLocalPlan(sessionId: string, plan: LivePlan) {
  try {
    localStorage.setItem(livePlanKey(sessionId), JSON.stringify(plan));
  } catch {}
}

export function clearLocalPlan(sessionId: string) {
  try {
    localStorage.removeItem(livePlanKey(sessionId));
  } catch {}
}

/** Au-delà, ce n'est plus un repos mais une séance rouverte le lendemain. */
export const REST_MAX_AGE_MS = 30 * 60 * 1000;

/** « 1:05 » / « 12:40 ». */
export function formatClockSeconds(total: number): string {
  const s = Math.max(0, Math.round(total));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}
