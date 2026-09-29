import { cache } from "react";
import { createAdminClient } from "@/lib/supabase-admin";
import { EMPTY_SETUP, type AppSetup, type Modules } from "@/lib/app-setup";

// Lecture de la configuration "Mon appli" d'un utilisateur (voir
// lib/app-setup.ts). Sans ligne en base : configuration vide, donc appli
// complète (tous les modules actifs sauf les nouveautés optionnelles).
export const getAppSetup = cache(async function getAppSetup(userId: string): Promise<AppSetup> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.from("user_app_setup").select("answers, modules, completed_at").eq("user_id", userId).maybeSingle();
    if (error || !data) return EMPTY_SETUP;
    return {
      answers: (data.answers as Record<string, unknown>) ?? {},
      modules: (data.modules as Modules) ?? {},
      completed: !!data.completed_at,
    };
  } catch {
    return EMPTY_SETUP;
  }
});
