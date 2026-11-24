"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase-admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { cleanPrepAnswers, isPrepToken } from "@/lib/audit-prep";

async function callerIp(): Promise<string> {
  try {
    const h = await headers();
    return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim() || "inconnu";
  } catch {
    return "inconnu";
  }
}

/** Enregistre la préparation de l'audit (lien privé, sans compte). */
export async function saveAuditPrep(token: string, raw: Record<string, unknown>): Promise<{ ok: true } | { error: string }> {
  if (!isPrepToken(token)) return { error: "Lien invalide." };
  const limit = await checkRateLimit(`audit-prep:${await callerIp()}`, 10, 3600);
  if (!limit.allowed) return { error: "Trop d'envois, réessaie dans un moment." };
  const answers = cleanPrepAnswers(raw ?? {});
  if (!Object.keys(answers).length) return { error: "Réponds au moins à une question." };
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("prospect_bookings")
    .update({ prep_answers: answers, prep_at: new Date().toISOString() })
    .eq("prep_token", token)
    .eq("status", "active")
    .select("event_uri");
  if (error) return { error: "Enregistrement impossible, réessaie." };
  if (!data?.length) return { error: "Ce rendez-vous n'existe plus ou a été annulé." };
  return { ok: true };
}
