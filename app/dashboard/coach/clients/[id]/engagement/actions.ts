"use server";
import { revalidatePath } from "next/cache";
import { requireOwnClient } from "@/lib/auth-guards";
import { saveEngagement } from "@/lib/engagement-server";
import type { RenewalStatus } from "@/lib/engagement";

const RENEWAL: RenewalStatus[] = ["en_reflexion", "renouvele", "arrete"];

// Durée, date de début et suite de l'engagement d'un client. Le coach garde
// la main : la fin se recalcule (début + durée - 1 jour) et le bilan se
// redéclenche si l'échéance change.
export async function updateEngagement(
  clientId: string,
  input: { months: number; startDate: string; renewalStatus?: string | null; note?: string | null }
): Promise<{ error?: string }> {
  const guard = await requireOwnClient(clientId);
  if (!guard.ok) return { error: guard.error };
  const renewal = input.renewalStatus === undefined ? undefined : input.renewalStatus === null || input.renewalStatus === "" ? null : (RENEWAL as string[]).includes(input.renewalStatus) ? (input.renewalStatus as RenewalStatus) : undefined;
  const result = await saveEngagement(clientId, guard.userId, { months: Number(input.months), startDate: input.startDate, renewalStatus: renewal, note: input.note });
  if (result.error) return result;
  revalidatePath(`/dashboard/coach/clients/${clientId}`);
  revalidatePath("/dashboard/coach/prioritaires");
  return {};
}
