// Force, powerlifting, street workout et calisthenics (2026-10-21) : retour
// direct du fondateur, « une typologie de coach à laquelle on n'a pas
// réfléchi : les coachs en force, en powerlifting, en street workout,
// calisthenics... Un mec qui fait de la calisthenics, l'appli doit être
// adaptée et répondre à ses besoins ».
//
// Ce fichier rassemble le vocabulaire commun à la conception de programme,
// au logbook et aux performances :
//   - la discipline principale d'une personne (bodybuilding, force,
//     calisthenics, haltérophilie, hybride), tirée de ses pratiques ;
//   - le type de charge d'un exercice (barre, poids du corps, lest,
//     assistance) pour afficher les bons champs en séance ;
//   - l'intensité prescrite (%1RM, RPE) et le 1RM estimé ;
//   - les progressions de skills (tuck, advanced tuck, straddle, full...).
//
// Module pur, sans import serveur : il tourne aussi côté client en séance.

// ── Discipline principale ───────────────────────────────────────────────

export type TrainingStyle = "bodybuilding" | "force" | "calisthenics" | "halterophilie" | "hybride";

export const TRAINING_STYLES: { key: TrainingStyle; label: string; hint: string }[] = [
  { key: "bodybuilding", label: "Bodybuilding, musculation", hint: "Volume, RIR, double progression" },
  { key: "force", label: "Force et powerlifting", hint: "%1RM, RPE, 1RM estimé, total" },
  { key: "calisthenics", label: "Street workout, calisthenics", hint: "Poids du corps, lest, skills" },
  { key: "halterophilie", label: "Haltérophilie", hint: "Arraché, épaulé-jeté, total" },
  { key: "hybride", label: "Hybride", hint: "Force et endurance dans la même semaine" },
];

/**
 * Discipline principale à partir des pratiques cochées (questionnaire Mon
 * appli, clé « pratique »). L'ordre des pratiques compte : la première
 * discipline de force rencontrée l'emporte. Rien de coché : bodybuilding,
 * l'appli telle qu'elle a toujours été.
 */
export function trainingStyleFromPractices(practices: readonly string[] | null | undefined): TrainingStyle {
  const list = practices ?? [];
  if (list.includes("hybride")) return "hybride";
  for (const p of list) {
    if (p === "force") return "force";
    if (p === "calisthenics") return "calisthenics";
    if (p === "halterophilie") return "halterophilie";
  }
  return "bodybuilding";
}

/** Disciplines où l'on note l'effort en RPE plutôt qu'en RIR. */
export function prefersRpe(style: TrainingStyle | null | undefined): boolean {
  return style === "force" || style === "halterophilie" || style === "hybride";
}

// ── Type de charge ──────────────────────────────────────────────────────

/**
 * charge     : barre, haltères, machine (charge en kg, comme avant)
 * pdc        : poids du corps seul (reps sans charge)
 * lest       : poids du corps + lest (ceinture, gilet), en kg ajoutés
 * assistance : poids du corps aidé (élastique, machine), en kg retirés
 */
export type LoadMode = "charge" | "pdc" | "lest" | "assistance";

export const BODYWEIGHT_MODES: { key: Exclude<LoadMode, "charge">; label: string; short: string }[] = [
  { key: "pdc", label: "Poids du corps", short: "PDC" },
  { key: "lest", label: "Lesté", short: "Lest" },
  { key: "assistance", label: "Assisté", short: "Assist." },
];

const BODYWEIGHT_NAME =
  /(traction|pull-?up|chin-?up|dips?\b|pompe|push-?up|muscle-?up|front lever|back lever|\bplanche\b(?! \(plank\))|planche lean|handstand|équilibre sur les mains|poirier|appui renversé|hspu|pike|pistol|l-sit|v-sit|human flag|drapeau|skin the cat|dragon flag|nordic|traction australienne|row australien|dead hang|suspension|support aux anneaux|ring|toes to bar|relevés de jambes à la barre)/i;
const NOT_BODYWEIGHT = /(machine|poulie|haltère|barre au front|banc\)|lat pulldown|tirage vertical)/i;

