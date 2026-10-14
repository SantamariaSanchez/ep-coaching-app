import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { todayInParis } from "@/lib/dates";
import {
  hashStepsToken,
  isMissingTable,
  isWellFormedStepsToken,
  parseIngestDate,
  parseSource,
  parseSteps,
  sameHash,
  upsertStepTotal,
} from "@/lib/steps-sync";
import { getCoachForClient, alreadyNotifiedToday } from "@/utils/insert-notification";
import { notifyUser } from "@/lib/notify";

// Synchro automatique des pas (2026-10-14). Appelé par :
// - un Raccourci iOS : « Rechercher des échantillons de santé » (Nombre de
//   pas, aujourd'hui, groupés par jour) puis « Obtenir le contenu de l'URL »
//   en POST, déclenché par une automatisation (heure fixe, ouverture de
//   l'appli EP Coaching) ;
// - une appli d'automatisation Android qui lit Health Connect, même requête.
//
// POST /api/steps/ingest
//   En-tête : Authorization: Bearer eps_... (ou champ "token" du JSON)
//   Corps JSON : { "steps": 8532, "date": "2026-10-14" (facultatif),
//                  "source": "ios" | "android" (facultatif) }
//   ou { "days": [{ "date": "...", "steps": ... }, ...] } (14 jours max).
//
// Sécurité : clé aléatoire de 256 bits, stockée hachée (SHA-256), comparée
// en temps constant ; limite de débit par IP AVANT toute lecture en base et
// par compte ensuite ; entrées validées strictement ; la clé ne permet que
// d'écrire ses propres pas.

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 4096;
const MAX_DAYS = 14;

function fail(status: number, message: string, headers?: Record<string, string>) {
  return NextResponse.json({ ok: false, error: message }, { status, headers });
}

function fmt(n: number): string {
  return n.toLocaleString("fr-FR").replace(/ | /g, " ");
}

