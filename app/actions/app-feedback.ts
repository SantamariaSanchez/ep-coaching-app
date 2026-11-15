"use server";

import { getUser, getProfile } from "@/utils/auth";
import { createServerSupabase } from "@/lib/supabase-server";
import { getAccessType } from "@/utils/auth-client";
import { cleanFeedback, FEEDBACK_EVERY_DAYS } from "@/lib/app-feedback";

// Envoi du retour volontaire (lib/app-feedback.ts). Inséré avec la session
// de la personne : la RLS d'app_feedback n'accepte que sa propre ligne.
export async function submitAppFeedbackAction(input: { usefulness: unknown; mostUseful: unknown; missing: unknown }): Promise<{ error?: string }> {
  const user = await getUser();
  if (!user) return { error: "Non authentifié." };
  const clean = cleanFeedback(input);
  if (!clean) return { error: "Choisis une note de 1 à 5." };
  const supabase = await createServerSupabase();
  // Pas deux avis rapprochés (double appui, onglet resté ouvert).
  const since = new Date(Date.now() - FEEDBACK_EVERY_DAYS * 86_400_000).toISOString();
  const { count } = await supabase.from("app_feedback").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", since);
  if ((count ?? 0) > 0) return {};
  const profile = await getProfile(user.id);
  const { error } = await supabase.from("app_feedback").insert({ user_id: user.id, access_type: getAccessType(profile), ...clean });
  if (error) return { error: "Envoi impossible, réessaie." };
  return {};
}
