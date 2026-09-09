import { createServerSupabase } from "@/lib/supabase-server";

export interface OnboardingChecklistItem {
  key: string;
  href: string;
  title: string;
  description: string;
  done: boolean;
}

// Checklist de vraies actions pour un membre gratuit qui vient de créer son
// compte — pas une description des fonctionnalités, un guide qui coche au
// fur et à mesure que la personne utilise réellement l'appli. Complétude
// déduite de données déjà en base (aucune nouvelle table nécessaire).
//
// Les deux premiers items pointaient à l'origine sur de la mise en place à
// usage unique (créer un programme, calculer son TDEE) : réalisable en une
// seule session, sans jamais revenir dans l'appli ensuite — ce qui ne dit
// rien du vrai problème (quasi aucun retour après inscription). Remplacés
// par les vraies actions listées dans le mandat : une séance réellement
// loguée (workout_logs, possible même sans programme via la séance libre du
// Logbook) et un repas réellement noté (food_logs, journal du jour sur la
// page Nutrition) — les deux ne peuvent arriver que si la personne revient
// réellement utiliser l'appli, pas juste la configurer une fois.
export async function getOnboardingChecklist(
  userId: string
): Promise<OnboardingChecklistItem[]> {
  try {
    const supabase = await createServerSupabase();
    const [{ count: workoutLogCount }, { count: foodLogCount }, { count: bilanCount }, { count: postCount }] =
      await Promise.all([
        supabase.from("workout_logs").select("id", { count: "exact", head: true }).eq("client_id", userId),
        supabase.from("food_logs").select("id", { count: "exact", head: true }).eq("client_id", userId),
        supabase.from("daily_logs").select("id", { count: "exact", head: true }).eq("client_id", userId),
        supabase.from("community_posts").select("id", { count: "exact", head: true }).eq("author_id", userId),
      ]);

    return [
      {
        key: "workout",
        href: "/dashboard/client/logbook",
        title: "Logue ta première séance",
        description: "Une séance libre ou depuis ton programme, en quelques minutes.",
        done: (workoutLogCount ?? 0) > 0,
      },
      {
        key: "nutrition",
        href: "/dashboard/client/nutrition",
        title: "Note ton premier repas",
        description: "Ajoute un aliment à ton journal du jour.",
        done: (foodLogCount ?? 0) > 0,
      },
      {
        key: "bilan",
        href: "/dashboard/client/bilan",
        title: "Fais ton premier bilan",
        description: "Poids, sommeil, ressenti : deux minutes chaque jour.",
        done: (bilanCount ?? 0) > 0,
      },
      {
        key: "community",
        href: "/dashboard/client/communaute/victoires",
        title: "Rejoins la communauté",
        description: "Partage une victoire ou pose une question.",
        done: (postCount ?? 0) > 0,
      },
    ];
  } catch {
    return [];
  }
}
