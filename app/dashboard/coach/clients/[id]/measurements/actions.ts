"use server";
// Measurements feature removed — kept as a stub so existing imports don't break.

// Type stub for backward compatibility with MeasurementForm.tsx
export interface MeasurementInput {
  measured_at: string;
  weight?: number | null;
  body_fat?: number | null;
  muscle_mass?: number | null;
  chest?: number | null;
  waist?: number | null;
  hips?: number | null;
  thigh?: number | null;
  calf?: number | null;
  arm?: number | null;
  arm_relaxed?: number | null;
  arm_flexed?: number | null;
  forearm?: number | null;
  shoulders?: number | null;
  abdomen?: number | null;
  neck?: number | null;
  notes?: string | null;
}

export async function saveMeasurement(): Promise<{ error?: string }> {
  return { error: "Feature supprimée." };
}

export async function deleteMeasurement(): Promise<{ error?: string }> {
  return { error: "Feature supprimée." };
}