export async function POST(req: Request) {
  // 1. Limite par IP, avant toute lecture : bloque le bourrinage de clés.
  const ip = clientIp(req);
  const ipLimit = await checkRateLimit(`steps-ingest:ip:${ip}`, 60, 600);
  if (!ipLimit.allowed) {
    return fail(429, "Trop de requêtes. Réessaie dans quelques minutes.", { "Retry-After": String(ipLimit.retryAfterSeconds) });
  }

  // 2. Corps borné et JSON valide.
  const raw = await req.text().catch(() => "");
  if (raw.length > MAX_BODY_BYTES) return fail(413, "Requête trop volumineuse.");
  let body: Record<string, unknown> = {};
  if (raw.trim()) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return fail(400, "Le corps doit être un objet JSON.");
      body = parsed as Record<string, unknown>;
    } catch {
      return fail(400, "JSON invalide.");
    }
  }

  // 3. Clé personnelle.
  const header = req.headers.get("authorization") ?? req.headers.get("x-ep-token") ?? "";
  const token = (header.replace(/^Bearer\s+/i, "").trim() || (typeof body.token === "string" ? body.token.trim() : "")) || null;
  if (!isWellFormedStepsToken(token)) return fail(401, "Clé de synchro manquante ou invalide. Recopie-la depuis l'appli, onglet Steps.");

  const admin = createAdminClient();
  const hash = hashStepsToken(token);
  const { data: row, error: tokenError } = await admin
    .from("step_sync_tokens")
    .select("user_id, token_hash")
    .eq("token_hash", hash)
    .maybeSingle();
  if (tokenError) {
    if (isMissingTable(tokenError)) return fail(503, "La synchro automatique n'est pas encore activée sur le serveur.");
    console.error("steps ingest token lookup error:", tokenError);
    return fail(500, "Erreur serveur, réessaie.");
  }
  const owner = row as { user_id: string; token_hash: string } | null;
  if (!owner || !sameHash(owner.token_hash, hash)) return fail(401, "Clé de synchro inconnue ou remplacée. Recopie la nouvelle depuis l'appli.");

  // 4. Limite par compte (une automatisation toutes les heures en tient très large).
  const userLimit = await checkRateLimit(`steps-ingest:user:${owner.user_id}`, 120, 3600);
  if (!userLimit.allowed) {
    return fail(429, "Trop de synchros d'un coup. Réessaie plus tard.", { "Retry-After": String(userLimit.retryAfterSeconds) });
  }

  // 5. Valeurs.
  const today = todayInParis();
  const source = parseSource(body.source);
  const entries: { date: string; steps: number }[] = [];
  if (Array.isArray(body.days)) {
    if (body.days.length === 0 || body.days.length > MAX_DAYS) return fail(400, `Envoie entre 1 et ${MAX_DAYS} jours.`);
    for (const d of body.days) {
      if (!d || typeof d !== "object") return fail(400, "Chaque jour doit contenir date et steps.");
      const item = d as Record<string, unknown>;
      const date = parseIngestDate(item.date, today);
      const steps = parseSteps(item.steps);
      if (!date) return fail(400, "Date invalide (format AAAA-MM-JJ, 14 jours maximum en arrière).");
      if (steps == null) return fail(400, "Nombre de pas invalide.");
      entries.push({ date, steps });
    }
  } else {
    if (typeof body.steps === "string" && /[\n\r]/.test(body.steps)) {
      return fail(400, "Plusieurs valeurs reçues. Dans le raccourci, groupe les échantillons par jour puis fais la somme.");
    }
    const steps = parseSteps(body.steps);
    if (steps == null) return fail(400, "Nombre de pas invalide (un entier entre 0 et 200 000).");
    const date = parseIngestDate(body.date, today);
    if (!date) return fail(400, "Date invalide (format AAAA-MM-JJ, 14 jours maximum en arrière).");
    entries.push({ date, steps });
  }

  // Un même jour envoyé deux fois dans le lot : on garde la dernière valeur.
  const byDate = new Map(entries.map((e) => [e.date, e.steps]));
  for (const [date, steps] of byDate) {
    const res = await upsertStepTotal(admin, owner.user_id, date, steps, source);
    if (res.error) return fail(500, "Impossible d'enregistrer tes pas, réessaie.");
  }

  await admin
    .from("step_sync_tokens")
    .update({ last_used_at: new Date().toISOString(), last_source: source })
    .eq("user_id", owner.user_id);

  const { data: settings } = await admin.from("step_settings").select("daily_goal").eq("client_id", owner.user_id).maybeSingle();
  const goal = (settings as { daily_goal: number | null } | null)?.daily_goal ?? 8000;
  const latestDate = [...byDate.keys()].sort().at(-1)!;
  const latestSteps = byDate.get(latestDate)!;
  const pct = goal > 0 ? Math.round((latestSteps / goal) * 100) : 0;

  if (latestDate === today && goal > 0 && latestSteps >= goal) {
    notifyCoachGoalReached(owner.user_id, today, latestSteps).catch(() => {});
  }

  const message =
    latestDate === today
      ? latestSteps >= goal
        ? `${fmt(latestSteps)} pas, objectif atteint. Bravo !`
        : `${fmt(latestSteps)} pas (${pct} % de ton objectif). Encore ${fmt(goal - latestSteps)}.`
      : `${byDate.size} jour${byDate.size > 1 ? "s" : ""} synchronisé${byDate.size > 1 ? "s" : ""}.`;

  return NextResponse.json({ ok: true, date: latestDate, steps: latestSteps, goal, pct, days: byDate.size, message });
}

export async function GET() {
  return fail(405, "Utilise POST avec ta clé de synchro.", { Allow: "POST" });
}

async function notifyCoachGoalReached(clientId: string, date: string, steps: number): Promise<void> {
  const coach = await getCoachForClient(clientId);
  if (!coach) return;
  if (await alreadyNotifiedToday(coach.id, "steps_goal_reached", clientId)) return;
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("full_name").eq("id", clientId).maybeSingle();
  const name = (profile as { full_name: string | null } | null)?.full_name ?? "Un client";
  await notifyUser(coach.id, {
    type: "steps_goal_reached",
    title: "Objectif de pas atteint",
    body: `${name} a atteint son objectif de pas le ${date} (${fmt(steps)} pas).`,
    url: `/dashboard/coach/clients/${clientId}`,
    senderId: clientId,
  });
}
