import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";
import { StepsSyncPage } from "@/components/steps/StepsSyncPage";

export const dynamic = "force-dynamic";

export default async function CoachMoiStepsSyncPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/coach");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "coach") redirect("/dashboard/client/steps/synchro");
  return <StepsSyncPage userId={user.id} backHref="/dashboard/coach/moi/steps" ouraHref="/dashboard/coach/moi/tracking" />;
}
