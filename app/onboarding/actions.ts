"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import type { MemberPreferences } from "@/lib/personalization";

export async function saveMemberPreferences(
  input: Partial<MemberPreferences>
): Promise<{ error?: string }> {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Non authentifié." };

    const { error } = await supabase.from("member_preferences").upsert({
      id: user.id,
      ...input,
      completed_at: new Date().toISOString(),
    });

    if (error) return { error: "Erreur lors de la sauvegarde." };
    return {};
  } catch {
    return { error: "Erreur inattendue." };
  }
}

export async function completeOnboarding(): Promise<{ error?: string }> {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Non authentifié." };

    const { error } = await supabase
      .from("profiles")
      .update({ onboarding_completed_at: new Date().toISOString() })
      .eq("id", user.id);

    if (error) return { error: "Erreur lors de la sauvegarde." };
    return {};
  } catch {
    return { error: "Erreur inattendue." };
  }
}
