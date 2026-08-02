"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import type { MemberPreferences } from "@/lib/personalization";

// Labels historiques utilisés côté fiche client coach (profiles.goal /
// profiles.level), conservés tels quels pour ne rien casser à l'affichage.
const GOAL_LABELS: Record<string, string> = {
  perte_poids: "Perte de poids",
  prise_muscle: "Prise de muscle",
  performance: "Performance",
  sante_bien_etre: "Santé & bien-être",
  remise_en_forme: "Remise en forme",
};

const LEVEL_LABELS: Record<string, string> = {
  debutant: "Débutant",
  intermediaire: "Intermédiaire",
  confirme: "Avancé",
};

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

    // Le quiz remplace l'ancien questionnaire pré-inscription : on répercute
    // objectif/niveau sur le profil pour que la fiche client coach reste
    // renseignée, sans lui ajouter d'étape en plus.
    const profileUpdate: Record<string, string> = {};
    if (input.primary_goal && GOAL_LABELS[input.primary_goal]) {
      profileUpdate.goal = GOAL_LABELS[input.primary_goal];
    }
    if (input.experience_level && LEVEL_LABELS[input.experience_level]) {
      profileUpdate.level = LEVEL_LABELS[input.experience_level];
    }
    if (Object.keys(profileUpdate).length > 0) {
      await supabase.from("profiles").update(profileUpdate).eq("id", user.id);
    }

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
