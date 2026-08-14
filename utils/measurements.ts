import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

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

// Variante admin pour le coach qui consulte un AUTRE client — getClientMeasurements
// ci-dessus passe par le client de session, dont la RLS ne garantit pas que le
// coach voit les mensurations d'un client qui n'est pas lui-même (même
// précédent que partout ailleurs dans ce fichier de constats : "shared
// reference content" n'est pas le cas ici, mais "lu par le bon coach"
// dépend de policies RLS pas forcément posées sur cette table).
export async function getClientMeasurementsAsCoach(
  clientId: string
): Promise<Measurement[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
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
