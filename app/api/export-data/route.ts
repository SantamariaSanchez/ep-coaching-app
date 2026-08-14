import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";
import { enforceRateLimit, PRESETS } from "@/lib/rate-limit";

// Item 48 (chantier 50 idées) : export complet des données personnelles,
// pour n'importe quel utilisateur connecté (client ou coach), sur SES
// PROPRES données uniquement — guard.userId partout, jamais de paramètre
// d'id externe. Couvre les catégories principales (pas littéralement
// chaque table du schéma) : profil, fiche client, mensurations, bilans,
// séances/entraînement, nutrition, journal mental, cycle, historique
// d'abonnement, points. Chemins de stockage bruts pour les photos (pas
// d'URLs signées générées ici) — suffisant pour un export de données, pas
// pour visionner les fichiers directement.
export async function GET() {
  const guard = await requireAuth();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: 403 });

  const limited = await enforceRateLimit(
    `export-data:${guard.userId}`,
    PRESETS.expensiveRead.limit,
    PRESETS.expensiveRead.windowSeconds
  );
  if (limited) return limited;

  const admin = createAdminClient();
  const userId = guard.userId;

  const [
    profile,
    intake,
    measurements,
    checkins,
    sessions,
    workoutLogs,
    foodLogs,
    dailyLogs,
    nutritionProfile,
    personalRecords,
    photoUpdates,
    journalEntries,
    periodLogs,
    subscriptionEvents,
    gamificationPoints,
  ] = await Promise.all([
    admin.from("profiles").select("*").eq("id", userId).maybeSingle(),
    admin.from("client_intake").select("*").eq("client_id", userId).maybeSingle(),
    admin.from("measurements").select("*").eq("client_id", userId),
    admin.from("check_ins").select("*").eq("client_id", userId),
    admin.from("sessions").select("*").eq("client_id", userId),
    admin.from("workout_logs").select("*").eq("client_id", userId),
    admin.from("food_logs").select("*").eq("client_id", userId),
    admin.from("daily_logs").select("*").eq("client_id", userId),
    admin.from("nutrition_profiles").select("*").eq("client_id", userId).maybeSingle(),
    admin.from("personal_records").select("*").eq("client_id", userId),
    admin.from("photo_updates").select("*").eq("client_id", userId),
    admin.from("mindset_journal_entries").select("*").eq("client_id", userId),
    admin.from("period_logs").select("*").eq("client_id", userId),
    admin.from("subscription_events").select("*").eq("client_id", userId),
    admin.from("gamification_points").select("*").eq("client_id", userId),
  ]);

  const payload = {
    generated_at: new Date().toISOString(),
    profile: profile.data ?? null,
    client_intake: intake.data ?? null,
    measurements: measurements.data ?? [],
    check_ins: checkins.data ?? [],
    sessions: sessions.data ?? [],
    workout_logs: workoutLogs.data ?? [],
    food_logs: foodLogs.data ?? [],
    daily_logs: dailyLogs.data ?? [],
    nutrition_profile: nutritionProfile.data ?? null,
    personal_records: personalRecords.data ?? [],
    photo_updates: photoUpdates.data ?? [],
    mindset_journal_entries: journalEntries.data ?? [],
    period_logs: periodLogs.data ?? [],
    subscription_events: subscriptionEvents.data ?? [],
    gamification_points: gamificationPoints.data ?? [],
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="ep-coaching-mes-donnees.json"`,
    },
  });
}
