import { getT } from "@/lib/i18n-server";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";
import { getClientDailyLogs } from "@/utils/daily-logs";
import { getTodayLogs, getActiveDietPlan } from "@/utils/nutrition";
import BilanDayPicker from "@/components/ui/BilanDayPicker";
import { getAppSetup } from "@/lib/app-setup-server";
import { isWithinBilanBackfillWindow } from "@/lib/dates";
import { getTodayStepsActual } from "@/utils/steps";
import DailyBilanForm from "@/components/ui/DailyBilanForm";
import BilanProgressView from "@/components/ui/BilanProgressView";
import { upsertDailyLog } from "./actions";
import { todayInParis } from "@/lib/dates";

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function fmt(dateStr: string) {
  return capitalize(
    new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(new Date(dateStr + "T12:00:00"))
  );
}

export default async function ClientBilanPage({ searchParams }: { searchParams: Promise<{ jour?: string }> }) {
  const t = await getT();
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/client");

  // Un coach n'a pas de bilan "client" séparé du sien : sans cette
  // redirection, /dashboard/client/bilan chargeait quand même pour lui (les
  // daily_logs sont indexés par user id, pas par rôle) mais upsertDailyLog
  // (requireClient()) refusait ensuite l'enregistrement — la page semblait
  // fonctionner jusqu'au premier "Enregistrer", qui échouait silencieusement.
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role === "coach") redirect("/dashboard/coach/moi/bilan");

  // Le bilan quotidien (poids, sommeil, ressenti) est un outil de suivi
  // autonome accessible à tous les clients, gratuits ou coachés — c'est le
  // cœur du suivi de perte de poids en self-service. La progression
  // (tendances, moyennes globales, export) vit maintenant dans le même
  // écran plutôt que dans un onglet séparé qui montrait les mêmes données
  // autrement — voir components/ui/BilanProgressView.
  const today = todayInParis();
  // Bilan d'un jour passé (?jour=AAAA-MM-JJ, 30 jours max) : rattraper un
  // oubli avec exactement le même formulaire.
  const { jour } = await searchParams;
  const date = jour && /^\d{4}-\d{2}-\d{2}$/.test(jour) && isWithinBilanBackfillWindow(jour) ? jour : today;
  const [allLogs, dayFoodLogs, autoSteps, activePlan, appSetup] = await Promise.all([
    getClientDailyLogs(user.id, 90),
    getTodayLogs(user.id, date),
    date === today ? getTodayStepsActual(user.id) : Promise.resolve(null),
    getActiveDietPlan(user.id),
    getAppSetup(user.id),
  ]);
  const todayLog = allLogs.find((l) => l.log_date === date) ?? null;
  const todayFoodLogs = dayFoodLogs;

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
        <p className="ep-section-title" style={{ marginBottom: 4 }}>{date === today ? fmt(today) : `Rattrapage · ${fmt(date)}`}</p>
        <h1 className="ep-h1">{t("Bilan & progression")}</h1>
      </div>

      <BilanDayPicker basePath="/dashboard/client/bilan" today={today} selected={date} logs={allLogs} />

      <div className="animate-scale-in" style={{ marginBottom: 32 }}>
        <DailyBilanForm key={date} today={date} existing={todayLog} action={upsertDailyLog} nutritionTotals={nutritionTotals} autoSteps={autoSteps} plan={activePlan ? { name: activePlan.name, mode: activePlan.mode } : null} trackerHref={date === today ? "/dashboard/client/nutrition" : `/dashboard/client/nutrition?jour=${date}`} setup={appSetup} />
      </div>

      <BilanProgressView logs={allLogs} exportHref={`/api/export/daily-logs/${user.id}`} />
    </div>
  );
}
