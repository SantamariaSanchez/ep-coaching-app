"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { getWeekStart, getISOWeek } from "@/utils/checkins";
import { revalidatePath } from "next/cache";
import {
  notifyCoachNewCheckin,
  notifyCoachNewCheckinWithMeasurements,
} from "@/app/actions/notifications";

type SubmitState = { error: string } | { success: true } | null;

function num(v: FormDataEntryValue | null): number | null {
  if (!v || v === "") return null;
  const n = parseFloat(v as string);
  return isNaN(n) ? null : n;
}

export async function submitCheckin(
  prevState: SubmitState,
  formData: FormData
): Promise<SubmitState> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Non authentifié." };

  const weekStart = getWeekStart();
  const weekNumber = getISOWeek(new Date(weekStart));

  const includesMeasurements = formData.get("includes_measurements") === "true";
  const weight = num(formData.get("weight"));

  const { error } = await supabase.from("check_ins").insert({
    client_id: user.id,
    week_start: weekStart,
    week_number: weekNumber,
    weight,
    weight_avg: num(formData.get("weight_avg")),
    nutrition_adherence: num(formData.get("nutrition_adherence")),
    calories_per_day: num(formData.get("calories_per_day")),
    steps_per_day: num(formData.get("steps_per_day")),
    sleep_hours: num(formData.get("sleep_hours")),
    hrv: num(formData.get("hrv")),
    resting_hr: num(formData.get("resting_hr")),
    digestion: num(formData.get("digestion")),
    general_feeling: num(formData.get("general_feeling")),
    client_notes: (formData.get("client_notes") as string) || null,
    includes_measurements: includesMeasurements,
  });

  if (error) return { error: error.message };

  // Insert measurements if section was shown
  if (includesMeasurements) {
    const waist      = num(formData.get("waist"));
    const hips       = num(formData.get("hips"));
    const chest      = num(formData.get("chest"));
    const shoulders  = num(formData.get("shoulders"));
    const arm_relaxed = num(formData.get("arm_relaxed"));
    const arm_flexed  = num(formData.get("arm_flexed"));
    const forearm    = num(formData.get("forearm"));
    const thigh      = num(formData.get("thigh"));
    const calf       = num(formData.get("calf"));

    // Only insert if at least one measurement was provided
    const hasAny = [waist, hips, chest, shoulders, arm_relaxed, arm_flexed, forearm, thigh, calf, weight]
      .some((v) => v !== null);

    if (hasAny) {
      await supabase.from("measurements").insert({
        client_id: user.id,
        measured_at: new Date().toISOString().split("T")[0],
        weight,
        waist,
        hips,
        chest,
        shoulders,
        arm_relaxed,
        arm_flexed,
        forearm,
        thigh,
        calf,
      }).throwOnError();
    }
  }

  // Notify coach — fire-and-forget
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const clientName = profile?.full_name ?? "Un client";
  if (includesMeasurements) {
    notifyCoachNewCheckinWithMeasurements(clientName).catch(() => {});
  } else {
    notifyCoachNewCheckin(clientName).catch(() => {});
  }

  revalidatePath("/dashboard/client/checkin");
  return { success: true };
}
