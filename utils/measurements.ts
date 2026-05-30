import { createServerSupabase } from "@/lib/supabase-server";

export interface Measurement {
  id: string;
  client_id: string;
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

export async function getClientMeasurements(
  clientId: string
): Promise<Measurement[]> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("measurements")
      .select("*")
      .eq("client_id", clientId)
      .order("measured_at", { ascending: false });
    return (data as Measurement[]) ?? [];
  } catch {
    return [];
  }
}

/** Returns the date string of the most recent measurement record, or null. */
export async function getLastMeasurementDate(
  clientId: string
): Promise<string | null> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("measurements")
      .select("measured_at")
      .eq("client_id", clientId)
      .order("measured_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data as { measured_at: string } | null)?.measured_at ?? null;
  } catch {
    return null;
  }
}
