import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";
import RemindersView from "@/components/client/RemindersView";

// Manquait entièrement côté coach (trouvé en creusant Steps : le bouton
// "créer un rappel depuis une habitude de routine" n'apparaissait jamais,
// faute de page "Mes rappels" pour ce rôle — voir
// app/dashboard/client/steps/actions.ts, createReminderFromRoutine, qui ne
// dépend pourtant d'aucun rôle particulier). RemindersView est déjà 100%
// générique (auth + table `reminders` par user.id, aucune prop serveur
// nécessaire), donc réutilisée telle quelle plutôt que dupliquée.
export const dynamic = "force-dynamic";

export default async function CoachMoiRemindersPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/coach");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "coach") redirect("/dashboard/client/reminders");

  return <RemindersView />;
}
