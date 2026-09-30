import { createSign } from "node:crypto";
import { createAdminClient } from "@/lib/supabase-admin";

// Push natif iOS/Android via Firebase Cloud Messaging (API HTTP v1).
// Inactif tant que FIREBASE_SERVICE_ACCOUNT (JSON du compte de service,
// variable Vercel "Sensitive") n'est pas posée : aucune erreur, juste rien
// d'envoyé. iOS passe aussi par FCM (clé APNs déposée dans Firebase).

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

let cached: { token: string; exp: number } | null = null;

function serviceAccount(): ServiceAccount | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    const sa = JSON.parse(raw) as ServiceAccount;
    return sa.project_id && sa.client_email && sa.private_key ? { ...sa, private_key: sa.private_key.replace(/\n/g, "\n") } : null;
  } catch {
    return null;
  }
}

const b64url = (s: string | Buffer) => Buffer.from(s).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");

async function accessToken(sa: ServiceAccount): Promise<string | null> {
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.exp - 60 > now) return cached.token;
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(JSON.stringify({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/firebase.messaging", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }));
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const jwt = `${header}.${claims}.${b64url(signer.sign(sa.private_key))}`;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  if (!res.ok) {
    console.error("native push: token Google refusé", res.status);
    return null;
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: json.access_token, exp: now + json.expires_in };
  return json.access_token;
}

export function nativePushConfigured(): boolean {
  return !!serviceAccount();
}

/** Envoie à tous les appareils natifs de la personne. Renvoie le nombre d'envois réussis. */
export async function sendNativePush(userId: string, msg: { title: string; body: string; url?: string; type?: string; blockId?: string }): Promise<number> {
  const sa = serviceAccount();
  if (!sa) return 0;
  const admin = createAdminClient();
  const { data } = await admin.from("native_push_tokens").select("token, platform").eq("user_id", userId);
  const tokens = (data ?? []) as { token: string; platform: string }[];
  if (!tokens.length) return 0;
  const bearer = await accessToken(sa);
  if (!bearer) return 0;
  let sent = 0;
  for (const t of tokens) {
    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
      method: "POST",
      headers: { Authorization: `Bearer ${bearer}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: {
          token: t.token,
          notification: { title: msg.title, body: msg.body },
          data: { url: msg.url ?? "/", type: msg.type ?? "", blockId: msg.blockId ?? "" },
          android: { priority: "high", notification: { sound: "default", channel_id: msg.type === "alarm" ? "alarm" : "default" } },
          apns: { headers: { "apns-priority": "10" }, payload: { aps: { sound: "default", "interruption-level": msg.type === "alarm" ? "time-sensitive" : "active" } } },
        },
      }),
    });
    if (res.ok) {
      sent++;
      continue;
    }
    const text = await res.text().catch(() => "");
    // Appareil désinstallé ou jeton expiré : on l'oublie.
    if (res.status === 404 || /UNREGISTERED|INVALID_ARGUMENT/.test(text)) await admin.from("native_push_tokens").delete().eq("token", t.token);
    else console.error("native push error", res.status, text.slice(0, 200));
  }
  return sent;
}
