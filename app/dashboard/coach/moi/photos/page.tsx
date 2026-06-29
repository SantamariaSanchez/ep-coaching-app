export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";
import { getClientPhotoUpdates, getThisWeekPhotoUpdate } from "@/utils/photos";
import ClientPhotosView from "@/components/ui/ClientPhotosView";
import { submitPhotoUpdate } from "./actions";

export default async function CoachMonPhotosPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/coach");

  const { data: profile } = await supabase.from("profiles").select("role, photo_frequency").eq("id", user.id).single();
  if (profile?.role !== "coach") redirect("/dashboard/client");

  const today = new Date().toISOString().split("T")[0];
  const frequency = (profile as { photo_frequency?: string | null })?.photo_frequency ?? "weekly";

  let photoHistory: Awaited<ReturnType<typeof getClientPhotoUpdates>> = [];
  let weekUpdate = null;
  try {
    [photoHistory, weekUpdate] = await Promise.all([
      getClientPhotoUpdates(user.id, 20),
      getThisWeekPhotoUpdate(user.id),
    ]);
  } catch (e) {
    console.error("Photos fetch error:", e);
  }

  const alreadySubmitted = !!weekUpdate;

  return (
    <ClientPhotosView
      today={today}
      profile={profile}
      photoHistory={photoHistory}
      alreadySubmitted={alreadySubmitted}
      submitPhotoUpdate={submitPhotoUpdate}
    />
  );
}