/** Type de charge déduit du nom de l'exercice (le client peut changer en séance). */
export function inferLoadMode(name: string | null | undefined): LoadMode {
  const n = (name ?? "").toLowerCase();
  if (!n) return "charge";
  if (/(assist|élastique|elastique)/.test(n) && BODYWEIGHT_NAME.test(n)) return "assistance";
  if (/lest/.test(n) && BODYWEIGHT_NAME.test(n)) return "lest";
  if (/(gainage|plank|planche latérale)/.test(n)) return "charge";
  if (BODYWEIGHT_NAME.test(n) && !NOT_BODYWEIGHT.test(n)) return "pdc";
  return "charge";
}

export function isBodyweightMode(mode: LoadMode | null | undefined): boolean {
  return mode === "pdc" || mode === "lest" || mode === "assistance";
}

export function isLoadMode(v: unknown): v is LoadMode {
  return v === "charge" || v === "pdc" || v === "lest" || v === "assistance";
}

// ── Intensité : %1RM et RPE ─────────────────────────────────────────────

export type Intensity = { kind: "rpe"; rpe: number } | { kind: "pct"; min: number; max: number };

/** « RPE 8 », « @8 », « @8,5 », « 75% », « 75-80 % ». Null si illisible. */
export function parseIntensity(raw: string | null | undefined): Intensity | null {
  if (!raw) return null;
  const v = raw.trim().toLowerCase().replace(",", ".").replace(/[–—]/g, "-");
  if (!v) return null;
  const pct = v.match(/^(\d{2,3}(?:\.\d)?)\s*(?:-\s*(\d{2,3}(?:\.\d)?))?\s*%/);
  if (pct) {
    const a = parseFloat(pct[1]);
    const b = pct[2] ? parseFloat(pct[2]) : a;
    if (a >= 30 && b <= 110) return { kind: "pct", min: Math.min(a, b), max: Math.max(a, b) };
    return null;
  }
  const rpe = v.match(/^(?:rpe\s*|@\s*)(\d{1,2}(?:\.5)?)$/);
  if (rpe) {
    const n = parseFloat(rpe[1]);
    if (n >= 5 && n <= 10) return { kind: "rpe", rpe: n };
  }
  return null;
}

export function formatIntensity(raw: string | null | undefined): string | null {
  const i = parseIntensity(raw);
  if (!i) return null;
  if (i.kind === "rpe") return `RPE ${String(i.rpe).replace(".", ",")}`;
  return i.min === i.max ? `${i.min} %` : `${i.min}-${i.max} %`;
}

/**
 * Case « RIR / RPE » du tableur de programme : un chiffre seul reste un RIR
 * (comme avant), « @8 », « RPE 8 » ou « 75 % » deviennent une intensité.
 */
export function splitEffortCell(raw: string): { rir: number | null; intensity: string | null } {
  const v = raw.trim();
  if (!v) return { rir: null, intensity: null };
  if (/^\d$/.test(v)) return { rir: parseInt(v, 10), intensity: null };
  const parsed = parseIntensity(v) ?? parseIntensity(`@${v}`);
  if (!parsed) return { rir: null, intensity: null };
  return { rir: null, intensity: formatIntensity(parsed.kind === "rpe" ? `@${parsed.rpe}` : `${parsed.min}-${parsed.max}%`) };
}

export const RPE_CHOICES = [6, 7, 7.5, 8, 8.5, 9, 9.5, 10] as const;

/** RPE 8 = 2 reps en réserve. */
export function rpeToRir(rpe: number): number {
  return Math.max(0, Math.min(5, Math.round(10 - rpe)));
}

/**
 * 1RM estimé (Epley), corrigé par l'effort : une série de 5 à RPE 8 compte
 * comme 7 reps à l'échec. Fiable de 1 à une dizaine de reps.
 */
export function estimateE1rm(weightKg: number | null | undefined, reps: number | null | undefined, rpe?: number | null): number | null {
  if (!weightKg || weightKg <= 0 || !reps || reps <= 0) return null;
  const reserve = rpe != null && rpe >= 5 && rpe <= 10 ? 10 - rpe : 0;
  const total = reps + reserve;
  if (total > 12) return null;
  if (total <= 1) return Math.round(weightKg * 10) / 10;
  return Math.round(weightKg * (1 + total / 30) * 10) / 10;
}

/** Charge pour un pourcentage du 1RM, arrondie au pas de la barre. */
export function loadForPercent(e1rm: number, pct: number, step = 2.5): number {
  return Math.max(step, Math.round((e1rm * pct) / 100 / step) * step);
}

// ── Mouvements de compétition ───────────────────────────────────────────

