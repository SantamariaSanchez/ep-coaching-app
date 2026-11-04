import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase-admin";
import { fetchOuraSleepForDate, fetchOuraSleepScore, isOuraConfigured, refreshOuraToken } from "@/lib/oura";

// Le sommeil du bilan vient de la bague : durée, qualité (score de sommeil
// Oura), heures de coucher et de lever, VFC, FC de repos. Rien n'est écrasé
// s'il y a déjà une valeur dans le bilan du jour (une saisie manuelle gagne).

type DailyLogSleep = {
  sleep_hours: number | null;
  sleep_rating: number | null;
  bedtime_actual: string | null;
  wake_time_actual: string | null;
  hrv: number | null;
  resting_hr: number | null;
};

/** Valeurs à écrire : uniquement les champs encore vides dans le bilan. */
export function fillEmptySleepFields(
  existing: Partial<DailyLogSleep> | null,
  oura: { hours: number | null; score: number | null; bedtime: string | null; wake: string | null; hrv: number | null; hr: number | null }
): Partial<DailyLogSleep> {
  const out: Partial<DailyLogSleep> = {};
  if (existing?.sleep_hours == null && oura.hours != null) out.sleep_hours = oura.hours;
  if (existing?.sleep_rating == null && oura.score != null) out.sleep_rating = oura.score;
  if (existing?.bedtime_actual == null && oura.bedtime) out.bedtime_actual = oura.bedtime;
  if (existing?.wake_time_actual == null && oura.wake) out.wake_time_actual = oura.wake;
  if (existing?.hrv == null && oura.hrv != null) out.hrv = Math.round(oura.hrv);
  if (existing?.resting_hr == null && oura.hr != null) out.resting_hr = Math.round(oura.hr);
  return out;
}

/** Récupère la nuit Oura d'une date et la range dans le bilan (champs vides seulement). */
export async function syncOuraNightToDailyLog(admin: SupabaseClient, clientId: string, accessToken: string, date: string): Promise<boolean> {
  const [sleep, score] = await Promise.all([fetchOuraSleepForDate(accessToken, date), fetchOuraSleepScore(accessToken, date)]);
  if (!sleep && score == null) return false;
  const { data: existing } = await admin
    .from("daily_logs")
    .select("sleep_hours, sleep_rating, bedtime_actual, wake_time_actual, hrv, resting_hr")
    .eq("client_id", clientId)
    .eq("log_date", date)
    .maybeSingle();
  const patch = fillEmptySleepFields(existing as Partial<DailyLogSleep> | null, {
    hours: sleep?.total_sleep_duration_seconds != null ? Math.round((sleep.total_sleep_duration_seconds / 3600) * 100) / 100 : null,
    score,
    bedtime: sleep?.bedtime ?? null,
    wake: sleep?.wake_time ?? null,
    hrv: sleep?.average_hrv ?? null,
    hr: sleep?.lowest_heart_rate ?? null,
  });
  if (Object.keys(patch).length === 0) return false;
  const { error } = await admin
    .from("daily_logs")
    .upsert({ client_id: clientId, log_date: date, updated_at: new Date().toISOString(), ...patch }, { onConflict: "client_id,log_date" });
  return !error;
}

const FRESH_MS = 20 * 60 * 1000;

/**
 * À l'ouverture du bilan : si la bague est connectée et que la dernière synchro
 * date de plus de 20 minutes, on récupère la nuit tout de suite (sans attendre
 * le passage quotidien). Silencieux : une panne Oura ne doit jamais bloquer le bilan.
 */
export async function ensureOuraNightSynced(clientId: string, date: string): Promise<void> {
  if (!isOuraConfigured()) return;
  try {
    const admin = createAdminClient();
    const { data: conn } = await admin.from("oura_connections").select("*").eq("client_id", clientId).maybeSingle();
    if (!conn) return;
    if (conn.last_synced_at && Date.now() - new Date(conn.last_synced_at).getTime() < FRESH_MS) return;
    let accessToken = conn.access_token as string;
    if (new Date(conn.expires_at).getTime() - Date.now() < 5 * 60 * 1000) {
      const refreshed = await refreshOuraToken(conn.refresh_token);
      if (!refreshed) return;
      accessToken = refreshed.access_token;
      await admin.from("oura_connections").update({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token,
        expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
      }).eq("client_id", clientId);
    }
    await syncOuraNightToDailyLog(admin, clientId, accessToken, date);
    await admin.from("oura_connections").update({ last_synced_at: new Date().toISOString() }).eq("client_id", clientId);
  } catch {
    /* ignoré : le bilan reste utilisable à la main */
  }
}
