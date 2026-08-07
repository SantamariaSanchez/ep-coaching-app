// Connecteur Oura Ring (API v2, OAuth2) — alimente uniquement les données
// liées au sommeil/récupération dans biometric_logs (sommeil, récupération,
// HRV, FC repos), jamais les données cardio/calories qui n'ont pas leur
// place dans cet onglet, et les pas dans step_logs (routine de pas).
//
// Nécessite deux variables d'environnement à créer côté Vercel — impossible
// à faire depuis ce repo :
//   OURA_CLIENT_ID / OURA_CLIENT_SECRET, obtenues en enregistrant une
//   application sur https://cloud.ouraring.com/oauth/applications avec pour
//   redirect URI : {NEXT_PUBLIC_APP_URL}/api/oura/callback

const OURA_AUTH_URL = "https://cloud.ouraring.com/oauth/authorize";
const OURA_TOKEN_URL = "https://api.ouraring.com/oauth/token";
const OURA_API_BASE = "https://api.ouraring.com/v2/usercollection";

function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "https://ep-coaching.vercel.app";
}

export function isOuraConfigured(): boolean {
  return !!process.env.OURA_CLIENT_ID && !!process.env.OURA_CLIENT_SECRET;
}

export function getOuraAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.OURA_CLIENT_ID ?? "",
    redirect_uri: `${getAppUrl()}/api/oura/callback`,
    response_type: "code",
    state,
    scope: "daily",
  });
  return `${OURA_AUTH_URL}?${params.toString()}`;
}

interface OuraTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export async function exchangeOuraCode(code: string): Promise<OuraTokenResponse | null> {
  try {
    const res = await fetch(OURA_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: `${getAppUrl()}/api/oura/callback`,
        client_id: process.env.OURA_CLIENT_ID ?? "",
        client_secret: process.env.OURA_CLIENT_SECRET ?? "",
      }),
    });
    if (!res.ok) return null;
    return (await res.json()) as OuraTokenResponse;
  } catch {
    return null;
  }
}

export async function refreshOuraToken(refreshToken: string): Promise<OuraTokenResponse | null> {
  try {
    const res = await fetch(OURA_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: process.env.OURA_CLIENT_ID ?? "",
        client_secret: process.env.OURA_CLIENT_SECRET ?? "",
      }),
    });
    if (!res.ok) return null;
    return (await res.json()) as OuraTokenResponse;
  } catch {
    return null;
  }
}

export interface OuraDailySleep {
  day: string;
  // Durée totale de sommeil en secondes, moyennée sur les contributeurs de
  // la nuit — convertie en heures avant stockage.
  total_sleep_duration_seconds: number | null;
  average_hrv: number | null;
  lowest_heart_rate: number | null;
}

