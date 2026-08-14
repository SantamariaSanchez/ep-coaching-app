// ── Generic CSV import for workout-history exports (Hevy, Strong) ────────────
// Both apps let users export their full history as CSV before switching apps.
// This parses either format into a common shape so it can be replayed into
// our sessions/session_sets tables without losing the client's history.

import { todayInParis } from "@/lib/dates";

export interface ParsedSet {
  exerciseName: string;
  weightKg: number | null;
  reps: number | null;
  note: string | null;
}

export interface ParsedSession {
  dayLabel: string;
  date: string; // YYYY-MM-DD
  durationMinutes: number | null;
  sets: ParsedSet[];
}

export type ParseResult =
  | { source: "hevy" | "strong"; sessions: ParsedSession[] }
  | { error: string };

// ── Low-level CSV tokenizer (handles quoted fields with commas/newlines) ─────

// Excel re-saves (especially with a European locale) commonly turn a comma
// export into a semicolon-delimited file — detect whichever appears more
// often on the header line rather than assuming comma.
function detectDelimiter(firstLine: string): "," | ";" {
  const commas = (firstLine.match(/,/g) ?? []).length;
  const semicolons = (firstLine.match(/;/g) ?? []).length;
  return semicolons > commas ? ";" : ",";
}

function parseCsvRows(text: string, delimiter: "," | ";" = ","): string[][] {
  const t = text.replace(/^﻿/, ""); // strip BOM
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (inQuotes) {
      if (c === '"') {
        if (t[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') {
      inQuotes = true;
    } else if (c === delimiter) {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c === "\r") {
      // skip — \n follows
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((f) => f.trim() !== ""));
}

function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function parseCsvObjects(text: string): { rows: Record<string, string>[]; headers: string[] } {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = detectDelimiter(firstLine);
  const rows = parseCsvRows(text, delimiter);
  if (rows.length === 0) return { rows: [], headers: [] };
  const headers = rows[0].map(normalizeHeader);
  const objects = rows.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = (r[idx] ?? "").trim();
    });
    return obj;
  });
  return { rows: objects, headers };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toFloat(v: string | undefined): number | null {
  if (!v) return null;
  const n = parseFloat(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function toInt(v: string | undefined): number | null {
  if (!v) return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

function parseDateFlexible(v: string | undefined): string | null {
  if (!v) return null;
  const cleaned = v.replace(",", "");
  const d = new Date(cleaned);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split("T")[0];
}

function minutesBetween(start: string | undefined, end: string | undefined): number | null {
  if (!start || !end) return null;
  const s = new Date(start.replace(",", ""));
  const e = new Date(end.replace(",", ""));
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return null;
  const mins = Math.round((e.getTime() - s.getTime()) / 60000);
  return mins > 0 ? mins : null;
}

// ── Format-specific mapping ───────────────────────────────────────────────────

function mapHevy(rows: Record<string, string>[]): ParsedSession[] {
  const sessions = new Map<string, ParsedSession>();
  const order: string[] = [];

  for (const row of rows) {
    const key = `${row.title}|${row.start_time}`;
    if (!sessions.has(key)) {
      sessions.set(key, {
        dayLabel: row.title || "Séance importée",
        date: parseDateFlexible(row.start_time) ?? todayInParis(),
        durationMinutes: minutesBetween(row.start_time, row.end_time),
        sets: [],
      });
      order.push(key);
    }
    if (!row.exercise_title) continue;
    const weightKgRaw = toFloat(row.weight_kg);
    const weightLbs = toFloat(row.weight_lbs);
    sessions.get(key)!.sets.push({
      exerciseName: row.exercise_title,
      weightKg: weightKgRaw ?? (weightLbs != null ? Math.round(weightLbs * 0.453592 * 100) / 100 : null),
      reps: toInt(row.reps),
      note: row.exercise_notes || (row.rpe ? `RPE ${row.rpe}` : null),
    });
  }

  return order.map((k) => sessions.get(k)!).filter((s) => s.sets.length > 0);
}

function mapStrong(rows: Record<string, string>[]): ParsedSession[] {
  const sessions = new Map<string, ParsedSession>();
  const order: string[] = [];

  for (const row of rows) {
    const key = `${row.workout_name}|${row.date}`;
    if (!sessions.has(key)) {
      sessions.set(key, {
        dayLabel: row.workout_name || "Séance importée",
        date: parseDateFlexible(row.date) ?? todayInParis(),
        durationMinutes: (() => {
          const secs = toInt(row.duration ?? row.workout_duration);
          return secs ? Math.round(secs / 60) : null;
        })(),
        sets: [],
      });
      order.push(key);
    }
    if (!row.exercise_name) continue;
    const weight = toFloat(row.weight) ?? toFloat(row.weight_kg);
    const unit = row.weight_kg ? "kg" : (row.weight_unit || "kg").toLowerCase();
    const weightKg = weight == null ? null : unit.startsWith("lb") ? weight * 0.453592 : weight;
    sessions.get(key)!.sets.push({
      exerciseName: row.exercise_name,
      weightKg: weightKg != null ? Math.round(weightKg * 100) / 100 : null,
      reps: toInt(row.reps),
      note: row.notes || (row.rpe ? `RPE ${row.rpe}` : null),
    });
  }

  return order.map((k) => sessions.get(k)!).filter((s) => s.sets.length > 0);
}

// ── Entry point ───────────────────────────────────────────────────────────────

// ── Derive a Program template from imported history ─────────────────────────
// Hevy/Strong only export *history* (what was actually done), not a program
// definition — but a client switching apps still wants to see "their split"
// in the Programme tab, not an empty page. We rebuild one day per distinct
// day_label, using the most recent session of that label as the template.

function mode(values: number[]): number | null {
  if (values.length === 0) return null;
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best = values[0];
  let bestCount = 0;
  for (const [v, c] of counts) {
    if (c > bestCount) { best = v; bestCount = c; }
  }
  return best;
}

export interface DerivedExercise {
  name: string;
  sets: number;
  reps: string | null;
}

export interface DerivedDay {
  day_label: string;
  exercises: DerivedExercise[];
}

export function deriveProgramDaysFromSessions(sessions: ParsedSession[]): DerivedDay[] {
  const byLabel = new Map<string, ParsedSession[]>();
  const firstSeen = new Map<string, string>();
  for (const s of sessions) {
    if (!byLabel.has(s.dayLabel)) {
      byLabel.set(s.dayLabel, []);
      firstSeen.set(s.dayLabel, s.date);
    } else if (s.date < firstSeen.get(s.dayLabel)!) {
      firstSeen.set(s.dayLabel, s.date);
    }
    byLabel.get(s.dayLabel)!.push(s);
  }

  const orderedLabels = [...byLabel.keys()].sort((a, b) =>
    firstSeen.get(a)!.localeCompare(firstSeen.get(b)!)
  );

  return orderedLabels.map((label) => {
    const sessionsForLabel = byLabel.get(label)!;
    // Most recent occurrence of this day = best template of "what it looks like now".
    const template = sessionsForLabel.reduce((latest, s) => (s.date > latest.date ? s : latest));

    const order: string[] = [];
    const repsByExercise = new Map<string, number[]>();
    const setCountByExercise = new Map<string, number>();
    for (const set of template.sets) {
      if (!setCountByExercise.has(set.exerciseName)) {
        order.push(set.exerciseName);
        repsByExercise.set(set.exerciseName, []);
      }
      setCountByExercise.set(set.exerciseName, (setCountByExercise.get(set.exerciseName) ?? 0) + 1);
      if (set.reps != null) repsByExercise.get(set.exerciseName)!.push(set.reps);
    }

    const exercises: DerivedExercise[] = order.map((name) => {
      const repsMode = mode(repsByExercise.get(name) ?? []);
      return {
        name,
        sets: setCountByExercise.get(name) ?? 1,
        reps: repsMode != null ? String(repsMode) : null,
      };
    });

    return { day_label: label, exercises };
  });
}

export function parseWorkoutCsv(text: string): ParseResult {
  const { rows, headers } = parseCsvObjects(text);
  if (rows.length === 0) {
    return { error: "Le fichier CSV est vide ou illisible." };
  }

  // Hevy's export always has exercise_title; Strong's always has
  // exercise_name. Some Strong exports use "weight_kg" instead of "weight"
  // depending on the app's unit setting, so don't require one specific
  // weight column name — any exercise+weight pairing is enough to route it.
  const hasWeightColumn = headers.some((h) => h === "weight" || h === "weight_kg" || h === "weight_lbs");

  if (headers.includes("exercise_title") && hasWeightColumn) {
    return { source: "hevy", sessions: mapHevy(rows) };
  }
  if (headers.includes("exercise_name") && hasWeightColumn) {
    return { source: "strong", sessions: mapStrong(rows) };
  }

  return {
    error:
      `Format de fichier non reconnu (colonnes détectées : ${headers.slice(0, 8).join(", ") || "aucune"}). ` +
      "Seuls les exports CSV de Hevy et Strong sont supportés pour le moment.",
  };
}
