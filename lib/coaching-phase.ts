import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import type { ProgramWithDays } from "@/utils/programs";

// Réexporte les types + generateCoachingPhaseSuggestions purs pour que tous
// les appelants existants (server components/actions) continuent d'importer
// depuis "@/lib/coaching-phase". Un Client Component, lui, doit importer
// directement depuis "@/lib/coaching-phase-helpers" — voir le commentaire en
// tête de ce fichier.
export * from "@/lib/coaching-phase-helpers";

import {
  generateCoachingPhaseSuggestions,
  type CoachingPhase,
  type CoachingPhaseState,
  type CoachingPhaseHistoryEntry,
  type AdherenceSignal,
} from "@/lib/coaching-phase-helpers";

// ── Lecture / écriture de la phase courante ─────────────────────────────────
// client_coaching_phases n'a AUCUNE policy RLS lisible par le client (voir
// la migration) : createServerSupabase() (session du coach connecté) suffit
// pour les lectures, is_own_coach() filtre déjà à la bonne portée.

export async function getClientCoachingPhase(clientId: string): Promise<CoachingPhaseState | null> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("client_coaching_phases")
      .select("phase, started_at")
      .eq("client_id", clientId)
      .is("ended_at", null)
      .maybeSingle();
    if (!data) return null;
    return { phase: data.phase as CoachingPhase, since: data.started_at as string };
  } catch {
    return null;
  }
}

export async function getCoachingPhaseHistory(clientId: string): Promise<CoachingPhaseHistoryEntry[]> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("client_coaching_phases")
      .select("id, phase, started_at, ended_at, note")
      .eq("client_id", clientId)
      .order("started_at", { ascending: false })
      .limit(10);
    return (data as CoachingPhaseHistoryEntry[]) ?? [];
  } catch {
    return [];
  }
}

// Déclenchée automatiquement quand un client devient coaché (abonnement
// actif) — voir setClientSubscriptionStatus dans
// app/dashboard/coach/clients/actions.ts. N'écrase jamais une phase déjà
// ouverte (idempotent), et sert aussi de "rattrapage" manuel pour un client
// déjà actif avant l'introduction de cette fonctionnalité (bouton "Démarrer
// le calibrage" affiché par CoachingPhasePanel quand aucune phase n'existe
// encore pour un client coaché).
export async function startCalibrationPhase(clientId: string, changedBy: string): Promise<void> {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("client_coaching_phases")
    .select("id")
    .eq("client_id", clientId)
    .is("ended_at", null)
    .maybeSingle();
  if (existing) return;

  await admin.from("client_coaching_phases").insert({
    client_id: clientId,
    phase: "calibrage",
    changed_by: changedBy,
    note: "Début du coaching, abonnement activé",
  });
}

// Déclenchée quand un client redevient gratuit/résilié — ferme la phase en
// cours sans en rouvrir une nouvelle (plus de coaching actif à suivre). Si
// le client redevient actif plus tard, startCalibrationPhase repart sur un
// calibrage neuf : mieux vaut re vérifier l'adhérence après une pause que
// supposer qu'elle a tenu pendant l'interruption.
export async function endCoachingPhaseTracking(clientId: string, changedBy: string): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("client_coaching_phases")
    .update({ ended_at: new Date().toISOString(), changed_by: changedBy })
    .eq("client_id", clientId)
    .is("ended_at", null);
}

// Transition manuelle déclenchée par le coach (bouton sur la fiche client) —
// le système suggère une transition, il ne la fait jamais tout seul.
export async function transitionCoachingPhase(
  clientId: string,
  changedBy: string,
  toPhase: CoachingPhase,
  note?: string | null
): Promise<{ error?: string }> {
  const admin = createAdminClient();

  await admin
    .from("client_coaching_phases")
    .update({ ended_at: new Date().toISOString(), changed_by: changedBy })
    .eq("client_id", clientId)
    .is("ended_at", null);

  const { error } = await admin.from("client_coaching_phases").insert({
    client_id: clientId,
    phase: toPhase,
    changed_by: changedBy,
    note: note?.trim() || null,
  });

  if (error) return { error: error.message };
  return {};
}

