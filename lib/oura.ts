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
  score: number | null;
  // Durée totale de sommeil en secondes, moyennée sur les contributeurs de
  // la nuit — convertie en heures avant stockage.
  total_sleep_duration_seconds: number | null;
  average_hrv: number | null;
  lowest_heart_rate: number | null;
}

// L'API v2 sépare "daily_sleep" (score) de "sleep" (détail par session,
// incluant durée/HRV/FC) — on combine les deux car le score seul ne suffit
// pas à peupler sleep_hours/hrv_ms/resting_hr.
export async function fetchOuraSleepForDate(
  accessToken: string,
  date: string
): Promise<OuraDailySleep | null> {
  try {
    const [scoreRes, detailRes] = await Promise.all([
      fetch(`${OURA_API_BASE}/daily_sleep?start_date=${date}&end_date=${date}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
      fetch(`${OURA_API_BASE}/sleep?start_date=${date}&end_date=${date}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
    ]);
    if (!scoreRes.ok && !detailRes.ok) return null;

    const scoreData = scoreRes.ok ? await scoreRes.json() : { data: [] };
    const detailData = detailRes.ok ? await detailRes.json() : { data: [] };

    const scoreEntry = scoreData.data?.[0] ?? null;
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

    if (!scoreEntry && !mainSession) return null;

    return {
      day: date,
      score: scoreEntry?.score ?? null,
      total_sleep_duration_seconds: mainSession?.total_sleep_duration ?? null,
      average_hrv: mainSession?.average_heart_rate_variability ?? null,
      lowest_heart_rate: mainSession?.lowest_heart_rate ?? null,
    };
  } catch {
    return null;
  }
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
