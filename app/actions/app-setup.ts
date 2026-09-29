"use server";

import { revalidatePath } from "next/cache";
import { getUser, getProfile } from "@/utils/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { COACH_QUESTIONS, MEMBER_QUESTIONS, modulesFromAnswers, type SetupQuestion } from "@/lib/app-setup";

// Enregistre le questionnaire "Mon appli". Les modules sont recalculés côté
// serveur à partir des réponses (jamais reçus tels quels du navigateur), et
// seules les réponses aux questions connues sont gardées.
export async function saveAppSetupAction(answers: Record<string, unknown>): Promise<{ error?: string }> {
  const user = await getUser();
  if (!user) return { error: "Non authentifié." };
  const profile = await getProfile(user.id);
  const questions: SetupQuestion[] = profile?.role === "coach" ? [...COACH_QUESTIONS, ...MEMBER_QUESTIONS] : MEMBER_QUESTIONS;

  const clean: Record<string, unknown> = {};
  for (const q of questions) {
    const raw = answers[q.key];
    const allowed = new Set(q.options.map((o) => o.value));
    if (q.multi && Array.isArray(raw)) clean[q.key] = (raw as unknown[]).filter((v): v is string => typeof v === "string" && allowed.has(v));
    else if (!q.multi && typeof raw === "string" && allowed.has(raw)) clean[q.key] = raw;
  }
  const modules = modulesFromAnswers(questions, clean);
  const now = new Date().toISOString();
  const admin = createAdminClient();
  const { error } = await admin
    .from("user_app_setup")
    .upsert({ user_id: user.id, answers: clean, modules, completed_at: now, updated_at: now }, { onConflict: "user_id" });
  if (error) {
    console.error("saveAppSetupAction error:", error);
    return { error: "Enregistrement impossible, réessaie." };
  }
  revalidatePath("/dashboard", "layout");
  return {};
}
