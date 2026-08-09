export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";
import { getTodayLog, getClientDailyLogs } from "@/utils/daily-logs";
import { getTodayStepsActual } from "@/utils/steps";
import DailyBilanForm from "@/components/ui/DailyBilanForm";
import BilanProgressView from "@/components/ui/BilanProgressView";
import { upsertCoachDailyLog } from "./actions";

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function fmt(d: string) {
  return capitalize(new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(new Date(d + "T12:00:00")));
}

export default async function CoachMonBilanPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/coach");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "coach") redirect("/dashboard/client");

  // "Progression" (moyennes globales, tendances, export CSV) vivait avant
  // dans un onglet séparé qui recalculait les mêmes daily_logs autrement —
  // fusionné ici, voir components/ui/BilanProgressView. L'ancienne route
  // /dashboard/coach/moi/progression redirige maintenant ici.
  const today = new Date().toISOString().split("T")[0];
  const [todayLog, allLogs, autoSteps] = await Promise.all([
    getTodayLog(user.id),
    getClientDailyLogs(user.id, 90),
    getTodayStepsActual(user.id),
  ]);

  return (
    <div className="page-transition" style={{ maxWidth: 640, margin: "0 auto", padding: "32px 16px 80px" }}>
      <div className="animate-fade-up" style={{ marginBottom: 24 }}>
        <p className="ep-section-title" style={{ marginBottom: 4 }}>{fmt(today)}</p>
        <h1 className="ep-h1">Mon bilan &amp; ma progression</h1>
      </div>

      <div className="ep-card animate-scale-in" style={{ padding: "20px 16px", marginBottom: 32 }}>
        <DailyBilanForm today={today} existing={todayLog} action={upsertCoachDailyLog} autoSteps={autoSteps} />
      </div>

      <BilanProgressView logs={allLogs} exportHref={`/api/export/daily-logs/${user.id}`} />
    </div>
  );
}
