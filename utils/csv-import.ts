// ── Generic CSV import for workout-history exports (Hevy, Strong) ────────────
// Both apps let users export their full history as CSV before switching apps.
// This parses either format into a common shape so it can be replayed into
// our sessions/session_sets tables without losing the client's history.

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

function parseCsvRows(text: string): string[][] {
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
    } else if (c === ",") {
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

function parseCsvObjects(text: string): Record<string, string>[] {
  const rows = parseCsvRows(text);
  if (rows.length === 0) return [];
  const headers = rows[0].map(normalizeHeader);
  return rows.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = (r[idx] ?? "").trim();
    });
    return obj;
  });
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
        date: parseDateFlexible(row.start_time) ?? new Date().toISOString().split("T")[0],
        durationMinutes: minutesBetween(row.start_time, row.end_time),
        sets: [],
      });
      order.push(key);
    }
    if (!row.exercise_title) continue;
    sessions.get(key)!.sets.push({
      exerciseName: row.exercise_title,
      weightKg: toFloat(row.weight_kg),
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
        date: parseDateFlexible(row.date) ?? new Date().toISOString().split("T")[0],
        durationMinutes: (() => {
          const secs = toInt(row.duration ?? row.workout_duration);
          return secs ? Math.round(secs / 60) : null;
        })(),
        sets: [],
      });
      order.push(key);
    }
    if (!row.exercise_name) continue;
    const weight = toFloat(row.weight);
    const unit = (row.weight_unit || "kg").toLowerCase();
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

export function parseWorkoutCsv(text: string): ParseResult {
  const rows = parseCsvObjects(text);
  if (rows.length === 0) {
    return { error: "Le fichier CSV est vide ou illisible." };
  }

  const headers = Object.keys(rows[0]);

  if (headers.includes("exercise_title") && headers.includes("weight_kg")) {
    return { source: "hevy", sessions: mapHevy(rows) };
  }
  if (headers.includes("exercise_name") && headers.includes("weight")) {
    return { source: "strong", sessions: mapStrong(rows) };
  }

  return {
    error:
      "Format de fichier non reconnu. Seuls les exports CSV de Hevy et Strong sont supportés pour le moment.",
  };
}
