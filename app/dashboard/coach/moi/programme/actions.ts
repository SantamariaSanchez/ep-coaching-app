"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { requireCoach } from "@/lib/auth-guards";
import { saveProgramForClient } from "@/utils/programs";
import type { ProgramInput } from "@/utils/programs";

// The coach trains too — same self-serve program editor as free community
// members, just gated to role="coach" and scoped to the coach's own id.
export async function saveOwnCoachProgram(
  clientId: string,
  input: ProgramInput
): Promise<{ error?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };
  if (guard.userId !== clientId) return { error: "Accès refusé." };

  const supabase = await createServerSupabase();
  const result = await saveProgramForClient(supabase, clientId, input);
  if (result.error) return result;

  revalidatePath("/dashboard/coach/moi/programme");
  return {};
}
