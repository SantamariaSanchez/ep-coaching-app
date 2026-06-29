"use server";

import { createServerSupabase } from "@/lib/supabase-server";

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
