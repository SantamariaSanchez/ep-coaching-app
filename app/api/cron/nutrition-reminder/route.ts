import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { sendPushToUser } from "@/lib/push";
import { todayInParis } from "@/lib/dates";

// Déclenché par Supabase pg_cron chaque jour à 20h00 (Europe/Paris).
// Envoie une notif "Bilan rapide" aux clients qui ont un objectif nutritionnel
// mais ont logué moins de 30% de leurs calories cibles aujourd'hui.
// → Réduit le fardeau mental : pas besoin de se souvenir de logger, l'appli
//   prévient au bon moment et propose le quiz 4-questions.
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const today = todayInParis();

  // Clients avec un objectif calorique défini
  const { data: profiles } = await supabase
    .from("nutrition_profiles")
    .select("client_id, calories_target")
    .gt("calories_target", 0);

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ ok: true, notified: 0 });
  }

  // Calories loggées aujourd'hui par client
  const clientIds = profiles.map((p) => p.client_id);
  const { data: logs } = await supabase
    .from("food_logs")
    .select("client_id, calories")
    .in("client_id", clientIds)
    .eq("logged_at", today);

  const calsByClient: Record<string, number> = {};
  for (const log of logs ?? []) {
    calsByClient[log.client_id] = (calsByClient[log.client_id] ?? 0) + (log.calories ?? 0);
  }

  let notified = 0;
  for (const profile of profiles) {
    const logged = calsByClient[profile.client_id] ?? 0;
    const target = profile.calories_target ?? 2000;

    // Envoie seulement si < 30% de l'objectif logué (= journée non trackée)
    if (logged / target < 0.30) {
      await sendPushToUser(
        profile.client_id,
        "⚡ Bilan nutrition du jour",
        "Trop la flemme de logger ? Choisis juste tes repas habituels, l'appli calcule tout.",
        "/dashboard/client/nutrition/bilan-rapide"
      ).catch(() => {});
      notified++;
    }
  }

  return NextResponse.json({ ok: true, notified, checked: profiles.length });
}