// Uniquement le détail par session ("sleep" — durée/HRV/FC). Le score de
// sommeil de "daily_sleep" n'est plus récupéré ici : voir
// fetchOuraReadinessForDate, qui interroge le bon endpoint pour le score de
// récupération (c'était auparavant mélangé, voir plus bas).
export async function fetchOuraSleepForDate(
  accessToken: string,
  date: string
): Promise<OuraDailySleep | null> {
  try {
    const res = await fetch(`${OURA_API_BASE}/sleep?start_date=${date}&end_date=${date}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;

    const detailData = await res.json();
    // Plusieurs sessions de sommeil possibles (sieste incluse) — on prend
    // la plus longue comme "nuit principale".
    const sessions = (detailData.data ?? []) as Array<{
      total_sleep_duration?: number;
      average_heart_rate_variability?: number;
      lowest_heart_rate?: number;
    }>;
    const mainSession = sessions.sort(
      (a, b) => (b.total_sleep_duration ?? 0) - (a.total_sleep_duration ?? 0)
    )[0];

    if (!mainSession) return null;

    return {
      day: date,
      total_sleep_duration_seconds: mainSession.total_sleep_duration ?? null,
      average_hrv: mainSession.average_heart_rate_variability ?? null,
      lowest_heart_rate: mainSession.lowest_heart_rate ?? null,
    };
  } catch {
    return null;
  }
}

// Sous-scores 0-100 qu'Oura combine pour calculer le score global de
// récupération — récupérés mais jamais exploités jusque-là. Permettent de
// dire PRÉCISÉMENT ce qui tire la récupération vers le bas plutôt qu'un
// "récupération basse" générique (voir buildContributorInsight ci-dessous
// et son usage dans app/api/cron/sync-oura).
export interface OuraReadinessContributors {
  activity_balance: number | null;
  body_temperature: number | null;
  hrv_balance: number | null;
  previous_day_activity: number | null;
  previous_night: number | null;
  recovery_index: number | null;
  resting_heart_rate: number | null;
  sleep_balance: number | null;
}

export interface OuraDailyReadiness {
  // Score de récupération global Oura (HRV, FC repos, équilibre sommeil,
  // activité, température...) — PAS le score de sommeil de "daily_sleep",
  // qui mesure autre chose (qualité de la nuit seule). C'est ce score-ci
  // qui correspond à "Récupération" dans l'app.
  score: number | null;
  // Écart à la température corporelle de référence du client, en °C.
  // Un écart positif marqué est un signal précoce classique de fatigue
  // accumulée ou de maladie qui couve (voir lib/biometric-rules.ts).
  temperature_deviation: number | null;
  contributors: OuraReadinessContributors | null;
}

export async function fetchOuraReadinessForDate(
  accessToken: string,
  date: string
): Promise<OuraDailyReadiness | null> {
  try {
    const res = await fetch(`${OURA_API_BASE}/daily_readiness?start_date=${date}&end_date=${date}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const entry = data.data?.[0];
    if (!entry) return null;
    return {
      score: entry.score ?? null,
      temperature_deviation: entry.temperature_deviation ?? null,
      contributors: entry.contributors ?? null,
    };
  } catch {
    return null;
  }
}

// Libellé + piste d'action par sous-score Oura — voir OuraReadinessContributors.
export const READINESS_CONTRIBUTOR_INFO: Record<keyof OuraReadinessContributors, { label: string; tip: string }> = {
  activity_balance: { label: "Équilibre d'activité", tip: "Les séances récentes sont sans doute trop intenses ou trop rapprochées pour la récupération actuelle." },
  body_temperature: { label: "Température corporelle", tip: "Écart de température inhabituel, souvent le tout premier signe d'une fatigue ou d'une maladie qui couve." },
  hrv_balance: { label: "Équilibre HRV", tip: "Le système nerveux montre des signes de fatigue accumulée, un jour de repos serait bénéfique." },
  previous_day_activity: { label: "Activité de la veille", tip: "La charge d'hier était sans doute trop élevée pour la récupération du moment." },
  previous_night: { label: "Sommeil de la nuit", tip: "La nuit dernière n'était pas optimale, voir le détail sommeil ci-dessous." },
  recovery_index: { label: "Indice de récupération", tip: "Le corps met plus de temps que d'habitude à récupérer entre deux nuits." },
  resting_heart_rate: { label: "FC au repos", tip: "FC au repos plus élevée que d'habitude, signe de fatigue ou de stress accumulé." },
  sleep_balance: { label: "Équilibre sommeil", tip: "Les horaires de sommeil des derniers jours manquent de régularité." },
};

// Identifie le sous-score le plus bas (sous 70, seuil Oura pour "à surveiller")
// pour transformer un score global en explication concrète et actionnable.
export function findWeakestContributor(
  contributors: OuraReadinessContributors | null
): { key: keyof OuraReadinessContributors; score: number } | null {
  if (!contributors) return null;
  let weakest: { key: keyof OuraReadinessContributors; score: number } | null = null;
  for (const [key, score] of Object.entries(contributors) as [keyof OuraReadinessContributors, number | null][]) {
    if (score == null || score >= 70) continue;
    if (!weakest || score < weakest.score) weakest = { key, score };
  }
  return weakest;
}

export async function fetchOuraStepsForDate(accessToken: string, date: string): Promise<number | null> {
  try {
    const res = await fetch(`${OURA_API_BASE}/daily_activity?start_date=${date}&end_date=${date}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data?.[0]?.steps ?? null;
  } catch {
    return null;
  }
}
