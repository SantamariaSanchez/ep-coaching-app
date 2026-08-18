"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth-guards";
import { awardPoints, POINTS } from "@/lib/gamification";
import { revalidatePath } from "next/cache";

// Même classe de bug que app/dashboard/client/nutrition/actions.ts
// (addFoodLog/removeFoodLog) : sans revalidatePath, une leçon marquée
// terminée réapparaît décochée après une navigation arrière/avant (le
// cache client de Next resert le rendu serveur d'avant la mutation).
// Syntaxe pattern ("[formationId]", type "layout") : invalide la page +
// toute page imbriquée sans avoir besoin du vrai formationId ici.
//
// CORRIGÉ 2026-08-19 (audit "Formations") : le chemin coach visait
// `/dashboard/coach/formations/[formationId]` (l'éditeur de contenu du
// coach, CoachFormationEditor.tsx) qui n'affiche jamais de progression de
// lecture — les pages client (`app/dashboard/client/formations/**`)
// redirigent d'ailleurs tout `role === "coach"` hors de leurs murs, donc
// cette revalidation ne servait jamais à rien : aucune page accessible à
// un coach ne dépendait de ce chemin. Un vrai équivalent coach vient
// d'être créé, `/dashboard/coach/moi/formations/[formationId]` (page de
// lecture pour le coach lui-même, même contenu que côté client, sa
// propre redirection réservée à `role === "coach"`) — c'est lui qu'il
// faut invalider. Les catalogues (pas seulement les pages de détail)
// sont ajoutés aussi : ils affichent la progression globale (X/Y
// leçons), qui devenait périmée au même titre.
function revalidateFormations() {
  revalidatePath("/dashboard/client/formations");
  revalidatePath("/dashboard/client/formations/[formationId]", "layout");
  revalidatePath("/dashboard/coach/moi/formations");
  revalidatePath("/dashboard/coach/moi/formations/[formationId]", "layout");
}

// requireAuth() plutôt qu'un getUser() nu : les formations sont suivies par
// les clients comme par le coach, mais marquer une leçon reste une écriture,
// donc soumise à la 2FA quand le compte l'a activée.
export async function markLessonComplete(lessonId: string) {
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error };

  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("formation_progress")
    .upsert({ user_id: guard.userId, lesson_id: lessonId }, { onConflict: "user_id,lesson_id" });

  if (error) return { error: error.message };

  awardPoints(guard.userId, POINTS.formation_lesson, "Leçon terminée", "formation_lesson", lessonId);
  revalidateFormations();

  return { success: true };
}

export async function unmarkLessonComplete(lessonId: string) {
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error };

  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("formation_progress")
    .delete()
    .eq("user_id", guard.userId)
    .eq("lesson_id", lessonId);

  if (error) return { error: error.message };
  revalidateFormations();
  return { success: true };
}
