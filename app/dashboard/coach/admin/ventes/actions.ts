"use server";

import { revalidatePath } from "next/cache";
import { requireCoach } from "@/lib/auth-guards";
import { createServerSupabase } from "@/lib/supabase-server";
import { checkRateLimit, PRESETS } from "@/lib/rate-limit";
import { todayInParis } from "@/lib/dates";
import { SALES_CALL_KIND_LABEL, type SalesCallKind } from "@/lib/sales-call-kinds";
import { createAdminClient } from "@/lib/supabase-admin";

const PATH = "/dashboard/coach/admin/ventes";

export async function addSalesCall(input: {
  leadName: string;
  callDate: string; // "YYYY-MM-DD"
}): Promise<{ error?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  const limited = await checkRateLimit(`sales-call-create:${guard.userId}`, PRESETS.write.limit, PRESETS.write.windowSeconds);
  if (!limited.allowed) return { error: "Trop de tentatives, réessaie dans un instant." };

  const leadName = input.leadName.trim();
  if (!leadName) return { error: "Le nom du lead est requis." };

  const supabase = await createServerSupabase();
  const { error } = await supabase.from("sales_calls").insert({
    coach_id: guard.userId,
    lead_name: leadName,
    // MASTERCLASS.md Axe L : todayInParis(), pas new Date().toISOString().
    call_date: input.callDate || todayInParis(),
  });
  if (error) return { error: "Erreur lors de l'enregistrement." };

  revalidatePath(PATH);
  return {};
}

// Un seul point d'entrée pour les 3 mises à jour ponctuelles (show up,
// closing, CA) plutôt que 3 actions quasi identiques : la table se met à
// jour ligne par ligne au fil des appels, jamais en masse.
export async function updateSalesCall(
  id: string,
  patch: Partial<{
    show_up: boolean | null;
    closed: boolean | null;
    revenue_amount: number | null;
    notes: string;
    call_kind: SalesCallKind;
    recording_url: string | null;
    recording_consent: boolean | null;
    followup_url: string | null;
    prospect_questions: string | null;
  }>
): Promise<{ error?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  const clean = { ...patch };
  // Liens d'enregistrement et de retour d'appel : https uniquement.
  for (const key of ["recording_url", "followup_url"] as const) {
    const v = clean[key];
    if (typeof v === "string" && v.trim()) {
      if (!/^https:\/\/[^\s]+$/i.test(v.trim()) || v.length > 500) return { error: "Le lien doit commencer par https://." };
      clean[key] = v.trim();
    } else if (key in clean) {
      clean[key] = null;
    }
  }
  if (clean.call_kind && !(clean.call_kind in SALES_CALL_KIND_LABEL)) return { error: "Type d'appel inconnu." };
  if (typeof clean.prospect_questions === "string") clean.prospect_questions = clean.prospect_questions.slice(0, 4000) || null;
  if (typeof clean.notes === "string") clean.notes = clean.notes.slice(0, 4000);

  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("sales_calls")
    .update({ ...clean, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("coach_id", guard.userId); // RLS couvre déjà ça, ceinture et bretelles

  if (error) return { error: "Erreur lors de la mise à jour." };

  revalidatePath(PATH);
  return {};
}

export async function deleteSalesCall(id: string): Promise<{ error?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  const supabase = await createServerSupabase();
  const { error } = await supabase.from("sales_calls").delete().eq("id", id).eq("coach_id", guard.userId);
  if (error) return { error: "Erreur lors de la suppression." };

  revalidatePath(PATH);
  return {};
}

// Chaque question posée par une personne en appel est un contenu qu'on n'a
// pas encore fait (Mastermind, vente) : une ligne par question, envoyée au
// Studio de contenu comme idée « général », jamais en doublon.
export async function sendProspectQuestionsToStudio(id: string): Promise<{ error?: string; added?: number }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  const supabase = await createServerSupabase();
  const { data: call } = await supabase
    .from("sales_calls")
    .select("prospect_questions, lead_name")
    .eq("id", id)
    .eq("coach_id", guard.userId)
    .maybeSingle();
  const raw = (call?.prospect_questions as string | null) ?? "";
  const questions = raw.split(/\n+/).map((q) => q.trim().replace(/^[-*\d.)\s]+/, "")).filter((q) => q.length >= 8).slice(0, 20);
  if (questions.length === 0) return { error: "Aucune question à envoyer (une par ligne)." };

  const admin = createAdminClient();
  const { data: existing } = await admin.from("content_ideas").select("title").eq("coach_id", guard.userId).in("title", questions);
  const known = new Set(((existing as { title: string }[] | null) ?? []).map((r) => r.title));
  const rows = questions
    .filter((q) => !known.has(q))
    .map((title) => ({
      coach_id: guard.userId,
      platform: "general",
      title: title.slice(0, 200),
      notes: "Question posée en appel de vente.",
      status: "idee",
      source: "manuel",
    }));
  if (rows.length === 0) return { added: 0 };
  const { error } = await admin.from("content_ideas").insert(rows);
  if (error) return { error: "Erreur lors de l'envoi au Studio." };

  revalidatePath("/dashboard/coach/studio");
  return { added: rows.length };
}
