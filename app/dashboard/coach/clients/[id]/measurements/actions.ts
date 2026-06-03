"use server";
import { requireCoach } from "@/lib/auth-guards";

import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";

export interface MeasurementInput {
  measured_at: string;
  weight: number | null;
  waist: number | null;
  hips: number | null;
  chest: number | null;
  shoulders: number | null;
  arm_relaxed: number | null;
  arm_flexed: number | null;
  forearm: number | null;
  thigh: number | null;
  calf: number | null;
  abdomen: number | null;
  neck: number | null;
  notes: string | null;
}

export async function saveMeasurement(
  clientId: string,
  data: MeasurementInput
): Promise<{
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error }; error?: string }> {
  try {
    const supabase = createAdminClient(); // admin bypasses RLS for cross-user writes

    const { error } = await supabase.from("measurements").insert({
      client_id: clientId,
      ...data,
    });

    if (error) return { error: "Erreur lors de l'enregistrement." };

    revalidatePath(`/dashboard/coach/clients/${clientId}/measurements`);
    revalidatePath(`/dashboard/client/measurements`);
    return {};
  } catch {
    return { error: "Erreur inattendue." };
  }
}

export async function deleteMeasurement(
  clientId: string,
  measurementId: string
): Promise<{ error?: string }> {
  try {
    const supabase = createAdminClient(); // admin bypasses RLS for cross-user writes
    const { error } = await supabase
      .from("measurements")
      .delete()
      .eq("id", measurementId)
      .eq("client_id", clientId);

    if (error) return { error: "Erreur lors de la suppression." };

    revalidatePath(`/dashboard/coach/clients/${clientId}/measurements`);
    revalidatePath(`/dashboard/client/measurements`);
    return {};
  } catch {
    return { error: "Erreur inattendue." };
  }
}
