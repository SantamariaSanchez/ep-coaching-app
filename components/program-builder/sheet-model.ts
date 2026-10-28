// Modèle de l'espace de conception façon tableur : une séance = un tableau,
// une ligne = un exercice. Tout est en texte pendant la saisie (comme une
// cellule de tableur), converti en nombres seulement à l'enregistrement.

import type { ProgramWithDays, DayInput, ExerciseInput, TensionFocus } from "@/utils/programs";
import type { ProgramTemplateWithDays } from "@/utils/program-templates";
import { parseRepsInput, type RepsUnit } from "@/lib/program-sheet";
import { splitEffortCell } from "@/lib/training-styles";

export interface SheetRow {
  id: string;
  name: string;
  sets: string;
  reps: string;
  unit: RepsUnit;
  rir: string;
  rest: string; // saisie libre : « 90 », « 1:30 », « 2min », « 2 »
  tempo: string;
  technique: string;
  notes: string;
  superset: string | null; // identifiant de bloc, normalisé en A/B/C à l'enregistrement
  muscle_group: string;
  muscle_subgroup: string;
  is_direct: boolean;
  // Décisions fines (tension, amplitude...) : jamais obligatoires, ouvertes
  // depuis le menu de la ligne, conservées telles quelles.
  tension_focus: string;
  resistance_notes: string;
  rom_notes: string;
  availability_notes: string;
  discomfort_notes: string;
}

export interface SheetDay {
  id: string;
  label: string;
  weekday: number | null;
  notes: string;
  rows: SheetRow[];
  /** Salle rattachée à la séance : seuls les exercices faisables avec son matériel sont proposés. */
  gym_id?: string | null;
}

export const DEFAULT_ROWS = 8;

export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function emptyRow(prefill?: Partial<SheetRow>): SheetRow {
  return {
    id: uid(),
    name: "",
    sets: prefill?.sets ?? "",
    reps: prefill?.reps ?? "",
    unit: prefill?.unit ?? "reps",
    rir: prefill?.rir ?? "",
    rest: prefill?.rest ?? "",
    tempo: "",
    technique: "",
    notes: "",
    superset: null,
    muscle_group: "",
    muscle_subgroup: "",
    is_direct: true,
    tension_focus: "",
    resistance_notes: "",
    rom_notes: "",
    availability_notes: "",
    discomfort_notes: "",
  };
}

export function emptyDay(label: string, rows = DEFAULT_ROWS, weekday: number | null = null): SheetDay {
  return { id: uid(), label, weekday, notes: "", rows: Array.from({ length: rows }, () => emptyRow()) };
}

export function isRowFilled(r: SheetRow): boolean {
  return r.name.trim() !== "";
}

