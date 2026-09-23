"use server";

import { requireAuth } from "@/lib/auth-guards";
import { getMyWeeklyRecap, type WeeklyRecapStats } from "@/lib/weekly-recap";
import { getClientsWeeklyConsistency } from "@/lib/client-activity";

// Retour direct : "quand j'ouvre l'appli c'est 5s donc trop long". La page
// (server component) attendait 11 requêtes en Promise.all avant de rendre
// quoi que ce soit — dont ces deux-ci, qui ne sont qu'un bonus affiché EN
// PLUS du reste (voir lib/weekly-recap.ts, "Brainstorm 2 avatars"), jamais
// indispensables au premier rendu. Sorties du chemin bloquant : chargées
// ici, après le montage côté client (AujourdhuiView), pendant que le reste
// de la page a déjà pu s'afficher avec 2 requêtes serveur de moins.
export async function getWeeklyExtras(): Promise<{
  weeklyRecap: WeeklyRecapStats | null;
  weeklyConsistency: number | null;
}> {
  const guard = await requireAuth();
  if (!guard.ok) return { weeklyRecap: null, weeklyConsistency: null };

  const [weeklyRecap, consistencyMap] = await Promise.all([
    getMyWeeklyRecap(guard.userId),
    getClientsWeeklyConsistency([guard.userId]),
  ]);

  return { weeklyRecap, weeklyConsistency: consistencyMap[guard.userId] ?? null };
}
