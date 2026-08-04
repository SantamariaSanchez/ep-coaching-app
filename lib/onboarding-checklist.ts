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
export async function getOnboardingChecklist(
  userId: string
): Promise<OnboardingChecklistItem[]> {
  try {
    const supabase = await createServerSupabase();
    const [{ count: programCount }, { count: nutritionCount }, { count: bilanCount }, { count: postCount }] =
      await Promise.all([
        supabase.from("programs").select("id", { count: "exact", head: true }).eq("client_id", userId),
        supabase.from("nutrition_profiles").select("id", { count: "exact", head: true }).eq("client_id", userId),
        supabase.from("daily_logs").select("id", { count: "exact", head: true }).eq("client_id", userId),
        supabase.from("community_posts").select("id", { count: "exact", head: true }).eq("author_id", userId),
      ]);

    return [
      {
        key: "program",
        href: "/dashboard/client/program",
        title: "Crée ton programme",
        description: "Construis ta première séance, en quelques minutes.",
        done: (programCount ?? 0) > 0,
      },
      {
        key: "nutrition",
        href: "/dashboard/client/nutrition",
        title: "Calcule tes calories",
        description: "Ton TDEE et tes macros, selon ton objectif.",
        done: (nutritionCount ?? 0) > 0,
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