// ── Repos ──────────────────────────────────────────────────────────────────
// « 90 » = 90 s, « 1:30 » ou « 1'30 » = 90 s, « 2min » = 120 s. Un nombre seul
// jusqu'à 10 est lu en minutes : personne ne programme 3 secondes de repos.
export function parseRest(raw: string): number | null {
  const v = raw.trim().toLowerCase().replace(",", ".");
  if (!v) return null;
  const mmss = v.match(/^(\d{1,2})\s*[:']\s*(\d{1,2})$/);
  if (mmss) return parseInt(mmss[1]) * 60 + parseInt(mmss[2]);
  const min = v.match(/^(\d+(?:\.\d+)?)\s*(?:min|mn|m|')$/);
  if (min) return Math.round(parseFloat(min[1]) * 60);
  const sec = v.match(/^(\d+)\s*(?:s|sec|secondes?|")?$/);
  if (sec) {
    const n = parseInt(sec[1]);
    if (/s|"/.test(v)) return n;
    return n <= 10 ? n * 60 : n;
  }
  return null;
}

export function formatRestCell(seconds: number | null | undefined): string {
  if (seconds == null || seconds <= 0) return "";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Normalise la saisie de repos à la sortie de la cellule (« 2 » devient « 2:00 »). */
export function normalizeRestInput(raw: string): string {
  const sec = parseRest(raw);
  return sec == null ? raw : formatRestCell(sec);
}

/** Normalise la saisie de reps : « 30s » passe l'unité en secondes, etc. */
export function normalizeRepsInput(raw: string, unit: RepsUnit): { reps: string; unit: RepsUnit } {
  const parsed = parseRepsInput(raw);
  if (!parsed) return { reps: raw.trim().replace(/\s*-\s*/g, "-"), unit };
  return { reps: parsed.reps, unit: parsed.unit };
}

// ── Supersets ──────────────────────────────────────────────────────────────
// Un bloc = une suite de lignes voisines qui partagent le même identifiant.
// Après chaque modification : un identifiant isolé (une seule ligne) disparaît.
export function normalizeSupersets(rows: SheetRow[]): SheetRow[] {
  const out = rows.map((r) => ({ ...r }));
  let i = 0;
  while (i < out.length) {
    const g = out[i].superset;
    if (!g) {
      i++;
      continue;
    }
    let j = i;
    while (j + 1 < out.length && out[j + 1].superset === g) j++;
    if (j === i) out[i].superset = null;
    i = j + 1;
  }
  // Un même identifiant qui réapparaît plus loin (après un déplacement de
  // ligne) devient un bloc distinct.
  const seen = new Set<string>();
  let k = 0;
  while (k < out.length) {
    const g = out[k].superset;
    if (!g) {
      k++;
      continue;
    }
    let end = k;
    while (end + 1 < out.length && out[end + 1].superset === g) end++;
    if (seen.has(g)) {
      const fresh = uid();
      for (let x = k; x <= end; x++) out[x].superset = fresh;
    } else seen.add(g);
    k = end + 1;
  }
  return out;
}

/** Lie la ligne `index` à la suivante (ou délie si elles sont déjà liées). */
export function toggleLinkWithNext(rows: SheetRow[], index: number): SheetRow[] {
  if (index < 0 || index >= rows.length - 1) return rows;
  const out = rows.map((r) => ({ ...r }));
  const a = out[index];
  const b = out[index + 1];
  if (a.superset && a.superset === b.superset) {
    // Coupe le bloc entre index et index+1.
    const g = a.superset;
    const fresh = uid();
    for (let k = index + 1; k < out.length && out[k].superset === g; k++) out[k].superset = fresh;
    return normalizeSupersets(out);
  }
  const g = a.superset ?? b.superset ?? uid();
  const oldB = b.superset;
  a.superset = g;
  if (oldB && oldB !== g) {
    for (let k = index + 1; k < out.length && out[k].superset === oldB; k++) out[k].superset = g;
  } else b.superset = g;
  return normalizeSupersets(out);
}

// ── Conversions ────────────────────────────────────────────────────────────

function rowFromExercise(id: string, e: {
  name: string;
  sets: number | null;
  reps: string | null;
  rir: number | null;
  rest_seconds: number | null;
  notes: string | null;
  muscle_group: string | null;
  muscle_subgroup: string | null;
  is_direct: boolean;
  superset_group?: string | null;
  reps_unit?: string | null;
  technique?: string | null;
  tempo?: string | null;
  intensity?: string | null;
  tension_focus?: string | null;
  resistance_notes?: string | null;
  rom_notes?: string | null;
  availability_notes?: string | null;
  discomfort_notes?: string | null;
}, dayKey: string): SheetRow {
  const unit = (e.reps_unit === "sec" || e.reps_unit === "m" ? e.reps_unit : "reps") as RepsUnit;
  return {
    id,
    name: e.name,
    sets: e.sets != null ? String(e.sets) : "",
    reps: e.reps ?? "",
    unit,
    rir: e.intensity ? e.intensity : e.rir != null ? String(e.rir) : "",
    rest: formatRestCell(e.rest_seconds),
    tempo: e.tempo ?? "",
    technique: e.technique ?? "",
    notes: e.notes ?? "",
    // Préfixé par la séance : la lettre « A » d'une séance n'est pas celle d'une autre.
    superset: e.superset_group ? `${dayKey}-${e.superset_group}` : null,
    muscle_group: e.muscle_group ?? "",
    muscle_subgroup: e.muscle_subgroup ?? "",
    is_direct: e.is_direct !== false,
    tension_focus: e.tension_focus ?? "",
    resistance_notes: e.resistance_notes ?? "",
    rom_notes: e.rom_notes ?? "",
    availability_notes: e.availability_notes ?? "",
    discomfort_notes: e.discomfort_notes ?? "",
  };
}

/** Complète une séance avec des lignes vides pour garder la grille de 8 cases. */
function padRows(rows: SheetRow[], key: string): SheetRow[] {
  const missing = Math.max(0, DEFAULT_ROWS - rows.length);
  // Toujours au moins une ligne vide en bas pour continuer à taper.
  const extra = Math.max(missing, rows.length >= DEFAULT_ROWS ? 1 : 0);
  return [...rows, ...Array.from({ length: extra }, (_, k) => ({ ...emptyRow(), id: `${key}e${k}` }))];
}

// Identifiants déterministes (pas aléatoires) pour l'état initial : la page
// est rendue côté serveur puis côté client, des identifiants différents des
// deux côtés laisseraient des attributs périmés dans le HTML (navigation
// clavier cassée). Les séances ajoutées ensuite, côté client, utilisent uid().
export function daysFromProgram(program: ProgramWithDays | null, prefix = "p"): SheetDay[] {
  if (!program) return [];
  return program.days.map((d, i) => {
    const key = `${prefix}${i}`;
    return {
      id: key,
      label: d.day_label,
      weekday: d.weekday ?? null,
      gym_id: d.gym_id ?? null,
      notes: d.notes ?? "",
      rows: padRows(normalizeSupersets(d.exercises.map((e, j) => rowFromExercise(`${key}r${j}`, e, key))), key),
    };
  });
}

export function daysFromTemplate(template: ProgramTemplateWithDays): SheetDay[] {
  const prefix = uid();
  return template.days.map((d, i) => {
    const key = `${prefix}${i}`;
    return {
      id: key,
      label: d.day_label,
      weekday: null,
      notes: d.notes ?? "",
      rows: padRows(normalizeSupersets(d.exercises.map((e, j) => rowFromExercise(`${key}r${j}`, e, key))), key),
    };
  });
}

/** Convertit la grille en DayInput[] (lignes vides ignorées, supersets en A/B/C). */
export function daysToInput(days: SheetDay[]): DayInput[] {
  return days.map((d, i) => {
    const filled = normalizeSupersets(d.rows.filter(isRowFilled));
    const letters = new Map<string, string>();
    for (const r of filled) {
      if (r.superset && !letters.has(r.superset)) letters.set(r.superset, String.fromCharCode(65 + letters.size));
    }
    const exercises: ExerciseInput[] = filled.map((r) => {
      const sets = parseInt(r.sets, 10);
      // Case « RIR » : un chiffre = RIR, « @8 » ou « 75 % » = intensité (force).
      const effort = splitEffortCell(r.rir);
      const rir = effort.rir ?? NaN;
      return {
        name: r.name.trim(),
        sets: Number.isFinite(sets) && sets > 0 ? sets : null,
        reps: r.reps.trim() || null,
        rir: Number.isFinite(rir) ? rir : null,
        intensity: effort.intensity,
        rest_seconds: parseRest(r.rest),
        notes: r.notes.trim() || null,
        muscle_group: r.muscle_group || null,
        muscle_subgroup: r.muscle_subgroup || null,
        is_direct: r.is_direct,
        tension_focus: (r.tension_focus || null) as TensionFocus | null,
        resistance_notes: r.resistance_notes.trim() || null,
        rom_notes: r.rom_notes.trim() || null,
        availability_notes: r.availability_notes.trim() || null,
        discomfort_notes: r.discomfort_notes.trim() || null,
        superset_group: r.superset ? letters.get(r.superset) ?? null : null,
        reps_unit: r.unit === "reps" ? null : r.unit,
        technique: r.technique || null,
        tempo: r.tempo.trim() || null,
      };
    });
    return {
      day_label: d.label.trim() || `Séance ${String.fromCharCode(65 + i)}`,
      weekday: d.weekday,
      gym_id: d.gym_id ?? null,
      notes: d.notes.trim() || null,
      exercises,
    };
  });
}

// ── Splits ─────────────────────────────────────────────────────────────────

export const SPLITS: { key: string; label: string; cycle: string[] | null }[] = [
  { key: "Full Body", label: "Full body", cycle: null },
  { key: "Upper/Lower", label: "Haut / Bas", cycle: ["Haut", "Bas"] },
  { key: "PPL", label: "Push Pull Legs", cycle: ["Push", "Pull", "Legs"] },
  { key: "Custom", label: "Libre", cycle: null },
];

export function splitLabels(splitKey: string, count: number): string[] {
  const split = SPLITS.find((s) => s.key === splitKey);
  let labels: string[];
  if (splitKey === "Full Body") labels = Array.from({ length: count }, (_, i) => `Full body ${String.fromCharCode(65 + i)}`);
  else if (split?.cycle) labels = Array.from({ length: count }, (_, i) => split.cycle![i % split.cycle!.length]);
  else labels = Array.from({ length: count }, (_, i) => `Séance ${String.fromCharCode(65 + i)}`);
  const total: Record<string, number> = {};
  for (const l of labels) total[l] = (total[l] ?? 0) + 1;
  const seen: Record<string, number> = {};
  return labels.map((l) => {
    seen[l] = (seen[l] ?? 0) + 1;
    return total[l] > 1 ? `${l} ${seen[l]}` : l;
  });
}

/** Le libellé a-t-il été généré par un split (donc remplaçable sans perte) ? */
export function isGeneratedLabel(label: string): boolean {
  return /^(full body [a-g]|haut|bas|push|pull|legs|upper|lower|séance [a-g])( \d)?$/i.test(label.trim());
}

// ── Estimations ────────────────────────────────────────────────────────────

/** Durée estimée d'une séance en minutes (travail ~40 s par série + repos). */
export function estimateMinutes(day: SheetDay): number {
  let total = 0;
  const rows = day.rows.filter(isRowFilled);
  rows.forEach((r, i) => {
    const sets = parseInt(r.sets, 10) || 0;
    if (!sets) return;
    const work = r.unit === "sec" ? Math.max(20, parseInt(r.reps, 10) || 40) : 40;
    const inSupersetNotLast = r.superset && rows[i + 1]?.superset === r.superset;
    const rest = inSupersetNotLast ? 10 : parseRest(r.rest) ?? 90;
    total += sets * (work + rest);
  });
  // + transitions entre exercices
  total += rows.length * 60;
  return Math.round(total / 60);
}

export function countSets(day: SheetDay): number {
  return day.rows.filter(isRowFilled).reduce((acc, r) => acc + (parseInt(r.sets, 10) || 0), 0);
}

// ── Collage depuis Google Sheets / Excel ────────────────────────────────────
// Colonnes attendues dans l'ordre du tableau : exercice, séries, reps, RIR,
// repos, notes. Les colonnes manquantes restent vides.
export function rowsFromPaste(text: string): SheetRow[] | null {
  const lines = text.replace(/\r/g, "").split("\n").map((l) => l.trimEnd()).filter((l) => l.trim() !== "");
  if (lines.length < 2 && !text.includes("\t")) return null;
  return lines.map((line) => {
    const cells = line.split("\t").map((c) => c.trim());
    const row = emptyRow();
    row.name = cells[0] ?? "";
    // « 4x8-10 » dans une seule cellule : séries et reps séparées.
    const combo = (cells[1] ?? "").match(/^(\d+)\s*[x×]\s*(.+)$/i);
    if (combo) {
      row.sets = combo[1];
      const r = normalizeRepsInput(combo[2], "reps");
      row.reps = r.reps;
      row.unit = r.unit;
      row.rir = cells[2] ?? "";
      row.rest = cells[3] ? normalizeRestInput(cells[3]) : "";
      row.notes = cells.slice(4).join(" ").trim();
    } else {
      row.sets = cells[1] ?? "";
      const r = normalizeRepsInput(cells[2] ?? "", "reps");
      row.reps = r.reps;
      row.unit = r.unit;
      row.rir = cells[3] ?? "";
      row.rest = cells[4] ? normalizeRestInput(cells[4]) : "";
      row.notes = cells.slice(5).join(" ").trim();
    }
    return row;
  });
}
