"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { getWeekStart, getISOWeek } from "@/utils/checkins";
import { revalidatePath } from "next/cache";
import { notifyCoachNewCheckin } from "@/app/actions/notifications";

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
  });

  if (error) return { error: error.message };

  // Notify coach — fire-and-forget
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const clientName = profile?.full_name ?? "Un client";
  notifyCoachNewCheckin(clientName).catch(() => {});

  revalidatePath("/dashboard/client/checkin");
  return { success: true };
}
