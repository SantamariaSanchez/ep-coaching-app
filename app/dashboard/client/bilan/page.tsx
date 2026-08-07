import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";
import { getTodayLog, getClientDailyLogs } from "@/utils/daily-logs";
import { getTodayLogs } from "@/utils/nutrition";
import DailyBilanForm from "@/components/ui/DailyBilanForm";
import BilanProgressView from "@/components/ui/BilanProgressView";
import { upsertDailyLog } from "./actions";

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function fmt(dateStr: string) {
  return capitalize(
    new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(new Date(dateStr + "T12:00:00"))
  );
}

export default async function ClientBilanPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/client");

  // Le bilan quotidien (poids, sommeil, ressenti) est un outil de suivi
  // autonome accessible à tous les clients, gratuits ou coachés — c'est le
  // cœur du suivi de perte de poids en self-service. La progression
  // (tendances, moyennes globales, export) vit maintenant dans le même
  // écran plutôt que dans un onglet séparé qui montrait les mêmes données
  // autrement — voir components/ui/BilanProgressView.
  const today = new Date().toISOString().split("T")[0];
  const [todayLog, allLogs, todayFoodLogs] = await Promise.all([
    getTodayLog(user.id),
    getClientDailyLogs(user.id, 90),
    getTodayLogs(user.id, today),
  ]);

  // Evite de refaire calculer les macros a la main : si le client a deja
  // logge ses aliments du jour dans Nutrition, on pre-remplit le bilan avec
  // ce total plutot que de lui demander de le retaper.
  const nutritionTotals = todayFoodLogs.length > 0
    ? todayFoodLogs.reduce(
        (acc, l) => ({
          calories: acc.calories + (l.calories ?? 0),
          proteins: acc.proteins + (l.proteins ?? 0),
          carbs: acc.carbs + (l.carbs ?? 0),
          fats: acc.fats + (l.fats ?? 0),
        }),
        { calories: 0, proteins: 0, carbs: 0, fats: 0 }
      )
    : null;

  return (
    <div className="page-transition" style={{ maxWidth: 640, margin: "0 auto", padding: "32px 16px 80px" }}>
      <div className="animate-fade-up" style={{ marginBottom: 24 }}>
        <p className="ep-section-title" style={{ marginBottom: 4 }}>{fmt(today)}</p>
        <h1 className="ep-h1">Bilan &amp; progression</h1>
      </div>

      <div className="animate-scale-in" style={{ marginBottom: 32 }}>
        <DailyBilanForm today={today} existing={todayLog} action={upsertDailyLog} nutritionTotals={nutritionTotals} />
      </div>

      <BilanProgressView logs={allLogs} exportHref={`/api/export/daily-logs/${user.id}`} />
    </div>
  );
}
