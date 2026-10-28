import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase-admin";
import { todayInParis } from "@/lib/dates";
import { addDaysIso, diffDaysIso } from "@/lib/roadmap-weeks";
import { parseEatingRelation } from "@/lib/eating-safety";
import {
  deriveTrackingProfile,
  isTrackingLevel,
  HISTORY_FLAGS,
  TRAINING_YEARS,
  type HistoryFlag,
  type TrackingInput,
  type TrackingProfile,
  type TrainingYears,
} from "@/lib/tracking-profile";

// Assemble tout ce que l'écosystème sait d'une personne (Mon appli, quiz,
// fiche d'onboarding, profil, engagement réel) et en tire son profil de
// tracking (lib/tracking-profile.ts). Lecture seule, ne lève jamais : la
// moindre erreur ou table manquante donne une entrée partielle, donc un
// profil Standard avec explication.

type Row = Record<string, unknown>;
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);
const arr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

function hasText(v: unknown): boolean {
  const s = typeof v === "string" ? v.trim().toLowerCase() : "";
  return s.length > 3 && !/^(aucun|aucune|rien|non|ras|néant|neant|pas de)\b/.test(s);
}

export async function loadTrackingInputs(userIds: string[]): Promise<Map<string, TrackingInput>> {
  const out = new Map<string, TrackingInput>();
  if (!userIds.length) return out;
  try {
    const admin = createAdminClient();
    const today = todayInParis();
    const since28 = addDaysIso(today, -27);
    const since14 = addDaysIso(today, -13);
    const [profiles, setups, prefs, intakes, logs] = await Promise.all([
      admin.from("profiles").select("id, coach_id, start_date, eating_relationship, target_bedtime, target_wake_time, competition_date, created_at").in("id", userIds),
      admin.from("user_app_setup").select("user_id, answers, modules, completed_at").in("user_id", userIds),
      admin.from("member_preferences").select("id, experience_level, primary_goal, training_frequency, tracks_nutrition, biggest_obstacle").in("id", userIds),
      admin.from("client_intake").select("client_id, gender, sessions_current, sessions_desired, injuries, wearable_device").in("client_id", userIds),
      admin.from("daily_logs").select("client_id, log_date").in("client_id", userIds).gte("log_date", since28).limit(userIds.length * 40),
    ]);
    const by = (res: { data: unknown }, key: string) => new Map(((res.data as Row[] | null) ?? []).map((r) => [String(r[key]), r]));
    const P = by(profiles, "id"), S = by(setups, "user_id"), M = by(prefs, "id"), I = by(intakes, "client_id");
    const days28 = new Map<string, Set<string>>();
    for (const r of (logs.data as Row[] | null) ?? []) {
      const id = String(r.client_id);
      (days28.get(id) ?? days28.set(id, new Set()).get(id)!).add(String(r.log_date));
    }
    for (const id of userIds) {
      const p = P.get(id), s = S.get(id), m = M.get(id), i = I.get(id);
      const answers = (s?.answers as Record<string, unknown> | undefined) ?? {};
      const modules = (s?.modules as Record<string, boolean> | undefined) ?? {};
      const practices = arr(answers.pratique);
      const history = arr(answers.historique).filter((h): h is HistoryFlag => (HISTORY_FLAGS as readonly string[]).includes(h));
      const yearsRaw = str(answers.annees);
      const startDate = str(p?.start_date) ?? str(p?.created_at)?.slice(0, 10) ?? null;
      const set = days28.get(id);
      const compDate = str(p?.competition_date);
      const weeksToComp = compDate ? Math.floor(diffDaysIso(today, compDate) / 7) : null;
      const level = answers.tracking_level;
      const by_ = answers.tracking_level_by;
      out.set(id, {
        gender: (i?.gender as TrackingInput["gender"]) ?? null,
        goal: (m?.primary_goal as TrackingInput["goal"]) ?? (practices.includes("perte_gras") ? "perte_poids" : practices.includes("musculation") ? "prise_muscle" : null),
        experience: (m?.experience_level as TrackingInput["experience"]) ?? null,
        practices,
        history,
        years: yearsRaw && (TRAINING_YEARS as readonly string[]).includes(yearsRaw) ? (yearsRaw as TrainingYears) : null,
        sessionsPerWeek: typeof i?.sessions_current === "number" ? (i.sessions_current as number) : null,
        trainingFrequency: (m?.training_frequency as TrackingInput["trainingFrequency"]) ?? null,
        tracksNutrition: (m?.tracks_nutrition as TrackingInput["tracksNutrition"]) ?? null,
        obstacle: (m?.biggest_obstacle as TrackingInput["obstacle"]) ?? null,
        hasInjury: hasText(i?.injuries),
        eatingRelation: parseEatingRelation(p?.eating_relationship ?? null),
        hasWearable: hasText(i?.wearable_device),
        weighDisabled: modules.poids === false,
        cycleOptIn: modules.cycle === true,
        competitionPrep: modules.competition === true || practices.includes("bodybuilding_compet") || (weeksToComp != null && weeksToComp >= 0 && weeksToComp <= 26),
        weeksToCompetition: weeksToComp != null && weeksToComp >= 0 ? weeksToComp : null,
        coached: !!p?.coach_id && p.coach_id !== id,
        weeksSinceStart: startDate ? Math.max(0, Math.floor(diffDaysIso(startDate, today) / 7)) : null,
        bilanDays14: set ? [...set].filter((d) => d >= since14).length : 0,
        bilanDays28: set ? set.size : 0,
        wakeTime: str(p?.target_wake_time)?.slice(0, 5) ?? null,
        bedTime: str(p?.target_bedtime)?.slice(0, 5) ?? null,
        override: isTrackingLevel(level) ? { level, by: by_ === "coach" ? "coach" : "client" } : null,
      });
    }
  } catch (e) {
    console.error("loadTrackingInputs:", e);
  }
  return out;
}

/** Profil de tracking d'une personne (mis en cache le temps de la requête). */
export const getTrackingProfile = cache(async function getTrackingProfile(userId: string): Promise<TrackingProfile> {
  const inputs = await loadTrackingInputs([userId]);
  return deriveTrackingProfile(inputs.get(userId) ?? {});
});

export async function getTrackingProfiles(userIds: string[]): Promise<Map<string, TrackingProfile>> {
  const inputs = await loadTrackingInputs(userIds);
  return new Map(userIds.map((id) => [id, deriveTrackingProfile(inputs.get(id) ?? {})]));
}
