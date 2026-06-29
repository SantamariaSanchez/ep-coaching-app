// Pure rule engine — no supabase/server imports, easy to unit-test and safe
// to import from client components too. Each rule looks at the latest log
// plus recent history and decides whether a concrete, actionable insight is
// warranted. This is intentionally conservative: it only fires when there's
// real data to back the suggestion, never just to "say something".

export interface BiometricLogInput {
  log_date: string;
  sleep_hours: number | null;
  readiness_score: number | null;
  hrv_ms: number | null;
  resting_hr: number | null;
}

export type InsightSeverity = "info" | "warning" | "critical";

export interface GeneratedInsight {
  type: string;
  severity: InsightSeverity;
  message: string;
  suggestion: string;
}

function avg(values: number[]): number | null {
  const valid = values.filter((v) => v != null && !Number.isNaN(v));
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

// `logsAsc` = history sorted oldest → newest, last item is "today".
export function generateInsightsForLatest(logsAsc: BiometricLogInput[]): GeneratedInsight[] {
  if (logsAsc.length === 0) return [];
  const today = logsAsc[logsAsc.length - 1];
  const previous = logsAsc.slice(0, -1);
  const last7 = previous.slice(-7);
  const insights: GeneratedInsight[] = [];

  // ── 1. Sommeil insuffisant répété (≥3 des 4 derniers jours < 6h) ──
  const last4 = [...previous.slice(-3), today];
  const shortNights = last4.filter((l) => l.sleep_hours != null && l.sleep_hours < 6).length;
  if (shortNights >= 3) {
    insights.push({
      type: "sleep_debt",
      severity: "warning",
      message: `Dette de sommeil : ${shortNights} nuits à moins de 6h sur les 4 derniers jours.`,
      suggestion: "Réduis le volume d'entraînement de 10-20% cette semaine et priorise le sommeil avant tout — la récupération ne suivra pas sinon.",
    });
  }

  // ── 2. Récupération basse 2 jours consécutifs ──
  const yesterday = previous[previous.length - 1];
  if (
    today.readiness_score != null && today.readiness_score < 60 &&
    yesterday?.readiness_score != null && yesterday.readiness_score < 60
  ) {
    insights.push({
      type: "low_readiness_streak",
      severity: "warning",
      message: `Score de récupération bas 2 jours de suite (${yesterday.readiness_score} puis ${today.readiness_score}).`,
      suggestion: "Évite les séances à forte intensité aujourd'hui — privilégie une séance légère, de la mobilité, ou un jour de repos actif.",
    });
  }

  // ── 3. HRV en baisse significative vs moyenne 7 jours ──
  const avgHrv7 = avg(last7.map((l) => l.hrv_ms).filter((v): v is number => v != null));
  if (today.hrv_ms != null && avgHrv7 != null && today.hrv_ms < avgHrv7 * 0.8) {
    insights.push({
      type: "hrv_drop",
      severity: "warning",
      message: `HRV à ${today.hrv_ms}ms, soit ${Math.round((1 - today.hrv_ms / avgHrv7) * 100)}% en dessous de ta moyenne 7 jours (${Math.round(avgHrv7)}ms).`,
      suggestion: "Signe de fatigue accumulée sur le système nerveux — réduis l'intensité ou ajoute un jour de repos supplémentaire cette semaine.",
    });
  }

  // ── 4. FC repos élevée vs moyenne 7 jours ──
  const avgRhr7 = avg(last7.map((l) => l.resting_hr).filter((v): v is number => v != null));
  if (today.resting_hr != null && avgRhr7 != null && today.resting_hr > avgRhr7 + 5) {
    insights.push({
      type: "resting_hr_elevated",
      severity: "info",
      message: `FC au repos à ${today.resting_hr}bpm, ${Math.round(today.resting_hr - avgRhr7)}bpm au-dessus de ta moyenne 7 jours.`,
      suggestion: "Surveille ton hydratation et ton sommeil ce soir — une FC repos élevée précède souvent un surmenage ou un début de maladie.",
    });
  }

  // ── 5. Tout est vert — bon jour pour pousser ──
  if (
    today.readiness_score != null && today.readiness_score >= 85 &&
    today.sleep_hours != null && today.sleep_hours >= 7.5 &&
    insights.length === 0
  ) {
    insights.push({
      type: "green_light",
      severity: "info",
      message: `Récupération excellente (score ${today.readiness_score}, ${today.sleep_hours}h de sommeil).`,
      suggestion: "Ton corps est prêt — c'est le bon jour pour viser une séance plus intense ou tenter un nouveau record.",
    });
  }

  return insights;
}
