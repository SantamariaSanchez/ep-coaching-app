"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { notifyCoachNewCorrection } from "@/lib/coach-client-notify";
import { requireClient } from "@/lib/auth-guards";
import { saveProgramForClient } from "@/utils/programs";
import { getAccessType } from "@/utils/auth-client";
import { ownStoragePath } from "@/lib/storage-path";
import type { ProgramInput } from "@/utils/programs";

// Self-serve program editor — only available to free-tier community members.
// They build and edit their own program with zero coach review.
export async function saveOwnProgram(
  clientId: string,
  input: ProgramInput
): Promise<{ error?: string }> {
  const guard = await requireClient();
  if (!guard.ok) return { error: guard.error };
  if (guard.userId !== clientId) return { error: "Accès refusé." };

  const supabase = await createServerSupabase();
  // Réservé aux membres gratuits : le programme d'une cliente accompagnée
  // est fait par son coach et ne doit pas être remplacé depuis son espace.
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, subscription_status")
    .eq("id", clientId)
    .maybeSingle();
  if (profileError || !profile) return { error: "Impossible de vérifier ton accès, réessaie." };
  if (getAccessType(profile) !== "membre_gratuit") return { error: "Ton programme est préparé par ton coach." };

  const result = await saveProgramForClient(supabase, clientId, input);
  if (result.error) return result;

  revalidatePath(`/dashboard/client/program`);
  return {};
}

export async function submitCorrection(
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const guard = await requireClient();
  if (!guard.ok) return { error: guard.error };
  const supabase = await createServerSupabase();

  const str = (key: string, max: number) => {
    const v = formData.get(key);
    return typeof v === "string" ? v.trim().slice(0, max) : "";
  };
  const exercise_name = str("exercise_name", 200);
  const objective = str("objective", 1000);
  // Seulement une vidéo du dossier de la cliente (voir lib/storage-path.ts).
  const video_path = ownStoragePath(formData.get("video_path"), guard.userId);
  const client_question = str("client_question", 2000) || null;

  if (!exercise_name || !objective || !video_path) {
    return { error: "Remplis tous les champs obligatoires." };
  }

  const { error } = await supabase.from("exercise_corrections").insert({
    client_id: guard.userId,
    exercise_name,
    objective,
    video_path,
    client_question,
  });

  if (error) return { error: "Erreur lors de l'envoi. Réessaie." };

  // after() : sans lui, Vercel coupe la fonction dès la réponse envoyée et
  // l'email / la notif au coach partaient rarement. Le nom est lu dedans
  // pour ne pas retarder la réponse.
  const userId = guard.userId;
  after(async () => {
    const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle();
    await notifyCoachNewCorrection(profile?.full_name ?? "Un client", exercise_name, userId).catch(() => {});
  });

  revalidatePath("/dashboard/client/program");
  return { success: true };
}
