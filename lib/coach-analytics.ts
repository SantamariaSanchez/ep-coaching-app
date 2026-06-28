import { createAdminClient } from "@/lib/supabase-admin";

// ── Types ─────────────────────────────────────────────────────────────────────

export type AlertSeverity = "high" | "medium" | "low";

export interface ClientAlert {
  type: string;
  severity: AlertSeverity;
  label: string;
  suggestion: string;
  icon: string;
}

export interface ClientHighlight {
  type: string;
  label: string;
  detail?: string;
  icon: string;
}

export interface ClientAnalytics {
  id: string;
  full_name: string | null;
  status: string;
  competition_date: string | null;
  competition_category: string | null;
  alerts: ClientAlert[];
  highlights: ClientHighlight[];
  // Summary stats for the table
  weightVar21d: number | null;
  nutritionAdherence7d: number | null;
  sessionsThisWeek: number;
  lastActivity: string | null;
}

export interface CoachDashboardData {
  clients: ClientAnalytics[];
  totalAlerts: number;
  criticalAlerts: number;
  avgAdherence: number;
  prThisWeek: number;
  activeCount: number;
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}
function isoDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

// ── Per-client alert analysis ─────────────────────────────────────────────────

export async function getClientAlerts(clientId: string): Promise<ClientAlert[]> {
  const supabase = createAdminClient();
  const alerts: ClientAlert[] = [];

  const now = new Date();
  const d7 = daysAgo(7);
  const d21 = daysAgo(21);
  const d3 = daysAgo(3);

  // ── 1. Check-in manquant depuis 7+ jours ─────────────────────────────────
  const { data: lastCheckin } = await supabase
    .from("check_ins")
    .select("week_start")
    .eq("client_id", clientId)
    .order("week_start", { ascending: false })
    .limit(1)
    .maybeSingle();

  const lastCheckinDate = lastCheckin?.week_start
    ? new Date(lastCheckin.week_start + "T12:00:00")
    : null;
  if (!lastCheckinDate || lastCheckinDate < d7) {
    alerts.push({
      type: "checkin_missing",
      severity: "high",
      label: "Aucun check-in depuis 7+ jours",
      suggestion: "Envoie un message de rappel au client",
      icon: "AlertTriangle",
    });
  }

  // ── 2. Poids stagné sur 21 jours ──────────────────────────────────────────
  const { data: weightData } = await supabase
    .from("check_ins")
    .select("weight, week_start")
    .eq("client_id", clientId)
    .gte("week_start", isoDate(d21))
    .not("weight", "is", null)
    .order("week_start", { ascending: true });

  if (weightData && weightData.length >= 3) {
    const weights = (weightData as { weight: number }[]).map((d) => d.weight);
    const variation = Math.abs(weights[weights.length - 1] - weights[0]);
    if (variation < 0.3) {
      alerts.push({
        type: "weight_stagnation",
        severity: "medium",
        label: "Poids stagné depuis 3 semaines (variation < 300g)",
        suggestion: "Ajuste les calories ou vérifie l'adhésion nutrition",
        icon: "Minus",
      });
    }
  }

  // ── 3. Adhésion nutrition < 70% sur les 3 derniers jours ─────────────────
  const { data: recentLogs } = await supabase
    .from("food_logs")
    .select("logged_at, calories")
    .eq("client_id", clientId)
    .gte("logged_at", isoDate(d3));

  const loggedDays = new Set(
    (recentLogs ?? []).map((l: { logged_at: string }) =>
      l.logged_at.split("T")[0]
    )
  ).size;

  if (loggedDays < 2) {
    alerts.push({
      type: "nutrition_adherence",
      severity: "high",
      label: "Nutrition non loggée depuis 2+ jours",
      suggestion: "Vérifie si le client a des difficultés avec son plan",
      icon: "Apple",
    });
  }

  // ── 4. Calories trop basses vs objectif (<80%) sur 3 derniers jours ──────
  const { data: nutritionProfile } = await supabase
    .from("nutrition_profiles")
    .select("calories_target")
    .eq("client_id", clientId)
    .maybeSingle();

  if (
    nutritionProfile?.calories_target &&
    recentLogs &&
    recentLogs.length > 0 &&
    loggedDays >= 2
  ) {
    const totalCals = (recentLogs as { calories: number | null }[]).reduce(
      (sum, l) => sum + (l.calories ?? 0),
      0
    );
    const avgCalories = totalCals / loggedDays;
    const ratio = avgCalories / nutritionProfile.calories_target;
    if (ratio < 0.8) {
      alerts.push({
        type: "calories_low",
        severity: "medium",
        label: `Calories moyennes trop basses (${Math.round(ratio * 100)}% de l'objectif)`,
        suggestion:
          "Vérifier si le déficit est trop agressif ou si le client sous-logue",
        icon: "Flame",
      });
    }
  }

  // ── 5. Séances manquées sur 7 jours ──────────────────────────────────────
  const { data: sessions } = await supabase
    .from("sessions")
    .select("is_completed")
    .eq("client_id", clientId)
    .gte("session_date", isoDate(d7));

  const { data: program } = await supabase
    .from("programs")
    .select("frequency")
    .eq("client_id", clientId)
    .eq("is_active", true)
    .maybeSingle();

  if (program?.frequency && sessions) {
    const completed = (sessions as { is_completed: boolean }[]).filter(
      (s) => s.is_completed
    ).length;
    const expected = program.frequency;
    if (completed < expected * 0.6) {
      alerts.push({
        type: "training_missed",
        severity: "medium",
        label: `Séances insuffisantes (${completed}/${expected} cette semaine)`,
        suggestion: "Identifier les obstacles à l'entraînement",
        icon: "Dumbbell",
      });
    }
  }

  // ── 6. Score technique < 3 en moyenne sur 7 jours ────────────────────────
  const { data: recentSessionIds } = await supabase
    .from("sessions")
    .select("id")
    .eq("client_id", clientId)
    .gte("session_date", isoDate(d7));

  if (recentSessionIds && recentSessionIds.length > 0) {
    const ids = (recentSessionIds as { id: string }[]).map((s) => s.id);
    const { data: sets } = await supabase
      .from("session_sets")
      .select("standardization_score")
      .in("session_id", ids)
      .not("standardization_score", "is", null);

    if (sets && sets.length >= 3) {
      const avgScore =
        (sets as { standardization_score: number }[]).reduce(
          (sum, s) => sum + s.standardization_score,
          0
        ) / sets.length;
      if (avgScore < 3) {
        alerts.push({
          type: "technique_low",
          severity: "medium",
          label: `Score technique moyen faible (${avgScore.toFixed(1)}/5)`,
          suggestion: "Revoir les cues d'exécution avec le client",
          icon: "AlertCircle",
        });
      }
    }
  }

  // ── 7. Récupération insuffisante sur 7 jours ─────────────────────────────
  const { data: recoveryData } = await supabase
    .from("check_ins")
    .select("hrv, sleep_hours")
    .eq("client_id", clientId)
    .gte("week_start", isoDate(d7))
    .not("sleep_hours", "is", null);

  if (recoveryData && recoveryData.length > 0) {
    const rows = recoveryData as { hrv: number | null; sleep_hours: number | null }[];
    const avgSleep =
      rows.reduce((s, d) => s + (d.sleep_hours ?? 0), 0) / rows.length;
    const hrvRows = rows.filter((r) => r.hrv != null);
    const avgHrv =
      hrvRows.length > 0
        ? hrvRows.reduce((s, d) => s + (d.hrv ?? 0), 0) / hrvRows.length
        : null;
    if (avgSleep < 6.5 || (avgHrv != null && avgHrv < 50)) {
      alerts.push({
        type: "recovery_poor",
        severity: "high",
        label: `Récupération insuffisante (sommeil: ${avgSleep.toFixed(1)}h${avgHrv != null ? `, HRV: ${Math.round(avgHrv)}ms` : ""})`,
        suggestion: "Réduire le volume ou ajouter un jour de repos",
        icon: "Moon",
      });
    }
  }

  // ── 8. Bilan coach non envoyé depuis 7+ jours ────────────────────────────
  const { data: lastBilan } = await supabase
    .from("check_ins")
    .select("bilan_sent_at")
    .eq("client_id", clientId)
    .not("bilan_sent_at", "is", null)
    .order("bilan_sent_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const lastBilanDate = lastBilan?.bilan_sent_at
    ? new Date(lastBilan.bilan_sent_at)
    : null;
  if (!lastBilanDate || lastBilanDate < d7) {
    alerts.push({
      type: "bilan_missing",
      severity: "low",
      label: "Aucun bilan coach envoyé cette semaine",
      suggestion: "Envoie un retour hebdomadaire au client",
      icon: "FileText",
    });
  }

  return alerts;
}

// ── Per-client highlights ─────────────────────────────────────────────────────

export async function getClientHighlights(
  clientId: string
): Promise<ClientHighlight[]> {
  const supabase = createAdminClient();
  const highlights: ClientHighlight[] = [];

  const d7 = daysAgo(7);
  const d21 = daysAgo(21);

  // ── 1. PR récents ────────────────────────────────────────────────────────
  const { data: recentPRs } = await supabase
    .from("personal_records")
    .select("exercise_name, weight_kg, reps, achieved_at")
    .eq("client_id", clientId)
    .gte("achieved_at", isoDate(d7))
    .order("achieved_at", { ascending: false });

  if (recentPRs && recentPRs.length > 0) {
    const prs = recentPRs as {
      exercise_name: string;
      weight_kg: number;
      reps: number | null;
    }[];
    highlights.push({
      type: "new_pr",
      label: `${prs.length} PR cette semaine`,
      detail: prs.map((pr) => `${pr.exercise_name} — ${pr.weight_kg}kg`).join(", "),
      icon: "Trophy",
    });
  }

  // ── 2. Adhésion nutrition ≥ 6/7 jours ────────────────────────────────────
  const { data: goodLogs } = await supabase
    .from("food_logs")
    .select("logged_at")
    .eq("client_id", clientId)
    .gte("logged_at", isoDate(d7));

  const loggedDays = new Set(
    (goodLogs ?? []).map((l: { logged_at: string }) => l.logged_at.split("T")[0])
  ).size;
  if (loggedDays >= 6) {
    highlights.push({
      type: "nutrition_excellent",
      label: `Excellente adhésion nutrition (${loggedDays}/7 jours)`,
      icon: "CheckCircle",
    });
  }

  // ── 3. Progression de poids sur 21 jours ─────────────────────────────────
  const { data: weightData } = await supabase
    .from("check_ins")
    .select("weight, week_start")
    .eq("client_id", clientId)
    .gte("week_start", isoDate(d21))
    .not("weight", "is", null)
    .order("week_start", { ascending: true });

  if (weightData && weightData.length >= 3) {
    const ws = (weightData as { weight: number }[]).map((d) => d.weight);
    const variation = ws[ws.length - 1] - ws[0];
    if (Math.abs(variation) > 0.5) {
      highlights.push({
        type: "weight_progress",
        label: `Poids en mouvement sur 21j (${variation > 0 ? "+" : ""}${variation.toFixed(1)} kg)`,
        icon: "TrendingUp",
      });
    }
  }

  // ── 4. Fréquence entraînement parfaite ────────────────────────────────────
  const { data: sessions } = await supabase
    .from("sessions")
    .select("id")
    .eq("client_id", clientId)
    .gte("session_date", isoDate(d7))
    .eq("is_completed", true);

  const { data: program } = await supabase
    .from("programs")
    .select("frequency")
    .eq("client_id", clientId)
    .eq("is_active", true)
    .maybeSingle();

  if (program?.frequency && sessions && sessions.length >= program.frequency) {
    highlights.push({
      type: "training_perfect",
      label: `Fréquence d'entraînement respectée (${sessions.length}/${program.frequency} séances)`,
      icon: "Zap",
    });
  }

  // ── 5. Score technique excellent ─────────────────────────────────────────
  const { data: sessionIds } = await supabase
    .from("sessions")
    .select("id")
    .eq("client_id", clientId)
    .gte("session_date", isoDate(d7));

  if (sessionIds && sessionIds.length > 0) {
    const ids = (sessionIds as { id: string }[]).map((s) => s.id);
    const { data: sets } = await supabase
      .from("session_sets")
      .select("standardization_score")
      .in("session_id", ids)
      .not("standardization_score", "is", null);

    if (sets && sets.length >= 3) {
      const avg =
        (sets as { standardization_score: number }[]).reduce(
          (s, x) => s + x.standardization_score,
          0
        ) / sets.length;
      if (avg >= 4) {
        highlights.push({
          type: "technique_excellent",
          label: `Excellente technique (score ${avg.toFixed(1)}/5 en moyenne)`,
          icon: "Star",
        });
      }
    }
  }

  return highlights;
}

// ── Summary stats for the overview table ─────────────────────────────────────

async function getClientSummaryStats(clientId: string) {
  const supabase = createAdminClient();
  const d7 = daysAgo(7);
  const d21 = daysAgo(21);

  const [weightData, logData, sessionData, lastActivityData] =
    await Promise.all([
      supabase
        .from("check_ins")
        .select("weight, week_start")
        .eq("client_id", clientId)
        .gte("week_start", isoDate(d21))
        .not("weight", "is", null)
        .order("week_start", { ascending: true }),

      supabase
        .from("food_logs")
        .select("logged_at")
        .eq("client_id", clientId)
        .gte("logged_at", isoDate(d7)),

      supabase
        .from("sessions")
        .select("session_date")
        .eq("client_id", clientId)
        .gte("session_date", isoDate(d7))
        .eq("is_completed", true),

      supabase
        .from("check_ins")
        .select("week_start")
        .eq("client_id", clientId)
        .order("week_start", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  // Weight variation 21d
  const weights = (weightData.data ?? []) as { weight: number }[];
  const weightVar21d =
    weights.length >= 2
      ? parseFloat(
          (weights[weights.length - 1].weight - weights[0].weight).toFixed(1)
        )
      : null;

  // Nutrition adherence 7d (% of days with logs)
  const loggedDays = new Set(
    (logData.data ?? []).map((l: { logged_at: string }) =>
      l.logged_at.split("T")[0]
    )
  ).size;
  const nutritionAdherence7d = Math.round((loggedDays / 7) * 100);

  // Sessions this week
  const sessionsThisWeek = (sessionData.data ?? []).length;

  // Last activity
  const lastActivity =
    (lastActivityData.data as { week_start: string } | null)?.week_start ??
    null;

  return { weightVar21d, nutritionAdherence7d, sessionsThisWeek, lastActivity };
}

// ── Full dashboard data ───────────────────────────────────────────────────────

export async function getCoachDashboardData(): Promise<CoachDashboardData> {
  const supabase = createAdminClient();
  const d7 = daysAgo(7);

  const { data: clients } = await supabase
    .from("profiles")
    .select(
      "id, full_name, status, competition_date, competition_category"
    )
    .eq("role", "client")
    .eq("status", "active")
    // Only paying coaching clients are tracked here — free community members
    // have no program/check-ins/nutrition plan set by a coach, so scanning
    // them for "missed check-in" / "nutrition not logged" alerts produces
    // false positives for people who were never meant to be monitored.
    .eq("subscription_status", "active");

  if (!clients || clients.length === 0) {
    return {
      clients: [],
      totalAlerts: 0,
      criticalAlerts: 0,
      avgAdherence: 0,
      prThisWeek: 0,
      activeCount: 0,
    };
  }

  // Process all clients in parallel (alerts + highlights + summary)
  const clientsWithData: ClientAnalytics[] = await Promise.all(
    (
      clients as {
        id: string;
        full_name: string | null;
        status: string;
        competition_date: string | null;
        competition_category: string | null;
      }[]
    ).map(async (client) => {
      const [alerts, highlights, summary] = await Promise.all([
        getClientAlerts(client.id),
        getClientHighlights(client.id),
        getClientSummaryStats(client.id),
      ]);
      return {
        ...client,
        alerts,
        highlights,
        ...summary,
      };
    })
  );

  // Sort by alert count descending
  clientsWithData.sort((a, b) => b.alerts.length - a.alerts.length);

  // Global stats
  const totalAlerts = clientsWithData.reduce(
    (sum, c) => sum + c.alerts.length,
    0
  );
  const criticalAlerts = clientsWithData.reduce(
    (sum, c) => sum + c.alerts.filter((a) => a.severity === "high").length,
    0
  );
  const avgAdherence =
    clientsWithData.length > 0
      ? Math.round(
          clientsWithData.reduce(
            (sum, c) => sum + (c.nutritionAdherence7d ?? 0),
            0
          ) / clientsWithData.length
        )
      : 0;

  // PRs this week across all clients
  const { count: prThisWeek } = await supabase
    .from("personal_records")
    .select("id", { count: "exact", head: true })
    .gte("achieved_at", isoDate(d7));

  return {
    clients: clientsWithData,
    totalAlerts,
    criticalAlerts,
    avgAdherence,
    prThisWeek: prThisWeek ?? 0,
    activeCount: clients.length,
  };
}

// ── Lightweight: top N urgent alerts (for homepage) ──────────────────────────

export interface TopAlert {
  clientId: string;
  clientName: string | null;
  alert: ClientAlert;
}

export async function getTopUrgentAlerts(limit = 3): Promise<TopAlert[]> {
  const supabase = createAdminClient();
  const { data: clients } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "client")
    .eq("status", "active")
    .eq("subscription_status", "active");

  if (!clients || clients.length === 0) return [];

  const allAlerts: TopAlert[] = [];
  await Promise.all(
    (clients as { id: string; full_name: string | null }[]).map(async (c) => {
      const alerts = await getClientAlerts(c.id);
      for (const alert of alerts) {
        allAlerts.push({ clientId: c.id, clientName: c.full_name, alert });
      }
    })
  );

  // Sort: high → medium → low, then take top N
  const order: AlertSeverity[] = ["high", "medium", "low"];
  allAlerts.sort(
    (a, b) =>
      order.indexOf(a.alert.severity) - order.indexOf(b.alert.severity)
  );

  return allAlerts.slice(0, limit);
}
