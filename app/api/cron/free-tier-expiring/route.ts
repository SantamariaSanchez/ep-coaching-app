import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { sendBrevoEmail } from "@/utils/brevo";
import { wrapBrandedEmail } from "@/lib/mailing-audience";
import { freeTierStatus, EXPIRY_WARN_DAYS, FREE_TIER_DAYS } from "@/lib/free-tier";

// Prévient un membre gratuit ACTIF avant que son accès se verrouille — voir
// lib/free-tier.ts. Distinct de app/api/cron/free-tier-inactivity, qui cible
// celui qui ne s'est jamais reconnecté : ici la personne utilise l'appli,
// elle a juste besoin de savoir que le compteur tourne avant d'être surprise
// par le verrou.
//
// Pose aussi locked_at une fois l'échéance dépassée : le verrou lui-même ne
// dépend pas de cette colonne (freeTierStatus() le recalcule en direct à
// chaque rendu), mais la garder à jour donne une date fiable pour le support
// et pour ne plus renvoyer d'avertissement une fois verrouillé.
const WARN_REPEAT_GUARD_DAYS = 3;
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://ep-coaching.vercel.app";

function daysSince(iso: string | null | undefined, now: number): number {
  if (!iso) return Infinity;
  return Math.floor((now - new Date(iso).getTime()) / 86_400_000);
}

interface CandidateRow {
  id: string;
  full_name: string | null;
  email: string | null;
  free_tier_started_at: string | null;
  locked_at: string | null;
  free_tier_warned_at: string | null;
}

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = Date.now();

  const { data: candidates } = await admin
    .from("profiles")
    .select("id, full_name, email, free_tier_started_at, locked_at, free_tier_warned_at")
    .eq("role", "client")
    .neq("subscription_status", "active")
    .not("free_tier_started_at", "is", null);

  const rows = (candidates as CandidateRow[] | null) ?? [];
  let lockedNow = 0;
  let warnedFirst = 0;
  let warnedFinal = 0;

  for (const row of rows) {
    const status = freeTierStatus(row, "membre_gratuit", new Date(now));
    if (!status.applies) continue;

    if (status.expired) {
      if (!row.locked_at) {
        await admin.from("profiles").update({ locked_at: new Date(now).toISOString() }).eq("id", row.id);
        lockedNow++;
      }
      continue;
    }

    const warnedRecently =
      !!row.free_tier_warned_at && daysSince(row.free_tier_warned_at, now) < WARN_REPEAT_GUARD_DAYS;
    if (warnedRecently || !row.email) continue;

    if (status.daysUsed >= EXPIRY_WARN_DAYS[1]) {
      // 1 jour restant : dernière ligne droite avant le verrou.
      const subject = "Demain, ton accès gratuit se verrouille";
      const sent = await sendBrevoEmail({
        to: row.email,
        subject,
        htmlContent: wrapBrandedEmail(`
          <h2 style="color:#E01E1E;margin:0 0 12px;font-size:18px;">${subject}</h2>
          <p style="margin:0 0 12px;">Salut ${row.full_name?.split(" ")[0] ?? ""},</p>
          <p style="margin:0 0 12px;">
            Tes ${FREE_TIER_DAYS} jours d'accès gratuit se terminent demain. Rien n'est perdu : tes
            données restent, mais l'appli se verrouille jusqu'à ce que tu prennes un coach.
          </p>
          <p style="margin:0 0 16px;">
            Si l'appli t'a été utile jusqu'ici, c'est le moment de passer à la suite.
          </p>
          <a href="${appUrl}/dashboard/client/abonnement"
             style="background:#E01E1E;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:700;">
            Voir l'accompagnement
          </a>
        `),
      });
      if (sent) {
        warnedFinal++;
        await admin.from("profiles").update({ free_tier_warned_at: new Date(now).toISOString() }).eq("id", row.id);
      }
    } else if (status.daysUsed >= EXPIRY_WARN_DAYS[0]) {
      // 7 jours restants : premier avertissement, encore le temps de réfléchir.
      const subject = "Il te reste 7 jours d'accès gratuit";
      const sent = await sendBrevoEmail({
        to: row.email,
        subject,
        htmlContent: wrapBrandedEmail(`
          <h2 style="color:#E01E1E;margin:0 0 12px;font-size:18px;">${subject}</h2>
          <p style="margin:0 0 12px;">Salut ${row.full_name?.split(" ")[0] ?? ""},</p>
          <p style="margin:0 0 16px;">
            Ton compte gratuit a été ouvert il y a ${status.daysUsed} jours. Dans 7 jours, l'accès se
            verrouille tant qu'aucun coach n'est pris (tes données restent, tu ne perds rien).
            Si l'appli t'aide, c'est le bon moment pour voir ce qu'un vrai accompagnement change.
          </p>
          <a href="${appUrl}/dashboard/client/abonnement"
             style="background:#E01E1E;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:700;">
            Voir l'accompagnement
          </a>
        `),
      });
      if (sent) {
        warnedFirst++;
        await admin.from("profiles").update({ free_tier_warned_at: new Date(now).toISOString() }).eq("id", row.id);
      }
    }
  }

  return NextResponse.json({ ok: true, candidates: rows.length, lockedNow, warnedFirst, warnedFinal });
}
