import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

// Synchro automatique des pas (2026-10-14) : un Raccourci iOS (Santé) ou une
// appli d'automatisation Android (Health Connect) envoie le total du jour sur
// POST /api/steps/ingest avec une clé personnelle. Clé dédiée (préfixe
// eps_), différente des clés du connecteur Claude (epk_, lib/api-tokens.ts) :
// elle ne permet QUE d'écrire ses propres pas, rien d'autre.

export const STEPS_TOKEN_PREFIX = "eps_";
const TOKEN_RE = /^eps_[0-9a-f]{64}$/;

/** Plafond aligné sur la contrainte step_logs_steps_actual_range_chk. */
export const MAX_STEPS = 200000;
/** Jours passés acceptés (rattrapage après quelques jours sans synchro). */
export const INGEST_BACKFILL_DAYS = 14;

export type StepsSource = "raccourci" | "android" | "manuel" | "oura" | "podometre" | "bilan";

export function newStepsToken(): string {
  return `${STEPS_TOKEN_PREFIX}${randomBytes(32).toString("hex")}`;
}

export function hashStepsToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function isWellFormedStepsToken(token: string | null | undefined): token is string {
  return !!token && TOKEN_RE.test(token);
}

/** Comparaison en temps constant de deux empreintes hexadécimales. */
export function sameHash(a: string, b: string): boolean {
  const ba = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  if (ba.length !== bb.length || ba.length === 0) return false;
  return timingSafeEqual(ba, bb);
}

/** Quatre derniers caractères, pour reconnaître sa clé sans la montrer. */
export function tokenHint(token: string): string {
  return token.slice(-4);
}

// ── Validation des entrées ─────────────────────────────────────────────

/**
 * Nombre de pas envoyé par un raccourci : un nombre, ou du texte selon la
 * langue du téléphone (« 8 532 », « 8,532 », « 8532.0 », « 8 532 pas »).
 * Renvoie null si ce n'est pas un entier plausible.
 */
export function parseSteps(raw: unknown): number | null {
  let n: number;
  if (typeof raw === "number") {
    n = raw;
  } else if (typeof raw === "string") {
    const s = raw.trim();
    if (s.length === 0 || s.length > 32) return null;
    // Décimale finale (« 8532.0 », « 8532,0 ») : on la retire d'abord.
    const noDecimal = s.replace(/[.,]\d{1,2}(?=\D*$)/, "");
    const digits = noDecimal.replace(/[\s  .,']/g, "").replace(/[^\d-]/g, "");
    if (!/^\d{1,7}$/.test(digits)) return null;
    n = Number(digits);
  } else {
    return null;
  }
  if (!Number.isFinite(n)) return null;
  n = Math.round(n);
  if (n < 0 || n > MAX_STEPS) return null;
  return n;
}

/** Date AAAA-MM-JJ valide, pas dans le futur (un jour de marge de fuseau), pas trop ancienne. */
export function parseIngestDate(raw: unknown, today: string): string | null {
  if (raw == null || raw === "") return today;
  if (typeof raw !== "string") return null;
  const s = raw.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T12:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) return null;
  const t = new Date(`${today}T12:00:00Z`).getTime();
  const diffDays = Math.round((t - d.getTime()) / 86400000);
  if (diffDays < -1 || diffDays > INGEST_BACKFILL_DAYS) return null;
  return s;
}

export function parseSource(raw: unknown): StepsSource {
  if (typeof raw !== "string") return "raccourci";
  const s = raw.trim().toLowerCase();
  if (s.startsWith("android") || s.includes("health connect")) return "android";
  return "raccourci";
}

// ── Écriture tolérante ─────────────────────────────────────────────────

function isMissingColumn(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "PGRST204" || error.code === "42703" || /column .* does not exist|Could not find the '.*' column/i.test(error.message ?? "");
}

/**
 * Écrit le total du jour en gardant la routine déjà cochée. Les colonnes
 * source/synced_at (migration 20261014g_steps_auto_sync) sont facultatives :
 * si elles n'existent pas encore, on réécrit sans elles.
 */
export async function upsertStepTotal(
  admin: SupabaseClient,
  clientId: string,
  logDate: string,
  steps: number,
  source: StepsSource
): Promise<{ error?: string }> {
  const { data: existing } = await admin
    .from("step_logs")
    .select("completed_items")
    .eq("client_id", clientId)
    .eq("log_date", logDate)
    .maybeSingle();
  const base = {
    client_id: clientId,
    log_date: logDate,
    steps_actual: steps,
    completed_items: (existing as { completed_items?: string[] } | null)?.completed_items ?? [],
  };
  const first = await admin
    .from("step_logs")
    .upsert({ ...base, source, synced_at: new Date().toISOString() }, { onConflict: "client_id,log_date" });
  if (!first.error) return {};
  if (isMissingColumn(first.error)) {
    const second = await admin.from("step_logs").upsert(base, { onConflict: "client_id,log_date" });
    if (!second.error) return {};
    console.error("upsertStepTotal error:", second.error);
    return { error: "write_failed" };
  }
  console.error("upsertStepTotal error:", first.error);
  return { error: "write_failed" };
}

export function isMissingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "42P01" || error.code === "PGRST205" || /relation .* does not exist|Could not find the table/i.test(error.message ?? "");
}
