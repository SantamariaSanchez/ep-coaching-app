import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { sendPushToUser } from "@/lib/push";

// Rappel automatique à l'heure habituelle de chaque repas — zéro
// configuration : des horaires usuels par créneau (pas par client), voir
// DEFAULT_SLOT_TIMES. Le but explicite est de réduire la friction au
// minimum : le client tape sur la notif et atterrit directement sur le
// repas déjà prévu par son coach (aliments + quantités), prêt à valider en
// un tap — voir handleTogglePlanItem/DietPlanCard dans ClientNutritionView.
// Décalage Paris géré dynamiquement via Intl (fuseau IANA), pas un offset
// UTC figé dans le cron comme les autres jobs horaires de l'appli : celui-ci
// tourne en continu toute la journée (*/15), un simple décalage fixe
// dériverait au changement d'heure d'été/hiver.
const DEFAULT_SLOT_TIMES: Record<string, string> = {
  breakfast: "08:00",
  morning: "10:30",
  lunch: "12:30",
  afternoon: "16:00",
  preworkout: "17:30",
  postworkout: "19:00",
  dinner: "20:00",
};

const SLOT_LABELS: Record<string, string> = {
  breakfast: "petit-déjeuner",
  morning: "collation du matin",
  lunch: "déjeuner",
  afternoon: "collation de l'après-midi",
  preworkout: "repas pré-entraînement",
  postworkout: "repas post-entraînement",
  dinner: "dîner",
};

const DOW_MAP = ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"] as const;

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function parisNow(): { minutes: number; today: string; dow: string } {
  const now = new Date();
  const hhmm = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
  const parisDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(now);
  const dowIndex = new Date(`${parisDate}T12:00:00Z`).getUTCDay();
  // food_logs.logged_at est écrit en date UTC (voir "today" côté client dans
  // app/dashboard/client/nutrition/page.tsx, et les autres crons nutrition) —
  // on matche cette même convention pour la vérification "déjà loggué", pour
  // ne pas introduire un décalage entre les deux. Seuls l'heure du jour et le
  // jour de semaine (dow) ont besoin d'être calculés en heure de Paris.
  const today = now.toISOString().split("T")[0];
  return { minutes: timeToMinutes(hhmm), today, dow: DOW_MAP[dowIndex] };
}

interface PlanRow {
  client_id: string;
  structure: string;
  diet_plan_meals: { meal_slot: string; day_of_week: string | null }[];
}

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { minutes: nowMinutes, today, dow } = parisNow();

  // Créneaux dus dans les 15 prochaines minutes — bornes alignées sur le pas
  // du cron (*/15, et toutes les heures par défaut ci-dessus tombent aussi
  // sur des multiples de 15) : chaque créneau n'est donc touché que par un
  // seul passage du cron par jour, jamais deux.
  const dueSlots = Object.entries(DEFAULT_SLOT_TIMES)
    .filter(([, t]) => {
      const target = timeToMinutes(t);
      return nowMinutes >= target && nowMinutes < target + 15;
    })
    .map(([slot]) => slot);

  if (dueSlots.length === 0) {
    return NextResponse.json({ ok: true, notified: 0, dueSlots: [] });
  }

  const admin = createAdminClient();
  const { data: plans } = await admin
    .from("diet_plans")
    .select("client_id, structure, diet_plan_meals(meal_slot, day_of_week)")
    .eq("is_active", true);

  if (!plans || plans.length === 0) {
    return NextResponse.json({ ok: true, notified: 0, dueSlots });
  }

  // Pour chaque plan actif, quels créneaux dus ont vraiment un repas prévu
  // aujourd'hui — respecte la structure hebdomadaire du plan, inutile de
  // rappeler un déjeuner qui n'existe pas ce jour-là.
  const targets: { clientId: string; slot: string }[] = [];
  for (const plan of plans as unknown as PlanRow[]) {
    const todaysMeals =
      plan.structure === "weekly"
        ? plan.diet_plan_meals.filter((m) => m.day_of_week === dow)
        : plan.diet_plan_meals;
    const todaysSlots = new Set(todaysMeals.map((m) => m.meal_slot));
    for (const slot of dueSlots) {
      if (todaysSlots.has(slot)) targets.push({ clientId: plan.client_id, slot });
    }
  }

  if (targets.length === 0) {
    return NextResponse.json({ ok: true, notified: 0, dueSlots });
  }

  // Ne rappelle jamais un repas déjà loggué aujourd'hui — le but est de
  // réduire l'oubli, pas de relancer quelqu'un qui a déjà mangé/logué.
  const clientIds = [...new Set(targets.map((t) => t.clientId))];
  const { data: logs } = await admin
    .from("food_logs")
    .select("client_id, meal_slot")
    .eq("logged_at", today)
    .in("client_id", clientIds);

  const alreadyLogged = new Set((logs ?? []).map((l) => `${l.client_id}:${l.meal_slot}`));

  let notified = 0;
  for (const { clientId, slot } of targets) {
    if (alreadyLogged.has(`${clientId}:${slot}`)) continue;
    const label = SLOT_LABELS[slot] ?? slot;
    const result = await sendPushToUser(
      clientId,
      `🍽️ C'est l'heure du ${label}`,
      "Ton repas est déjà prêt dans ton plan — un tap pour le valider.",
      `/dashboard/client/nutrition?meal=${slot}`
    );
    if (result.ok) notified++;
  }

  return NextResponse.json({ ok: true, notified, targeted: targets.length, dueSlots });
}
