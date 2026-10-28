"use server";
import { requireOwnClient } from "@/lib/auth-guards";
import { revalidatePath } from "next/cache";
import {
  startCalibrationPhase,
  transitionCoachingPhase,
  undoCoachingPhaseTransition,
  updateCurrentPhaseDetails,
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

export interface PhaseChangeOutcome {
  error?: string;
  /** Ligne créée, à passer à undoCoachingPhase pour annuler. */
  newId?: string;
  fromPhase?: CoachingPhase | null;
  toPhase?: CoachingPhase;
}

// Transition explicite décidée par le coach, dans les deux sens (avancer,
// revenir en arrière, nouveau bloc de la même phase). Le système ne fait
// jamais ça tout seul, il se contente de suggérer.
export async function advanceCoachingPhase(
  clientId: string,
  toPhase: CoachingPhase,
  note?: string,
  opts?: { startedOn?: string | null; plannedWeeks?: number | null }
): Promise<PhaseChangeOutcome> {
  const guard = await requireOwnClient(clientId);
  if (!guard.ok) return { error: guard.error };

  const result = await transitionCoachingPhase(clientId, guard.userId, toPhase, note, opts);
  if (result.error) return { error: result.error };

  revalidatePath(`/dashboard/coach/clients/${clientId}`);
  revalidatePath("/dashboard/coach/clients");
  return { newId: result.newId, fromPhase: result.fromPhase ?? null, toPhase };
}

// Annule le changement qui vient d'être fait : la phase précédente est
// rouverte telle qu'elle était.
export async function undoCoachingPhase(clientId: string, rowId: string): Promise<{ error?: string; restoredPhase?: CoachingPhase | null }> {
  const guard = await requireOwnClient(clientId);
  if (!guard.ok) return { error: guard.error };

  const result = await undoCoachingPhaseTransition(clientId, rowId);
  if (result.error) return { error: result.error };

  revalidatePath(`/dashboard/coach/clients/${clientId}`);
  revalidatePath("/dashboard/coach/clients");
  return { restoredPhase: result.restoredPhase ?? null };
}

// Modifie la phase en cours sans en changer : date de début, durée prévue, note.
export async function updateCoachingPhaseDetails(
  clientId: string,
  input: { startedOn?: string | null; plannedWeeks?: number | null; note?: string | null }
): Promise<{ error?: string }> {
  const guard = await requireOwnClient(clientId);
  if (!guard.ok) return { error: guard.error };

  const result = await updateCurrentPhaseDetails(clientId, guard.userId, input);
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
