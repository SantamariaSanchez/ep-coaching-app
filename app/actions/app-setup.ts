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

// Change seulement la façon de travailler d'un coach (page Mon équipe) :
// les autres réponses sont gardées, les modules recalculés, et un
// questionnaire pas encore terminé le reste (la bannière reste proposée).
export async function updateCareerModeAction(mode: string): Promise<{ error?: string }> {
  const user = await getUser();
  if (!user) return { error: "Non authentifié." };
  const profile = await getProfile(user.id);
  if (profile?.role !== "coach") return { error: "Réservé aux coachs." };
  const careerQ = COACH_QUESTIONS.find((q) => q.key === "career_mode");
  if (!careerQ?.options.some((o) => o.value === mode)) return { error: "Choix invalide." };

  const admin = createAdminClient();
  const { data: row } = await admin.from("user_app_setup").select("answers, completed_at").eq("user_id", user.id).maybeSingle();
  const answers = { ...((row?.answers as Record<string, unknown>) ?? {}), career_mode: mode };
  const modules = modulesFromAnswers([...COACH_QUESTIONS, ...MEMBER_QUESTIONS], answers);
  const { error } = await admin
    .from("user_app_setup")
    .upsert({ user_id: user.id, answers, modules, completed_at: row?.completed_at ?? null, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) {
    console.error("updateCareerModeAction error:", error);
    return { error: "Enregistrement impossible, réessaie." };
  }
  revalidatePath("/dashboard", "layout");
  return {};
}
