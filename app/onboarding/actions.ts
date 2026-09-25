"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth-guards";
import type { MemberPreferences, PrimaryGoal } from "@/lib/personalization";
import { categoryForPrimaryGoal, pickGuide, type GuideCategory, type GuideRef } from "@/lib/reengagement";

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
    const guard = await requireAuth();
    if (!guard.ok) return { error: guard.error };
    const supabase = await createServerSupabase();

    const { error } = await supabase.from("member_preferences").upsert({
      id: guard.userId,
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
      await supabase.from("profiles").update(profileUpdate).eq("id", guard.userId);
    }

    return {};
  } catch (e) {
    console.error("saveMemberPreferences error:", e);
    return { error: "Erreur inattendue." };
  }
}

// Premier guide offert dès la fin du quiz, choisi selon l'objectif déclaré
// (voir OnboardingTour) — jusqu'ici le seul moment où un membre gratuit
// recevait un vrai guide de la bibliothèque était après 10 jours d'inactivité
// (lib/reengagement.ts), jamais dès l'inscription. Repose sur les mêmes
// catégorie/tirage que la relance des dormants pour ne pas dupliquer la
// logique de choix.
export async function getWelcomeGuide(
  primaryGoal: PrimaryGoal | null | undefined
): Promise<GuideRef | null> {
  try {
    const guard = await requireAuth();
    if (!guard.ok) return null;
    const supabase = await createServerSupabase();

    async function guidesIn(category: GuideCategory): Promise<GuideRef[]> {
      const { data } = await supabase
        .from("lead_magnets")
        .select("slug, title, hook")
        .eq("published", true)
        .eq("category", category)
        .limit(60);
      return (data as GuideRef[] | null) ?? [];
    }

    const category = categoryForPrimaryGoal(primaryGoal ?? null);
    let guides = await guidesIn(category);
    // Une catégorie ciblée peut être vide si la bibliothèque n'a pas encore
    // été garnie dessus : "Général" sert de filet plutôt que de ne rien
    // offrir du tout.
    if (guides.length === 0 && category !== "Général") {
      guides = await guidesIn("Général");
    }

    return pickGuide(guides, guard.userId, 0);
  } catch (e) {
    console.error("getWelcomeGuide error:", e);
    return null;
  }
}

export async function completeOnboarding(): Promise<{ error?: string }> {
  try {
    const guard = await requireAuth();
    if (!guard.ok) return { error: guard.error };
    const supabase = await createServerSupabase();

    const { error } = await supabase
      .from("profiles")
      .update({ onboarding_completed_at: new Date().toISOString() })
      .eq("id", guard.userId);

    if (error) return { error: "Erreur lors de la sauvegarde." };
    return {};
  } catch (e) {
    console.error("completeOnboarding error:", e);
    return { error: "Erreur inattendue." };
  }
}