export type MainLift = "Squat" | "Développé couché" | "Soulevé de terre" | "Arraché" | "Épaulé-jeté";

const LIFT_PATTERNS: [MainLift, RegExp][] = [
  ["Squat", /^(squat barre( \(back squat\))?|back squat|squat de compétition|squat)$/],
  ["Développé couché", /^(développé couché barre|développé couché de compétition|développé couché|bench press)$/],
  ["Soulevé de terre", /^(soulevé de terre|soulevé de terre sumo|soulevé de terre de compétition|deadlift)$/],
  ["Arraché", /^(arraché|arraché depuis le sol( \(full snatch\))?|snatch( \(arraché\))?)$/],
  ["Épaulé-jeté", /^(épaulé-jeté( \(clean & jerk\))?|clean & jerk)$/],
];

/** Mouvement de compétition correspondant au nom d'exercice, sinon null. */
export function mainLiftFor(name: string | null | undefined): MainLift | null {
  const n = (name ?? "").trim().toLowerCase();
  for (const [lift, re] of LIFT_PATTERNS) if (re.test(n)) return lift;
  return null;
}

// ── Progressions de skills ──────────────────────────────────────────────

export interface SkillProgression {
  key: string;
  label: string;
  /** Étapes de la plus facile à la plus dure. */
  steps: string[];
  /** Tenue en secondes (isométrique) ou répétitions (dynamique). */
  unit: "sec" | "reps";
  match: RegExp;
}

export const SKILLS: SkillProgression[] = [
  { key: "front_lever", label: "Front lever", unit: "sec", steps: ["Tuck", "Advanced tuck", "Une jambe", "Straddle", "Full"], match: /front lever/i },
  { key: "back_lever", label: "Back lever", unit: "sec", steps: ["Tuck", "Advanced tuck", "Une jambe", "Straddle", "Full"], match: /back lever/i },
  { key: "planche", label: "Planche", unit: "sec", steps: ["Planche lean", "Tuck", "Advanced tuck", "Straddle", "Full"], match: /(^planche(?! \(plank\)| latérale)|planche lean|planche progression|planche straddle|pseudo planche)/i },
  { key: "handstand", label: "Handstand", unit: "sec", steps: ["Contre le mur, dos", "Contre le mur, ventre", "Libre, quelques secondes", "Libre, 30 s et plus"], match: /(handstand(?! push)|équilibre sur les mains|poirier)/i },
  { key: "hspu", label: "Pompes en équilibre (HSPU)", unit: "reps", steps: ["Pike push-up", "Pike surélevé", "Contre le mur", "Libre"], match: /(hspu|appui renversé|pike push|handstand push)/i },
  { key: "muscle_up", label: "Muscle-up", unit: "reps", steps: ["Négatifs", "Avec élastique", "Kipping", "Strict", "Lesté"], match: /muscle-?up/i },
  { key: "l_sit", label: "L-sit", unit: "sec", steps: ["Tuck", "Une jambe", "Full", "V-sit"], match: /(l-sit|v-sit)/i },
  { key: "pistol", label: "Pistol squat", unit: "reps", steps: ["Assisté", "Sur box", "Complet", "Lesté"], match: /pistol/i },
  { key: "human_flag", label: "Drapeau (human flag)", unit: "sec", steps: ["Tuck", "Straddle", "Full"], match: /(human flag|drapeau)/i },
  { key: "one_arm_pullup", label: "Traction à un bras", unit: "reps", steps: ["Archer", "Assistée une main", "Négatif à un bras", "Complète"], match: /(traction (archer|à un bras)|one arm pull)/i },
];

export const SKILL_BY_KEY: Record<string, SkillProgression> = Object.fromEntries(SKILLS.map((s) => [s.key, s]));

export function skillFor(name: string | null | undefined): SkillProgression | null {
  const n = name ?? "";
  if (!n || /(plank|gainage)/i.test(n)) return null;
  return SKILLS.find((s) => s.match.test(n)) ?? null;
}

/** Rang d'une étape (0 = la plus facile), -1 si inconnue. */
export function stepIndex(skill: SkillProgression, step: string | null | undefined): number {
  if (!step) return -1;
  const s = step.trim().toLowerCase();
  return skill.steps.findIndex((x) => x.toLowerCase() === s);
}

