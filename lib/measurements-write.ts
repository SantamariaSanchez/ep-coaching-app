import { createAdminClient } from "@/lib/supabase-admin";
import type { LogMeasurementInput } from "@/components/ui/MeasurementsSection";

// Écriture d'une prise de mesures sur SON propre suivi (coach dans Moi, client
// ou membre dans Photos). L'appelant a déjà vérifié la session : on écrit
// toujours sur userId, jamais sur un id venu du navigateur.
const BODY_FAT_METHODS = new Set(["balance", "pince", "dexa", "estimation"]);

function clean(n: number | null | undefined, min: number, max: number): number | null {
  if (n == null || !Number.isFinite(n)) return null;
  return n >= min && n <= max ? Math.round(n * 10) / 10 : null;
}

export async function saveOwnMeasurement(userId: string, input: LogMeasurementInput): Promise<{ error?: string }> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.measuredAt)) return { error: "Date invalide." };
  const cm = (n: number | null) => clean(n, 5, 300);
  const row: Record<string, unknown> = {
    client_id: userId,
    measured_at: input.measuredAt,
    weight: clean(input.weight, 20, 400),
    waist: cm(input.waist),
    hips: cm(input.hips),
    chest: cm(input.chest),
    shoulders: cm(input.shoulders),
    arm_relaxed: cm(input.armRelaxed),
    arm_flexed: cm(input.armFlexed),
    forearm: cm(input.forearm),
    thigh: cm(input.thigh),
    calf: cm(input.calf),
    abdomen: cm(input.abdomen),
    neck: cm(input.neck),
    notes: input.notes?.trim().slice(0, 500) || null,
  };
  // Masse grasse : seulement si le champ était affiché, pour ne jamais
  // effacer une valeur existante depuis un formulaire qui ne la montre pas.
  if (input.bodyFat !== undefined) {
    row.body_fat = clean(input.bodyFat, 2, 70);
    row.body_fat_method = row.body_fat != null && input.bodyFatMethod && BODY_FAT_METHODS.has(input.bodyFatMethod) ? input.bodyFatMethod : null;
  }
  const { error } = await createAdminClient().from("measurements").upsert(row, { onConflict: "client_id,measured_at" });
  if (error) {
    console.error("saveOwnMeasurement error:", error);
    return { error: "Échec de l'enregistrement." };
  }
  return {};
}
