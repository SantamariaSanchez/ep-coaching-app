"use server";

import { getUser } from "@/utils/auth";
import { createServerSupabase } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import type { ScheduleBlock } from "@/utils/agenda";

// Chacun (client ou coach pour lui-même) gère uniquement son propre agenda —
// pas de paramètre clientId, l'utilisateur connecté est toujours le
// propriétaire du bloc. Le coach consulte l'agenda d'un client en lecture
// seule ailleurs (fiche client), jamais via ces actions.

export async function addScheduleBlock(data: {
  day_of_week: number;
  start_time: string;
  end_time: string;
  label: string;
  color: string;
  notes: string | null;
}): Promise<{ error?: string; block?: ScheduleBlock }> {
  const user = await getUser();
  if (!user) return { error: "Non authentifié." };

  const supabase = await createServerSupabase();
  const { data: row, error } = await supabase
    .from("schedule_blocks")
    .insert({ owner_id: user.id, ...data })
    .select()
    .single();

  if (error || !row) return { error: error?.message ?? "Erreur." };

  revalidatePath("/dashboard/client/agenda");
  revalidatePath("/dashboard/coach/moi/agenda");
  return { block: row as ScheduleBlock };
}

export async function updateScheduleBlock(
  blockId: string,
  data: {
    day_of_week: number;
    start_time: string;
    end_time: string;
    label: string;
    color: string;
    notes: string | null;
  }
): Promise<{ error?: string }> {
  const user = await getUser();
  if (!user) return { error: "Non authentifié." };

  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("schedule_blocks")
    .update(data)
    .eq("id", blockId)
    .eq("owner_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/client/agenda");
  revalidatePath("/dashboard/coach/moi/agenda");
  return {};
}

export async function deleteScheduleBlock(blockId: string): Promise<{ error?: string }> {
  const user = await getUser();
  if (!user) return { error: "Non authentifié." };

  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("schedule_blocks")
    .delete()
    .eq("id", blockId)
    .eq("owner_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/client/agenda");
  revalidatePath("/dashboard/coach/moi/agenda");
  return {};
}