// ── Signaux d'adhérence (phase calibrage uniquement) ────────────────────────

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}
function isoDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

// Fenêtre d'analyse : les 14 derniers jours calendaires, sans jamais
// remonter avant le début du calibrage. Un client coaché depuis 3 jours n'a
// pas encore assez d'historique pour qu'on lui reproche quoi que ce soit —
// voir MIN_SIGNAL_DAYS ci-dessous.
const ADHERENCE_WINDOW_DAYS = 14;
// En dessous de 5 jours de calibrage, aucun signal n'est jugé : trop tôt
// pour distinguer "n'adhère pas" de "vient tout juste de commencer".
const MIN_SIGNAL_DAYS = 5;
// Séances : au moins 70% des séances attendues loguées — même ordre de
// grandeur que le seuil du moteur d'alertes existant (lib/coach-analytics.ts,
// "Séances insuffisantes" utilise 60% sur une fenêtre glissante hebdo ; ici
// on est légèrement plus strict car il s'agit d'établir une habitude neuve).
const SESSIONS_OK_RATIO = 0.7;
// Nutrition / bilan quotidien : au moins un jour sur deux rempli.
const LOGGING_OK_RATIO = 0.5;

function adherenceWindowStart(phaseSince: string): Date {
  const since = new Date(phaseSince);
  const cutoff = daysAgo(ADHERENCE_WINDOW_DAYS);
  return since > cutoff ? since : cutoff;
}

// Calcule les signaux d'adhérence en phase de calibrage à partir des
// données déjà loguées par le client — pas de nouvelle saisie demandée nulle
// part, tout provient de ce qui existe déjà (sessions, nutrition, bilan
// quotidien, check-in hebdo). Chaque signal est indépendant et explicable,
// volontairement pas fusionné en un score global unique.
export async function computeCalibrationSignals(
  clientId: string,
  phaseSince: string,
  program: Pick<ProgramWithDays, "frequency"> | null
): Promise<AdherenceSignal[]> {
  const supabase = await createServerSupabase();
  const windowStart = adherenceWindowStart(phaseSince);
  const windowStartStr = isoDate(windowStart);
  const windowDays = Math.max(1, Math.round((Date.now() - windowStart.getTime()) / (24 * 60 * 60 * 1000)));
  const windowWeeks = windowDays / 7;
  // Trop tôt pour juger : pas la peine d'interroger la base pour rien.
  if (windowDays < MIN_SIGNAL_DAYS) {
    const detail = `Calibrage commencé il y a ${windowDays} jour${windowDays !== 1 ? "s" : ""}, pas encore assez de recul.`;
    return [
      { id: "sessions", label: "Séances loguées", ok: null, detail },
      { id: "nutrition", label: "Nutrition loguée", ok: null, detail },
      { id: "bilan", label: "Bilan quotidien rempli", ok: null, detail },
      { id: "checkin", label: "Check-in hebdo soumis", ok: null, detail },
    ];
  }

  const [{ data: sessions }, { data: foodLogs }, { data: dailyLogs }, { data: checkins }] = await Promise.all([
    supabase
      .from("sessions")
      .select("id")
      .eq("client_id", clientId)
      .eq("is_completed", true)
      .gte("session_date", windowStartStr),
    supabase.from("food_logs").select("logged_at").eq("client_id", clientId).gte("logged_at", windowStartStr),
    supabase.from("daily_logs").select("log_date").eq("client_id", clientId).gte("log_date", windowStartStr),
    supabase.from("check_ins").select("week_start").eq("client_id", clientId).gte("week_start", windowStartStr),
  ]);

  const signals: AdherenceSignal[] = [];

  // ── Séances ──
  if (program?.frequency) {
    const expected = Math.max(1, Math.round(program.frequency * windowWeeks));
    const completed = sessions?.length ?? 0;
    signals.push({
      id: "sessions",
      label: "Séances loguées",
      ok: completed >= Math.ceil(expected * SESSIONS_OK_RATIO),
      detail: `${completed} séance${completed !== 1 ? "s" : ""} loguée${completed !== 1 ? "s" : ""} sur ${expected} attendue${expected !== 1 ? "s" : ""} (${windowDays} derniers jours)`,
    });
  } else {
    signals.push({
      id: "sessions",
      label: "Séances loguées",
      ok: null,
      detail: "Aucun programme actif avec fréquence renseignée, impossible de comparer.",
    });
  }

  // ── Nutrition ── (split("T")[0] défensif, même précaution que
  // lib/coach-analytics.ts pour logged_at qui a pu être un timestamp complet
  // sur d'anciennes lignes)
  const nutritionDays = new Set((foodLogs ?? []).map((l: { logged_at: string }) => l.logged_at.split("T")[0])).size;
  signals.push({
    id: "nutrition",
    label: "Nutrition loguée",
    ok: nutritionDays / windowDays >= LOGGING_OK_RATIO,
    detail: `${nutritionDays} jour${nutritionDays !== 1 ? "s" : ""} avec nutrition loguée sur ${windowDays}`,
  });

  // ── Bilan quotidien ──
  const bilanDays = new Set((dailyLogs ?? []).map((l: { log_date: string }) => l.log_date)).size;
  signals.push({
    id: "bilan",
    label: "Bilan quotidien rempli",
    ok: bilanDays / windowDays >= LOGGING_OK_RATIO,
    detail: `${bilanDays} jour${bilanDays !== 1 ? "s" : ""} de bilan rempli sur ${windowDays}`,
  });

  // ── Check-in hebdo ──
  const expectedCheckins = Math.max(1, Math.round(windowWeeks));
  const submittedCheckins = checkins?.length ?? 0;
  signals.push({
    id: "checkin",
    label: "Check-in hebdo soumis",
    ok: submittedCheckins >= expectedCheckins,
    detail: `${submittedCheckins} check-in${submittedCheckins !== 1 ? "s" : ""} soumis sur ${expectedCheckins} attendu${expectedCheckins !== 1 ? "s" : ""}`,
  });

  return signals;
}

