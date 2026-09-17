import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { sendPushToUser } from "@/lib/push";
import { insertNotification } from "@/utils/insert-notification";
import { MEAL_SLOT_TIMES as DEFAULT_SLOT_TIMES, MEAL_SLOT_LABELS as SLOT_LABELS, timeToMinutes, parisNow as parisNowBase } from "@/lib/meal-slots";
import { todayInParis } from "@/lib/dates";

// Rappel automatique à l'heure habituelle de chaque repas — zéro
// configuration : des horaires usuels par créneau (pas par client), voir
// lib/meal-slots.ts (partagé avec le verrou de repas obligatoire, voir
// lib/daily-gate.ts — les deux doivent utiliser exactement les mêmes
// horaires/labels). Le but explicite est de réduire la friction au
// minimum : le client tape sur la notif et atterrit directement sur le
// repas déjà prévu par son coach (aliments + quantités), prêt à valider en
// un tap — voir handleTogglePlanItem/DietPlanCard dans ClientNutritionView.
// Décalage Paris géré dynamiquement via Intl (fuseau IANA), pas un offset
// UTC figé dans le cron comme les autres jobs horaires de l'appli : celui-ci
// tourne en continu toute la journée (*/20 depuis le 2026-09-17, chantier
// egress Supabase, voir MASTERCLASS.md — passé de */15 à */20 pour réduire
// le nombre d'appels 24/7 alors qu'il n'y a aujourd'hui aucun client payant
// actif ; un simple décalage fixe dériverait au changement d'heure d'été/hiver).
function parisNow(): { minutes: number; today: string; dow: string } {
  const { minutes, dow } = parisNowBase();
  return { minutes, today: todayInParis(), dow };
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

  // Créneaux dus dans les 20 prochaines minutes — largeur de fenêtre alignée
  // sur le pas du cron (*/20) : comme les ticks du cron forment une suite
  // périodique de période 20 min, une fenêtre de largeur 20 min contient
  // toujours exactement un tick, quel que soit l'horaire exact du créneau
  // (pas besoin que le créneau tombe sur un multiple de 20). Chaque créneau
  // n'est donc touché que par un seul passage du cron par jour, jamais deux.
  const dueSlots = Object.entries(DEFAULT_SLOT_TIMES)
    .filter(([, t]) => {
      const target = timeToMinutes(t);
      return nowMinutes >= target && nowMinutes < target + 20;
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
    const title = `🍽️ C'est l'heure du ${label}`;
    const body = "Ton repas est déjà prêt dans ton plan, un tap pour le valider.";
    const url = `/dashboard/client/nutrition?meal=${slot}`;

    // Cloche in-app en plus du push (même défaut que schedule-block-notify/
    // nutrition-reminder) : chaque créneau n'est dû qu'une fois par jour ici
    // (fenêtre alignée sur le pas du cron, plus haut), donc aucun risque de
    // dupliquer la ligne.
    await insertNotification({ userId: clientId, type: "meal_reminder", title, body, url }).catch(() => {});

    const result = await sendPushToUser(clientId, title, body, url);
    if (result.ok) notified++;
  }

  return NextResponse.json({ ok: true, notified, targeted: targets.length, dueSlots });
}
