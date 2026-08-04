"use server";
import { requireOwnClient } from "@/lib/auth-guards";
import { revalidatePath } from "next/cache";
import {
  startCalibrationPhase,
  transitionCoachingPhase,
  getCoachingPhaseHistory,
  type CoachingPhase,
  type CoachingPhaseHistoryEntry,
} from "@/lib/coaching-phase";

// Rattrapage manuel pour un client déjà coaché avant l'introduction des
// phases (aucune ligne dans client_coaching_phases) — voir CoachingPhasePanel.
export async function initCoachingPhase(clientId: string): Promise<{ error?: string }> {
  const guard = await requireOwnClient(clientId);
  if (!guard.ok) return { error: guard.error };

  await startCalibrationPhase(clientId, guard.userId);
  revalidatePath(`/dashboard/coach/clients/${clientId}`);
  return {};
}

// Transition explicite décidée par le coach — le système ne fait jamais ça
// tout seul, il se contente de suggérer (voir generateCoachingPhaseSuggestions).
export async function advanceCoachingPhase(
  clientId: string,
  toPhase: CoachingPhase,
  note?: string
): Promise<{ error?: string }> {
  const guard = await requireOwnClient(clientId);
  if (!guard.ok) return { error: guard.error };

  const result = await transitionCoachingPhase(clientId, guard.userId, toPhase, note);
  if (result.error) return { error: result.error };

  revalidatePath(`/dashboard/coach/clients/${clientId}`);
  revalidatePath("/dashboard/coach/clients");
  return {};
}

export async function getCoachingPhaseHistoryAction(clientId: string): Promise<CoachingPhaseHistoryEntry[]> {
  const guard = await requireOwnClient(clientId);
  if (!guard.ok) return [];
  return getCoachingPhaseHistory(clientId);
}