/** Étape déduite du nom d'exercice (« Front lever tuck » → Tuck). */
export function stepFromName(skill: SkillProgression, name: string): string | null {
  const n = name.toLowerCase();
  // Les plus longues d'abord : « advanced tuck » avant « tuck ».
  const sorted = [...skill.steps].sort((a, b) => b.length - a.length);
  return sorted.find((st) => n.includes(st.toLowerCase())) ?? null;
}

// ── Détails « force » d'une série (session_sets.details) ─────────────────

export interface StrengthExtra {
  mode?: Exclude<LoadMode, "charge">;
  /** Assistance (élastique, machine) en kg retirés. */
  assist_kg?: number | null;
  /** Étape de skill (« Advanced tuck »). */
  step?: string | null;
  rpe?: number | null;
  /** Tentative de compétition : barre validée ou ratée. */
  made?: boolean | null;
}

export function hasStrengthExtra(e: StrengthExtra | null | undefined): boolean {
  return !!e && (e.mode != null || e.assist_kg != null || !!e.step || e.rpe != null || e.made != null);
}

// ── Records tirés du logbook ─────────────────────────────────────────────

export interface LogbookSetRow {
  exercise_name: string;
  weight_kg: number | null;
  reps_actual: number | null;
  details?: unknown;
}

export interface LogbookRecords {
  lifts: { lift: MainLift; e1rm: number }[];
  /** Squat + développé couché + soulevé de terre, quand les trois existent. */
  total: number | null;
  skills: { key: string; label: string; step: string; perf: number | null; unit: "sec" | "reps" }[];
  maxReps: { name: string; reps: number }[];
}

function detailNum(d: unknown, key: string): number | null {
  if (!d || typeof d !== "object") return null;
  const v = (d as Record<string, unknown>)[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
function detailStr(d: unknown, key: string): string | null {
  if (!d || typeof d !== "object") return null;
  const v = (d as Record<string, unknown>)[key];
  return typeof v === "string" && v ? v : null;
}

/** e1RM des mouvements de compétition, meilleures étapes de skills, max de reps au poids du corps. */
export function logbookRecords(rows: LogbookSetRow[]): LogbookRecords {
  const lifts = new Map<MainLift, number>();
  const skills = new Map<string, { rank: number; perf: number; step: string; label: string; unit: "sec" | "reps" }>();
  const maxReps = new Map<string, number>();
  for (const r of rows) {
    const reps = r.reps_actual;
    if (!reps || reps <= 0) continue;
    const lift = mainLiftFor(r.exercise_name);
    if (lift && r.weight_kg) {
      const e = estimateE1rm(r.weight_kg, reps, detailNum(r.details, "rpe"));
      if (e != null && e > (lifts.get(lift) ?? 0)) lifts.set(lift, e);
    }
    const skill = skillFor(r.exercise_name);
    if (skill) {
      const step = detailStr(r.details, "step") ?? stepFromName(skill, r.exercise_name);
      const rank = step ? stepIndex(skill, step) : -1;
      if (rank >= 0) {
        const cur = skills.get(skill.key);
        if (!cur || rank > cur.rank || (rank === cur.rank && reps > cur.perf)) skills.set(skill.key, { rank, perf: reps, step: skill.steps[rank], label: skill.label, unit: skill.unit });
      }
      continue;
    }
    const mode = detailStr(r.details, "mode") ?? inferLoadMode(r.exercise_name);
    if ((mode === "pdc" || mode === "lest") && !r.weight_kg && !lift) {
      const key = r.exercise_name;
      if (reps > (maxReps.get(key) ?? 0)) maxReps.set(key, reps);
    }
  }
  const order: MainLift[] = ["Squat", "Développé couché", "Soulevé de terre", "Arraché", "Épaulé-jeté"];
  const liftList = order.filter((l) => lifts.has(l)).map((lift) => ({ lift, e1rm: lifts.get(lift) as number }));
  const sbd = (["Squat", "Développé couché", "Soulevé de terre"] as MainLift[]).map((l) => lifts.get(l));
  return {
    lifts: liftList,
    total: sbd.every((v) => v != null) ? Math.round((sbd as number[]).reduce((a, b) => a + b, 0)) : null,
    skills: [...skills.entries()].map(([key, v]) => ({ key, label: v.label, step: v.step, perf: v.perf, unit: v.unit })),
    maxReps: [...maxReps.entries()].map(([name, reps]) => ({ name, reps })).sort((a, b) => b.reps - a.reps).slice(0, 6),
  };
}
