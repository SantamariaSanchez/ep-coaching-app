"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { notifyCoachNewCorrection } from "@/app/actions/notifications";
import { requireClient } from "@/lib/auth-guards";
import { saveProgramForClient } from "@/utils/programs";
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

  const exercise_name = (formData.get("exercise_name") as string)?.trim();
  const objective = (formData.get("objective") as string)?.trim();
  const video_path = (formData.get("video_path") as string)?.trim();
  const client_question =
    (formData.get("client_question") as string)?.trim() || null;

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

  // Notify coach — fire-and-forget
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", guard.userId)
    .single();

  notifyCoachNewCorrection(
    profile?.full_name ?? "Un client",
    exercise_name,
    guard.userId
  ).catch(() => {});

  revalidatePath("/dashboard/client/program");
  return { success: true };
}