// ── Vue d'ensemble pour la liste des clients ────────────────────────────────
// Permet au coach de repérer, sans ouvrir chaque fiche, qui décroche ou qui
// est prêt à changer de phase (voir ClientCard.alerts, jusqu'ici jamais
// alimenté). Les signaux détaillés (plus coûteux, plusieurs requêtes) ne
// sont recalculés que pour les clients actuellement en calibrage ; en
// optimisation/performance, seule la suggestion basée sur l'ancienneté de
// la phase s'applique (generateCoachingPhaseSuggestions avec signals=[]),
// aucune requête supplémentaire nécessaire.

export interface CoachingPhaseSummary {
  phase: CoachingPhaseState;
  suggestionCount: number;
  hasWarning: boolean;
}

export async function getCoachingPhaseOverview(
  clientIds: string[]
): Promise<Record<string, CoachingPhaseSummary>> {
  if (clientIds.length === 0) return {};
  try {
    const supabase = await createServerSupabase();
    const { data: phases } = await supabase
      .from("client_coaching_phases")
      .select("client_id, phase, started_at")
      .in("client_id", clientIds)
      .is("ended_at", null);

    if (!phases || phases.length === 0) return {};

    const result: Record<string, CoachingPhaseSummary> = {};

    await Promise.all(
      (phases as { client_id: string; phase: CoachingPhase; started_at: string }[]).map(async (row) => {
        const state: CoachingPhaseState = { phase: row.phase, since: row.started_at };
        let signals: AdherenceSignal[] = [];

        if (row.phase === "calibrage") {
          const { data: program } = await supabase
            .from("programs")
            .select("frequency")
            .eq("client_id", row.client_id)
            .eq("is_active", true)
            .maybeSingle();
          signals = await computeCalibrationSignals(row.client_id, row.started_at, program);
        }

        const suggestions = generateCoachingPhaseSuggestions(state, signals);
        result[row.client_id] = {
          phase: state,
          suggestionCount: suggestions.length,
          hasWarning: suggestions.some((sug) => sug.severity === "warning"),
        };
      })
    );

    return result;
  } catch {
    return {};
  }
}
