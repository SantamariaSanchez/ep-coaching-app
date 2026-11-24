import { createAdminClient } from "@/lib/supabase-admin";
import { sendBrevoEmail, isBrevoContactSubscribed, NEWSLETTER_LIST_ID } from "@/utils/brevo";
import { wrapBrandedEmail } from "@/lib/mailing-audience";
import {
  LEAD_STEPS, ONBOARDING_STEPS, auditMail, dueAuditStep, dueDayStep, firstName, isSendingHour, leadMail, onboardingMail,
  type SequenceKind,
} from "@/lib/sequences";

// Exécution des séquences (lib/sequences.ts), appelée par
// /api/cron/sequences toutes les 10 minutes. Une étape est notée dans
// sequence_sends AVANT l'envoi (contrainte unique) : deux passages du cron
// ne peuvent jamais envoyer le même mail deux fois.

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://ep-coaching.vercel.app";
const CANDIDATURE_URL = "https://ep-coaching-formulaires.vercel.app/prequalification";
const MAX_PER_RUN = 40;

type Admin = ReturnType<typeof createAdminClient>;

async function sentSteps(admin: Admin, kind: SequenceKind, targets: string[]): Promise<Map<string, Set<string>>> {
  const map = new Map<string, Set<string>>();
  if (!targets.length) return map;
  const { data } = await admin.from("sequence_sends").select("target, step").eq("kind", kind).in("target", targets);
  for (const r of (data ?? []) as { target: string; step: string }[]) {
    const s = map.get(r.target) ?? new Set<string>();
    s.add(r.step);
    map.set(r.target, s);
  }
  return map;
}

/** Réserve l'étape (insert unique) ; false si elle est déjà prise. */
async function claim(admin: Admin, kind: SequenceKind, target: string, step: string, email: string): Promise<boolean> {
  const { error } = await admin.from("sequence_sends").insert({ kind, target, step, email });
  return !error;
}

async function deliver(admin: Admin, kind: SequenceKind, target: string, step: string, email: string, subject: string, html: string): Promise<boolean> {
  if (!(await claim(admin, kind, target, step, email))) return false;
  const ok = await sendBrevoEmail({ to: email, subject, htmlContent: wrapBrandedEmail(html) });
  if (!ok) await admin.from("sequence_sends").delete().eq("kind", kind).eq("target", target).eq("step", step);
  return ok;
}

export interface SequenceRunResult {
  lead: number;
  audit: number;
  onboarding: number;
}

export async function runSequences(now = Date.now()): Promise<SequenceRunResult> {
  const admin = createAdminClient();
  const out: SequenceRunResult = { lead: 0, audit: 0, onboarding: 0 };
  let budget = MAX_PER_RUN;

  // 1. Rappels d'audit : à toute heure, ils sont liés à un rendez-vous.
  const { data: bookings } = await admin
    .from("prospect_bookings")
    .select("event_uri, starts_at, name, email, join_url, prep_token, prep_at")
    .eq("status", "active")
    .gt("starts_at", new Date(now).toISOString())
    .lte("starts_at", new Date(now + 11 * 86_400_000).toISOString())
    .limit(200);
  const bRows = (bookings ?? []) as { event_uri: string; starts_at: string; name: string | null; email: string | null; join_url: string | null; prep_token?: string | null; prep_at?: string | null }[];
  // La cible inclut l'heure : un rendez-vous déplacé repart avec ses rappels.
  const target = (b: { event_uri: string; starts_at: string }) => `${b.event_uri}@${b.starts_at}`;
  const bSent = await sentSteps(admin, "audit", bRows.map(target));
  for (const b of bRows) {
    if (budget <= 0 || !b.email) continue;
    const step = dueAuditStep(b.starts_at, now, bSent.get(target(b)) ?? new Set());
    if (!step) continue;
    const prepUrl = b.prep_token && !b.prep_at ? `${APP_URL}/audit/${b.prep_token}` : null;
    const mail = auditMail({ step: step.key, name: firstName(b.name), startsAt: b.starts_at, joinUrl: b.join_url, prepUrl });
    if (mail && (await deliver(admin, "audit", target(b), step.key, b.email, mail.subject, mail.html))) {
      out.audit++;
      budget--;
    }
  }

  if (!isSendingHour(now)) return out;

  // 2. Relances après un guide gratuit.
  const since = new Date(now - 33 * 86_400_000).toISOString();
  const { data: leads } = await admin
    .from("leads")
    .select("id, email, lead_magnet_slug, status, created_at")
    .not("email", "is", null)
    .gte("created_at", since)
    .limit(500);
  const lRows = ((leads ?? []) as { id: string; email: string; lead_magnet_slug: string; status: string | null; created_at: string }[])
    .filter((l) => l.status !== "converti" && l.status !== "perdu");
  if (lRows.length) {
    const lSent = await sentSteps(admin, "lead", lRows.map((l) => l.id));
    const slugs = [...new Set(lRows.map((l) => l.lead_magnet_slug))];
    const { data: magnets } = await admin.from("lead_magnets").select("slug, title").in("slug", slugs);
    const titleOf = new Map(((magnets ?? []) as { slug: string; title: string }[]).map((m) => [m.slug, m.title]));
    const emails = [...new Set(lRows.map((l) => l.email.toLowerCase()))];
    const { data: members } = await admin.from("profiles").select("email").in("email", emails);
    const isMember = new Set(((members ?? []) as { email: string | null }[]).map((m) => (m.email ?? "").toLowerCase()));
    for (const l of lRows) {
      if (budget <= 0) break;
      const step = dueDayStep(LEAD_STEPS, l.created_at, now, lSent.get(l.id) ?? new Set());
      if (!step) continue;
      const email = l.email.toLowerCase();
      // Inscrit à l'appli : l'onboarding prend le relais. Désabonné : plus rien.
      if (isMember.has(email)) continue;
      if (!(await isBrevoContactSubscribed(email, NEWSLETTER_LIST_ID))) continue;
      const mail = leadMail({
        step: step.key,
        guideTitle: titleOf.get(l.lead_magnet_slug) ?? "ton guide",
        guideUrl: `${APP_URL}/ressources/${encodeURIComponent(l.lead_magnet_slug)}?src=email`,
        appUrl: APP_URL,
        candidatureUrl: CANDIDATURE_URL,
      });
      if (mail && (await deliver(admin, "lead", l.id, step.key, email, mail.subject, mail.html))) {
        out.lead++;
        budget--;
      }
    }
  }

  // 3. Onboarding pas terminé.
  const { data: pending } = await admin
    .from("profiles")
    .select("id, email, full_name, terms_accepted_at")
    .eq("role", "client")
    .eq("is_platform_owner", false)
    .is("onboarding_completed_at", null)
    .not("email", "is", null)
    .not("email", "ilike", "%@epcoaching.app")
    .gte("terms_accepted_at", new Date(now - 10 * 86_400_000).toISOString())
    .limit(200);
  const pRows = (pending ?? []) as { id: string; email: string; full_name: string | null; terms_accepted_at: string }[];
  const pSent = await sentSteps(admin, "onboarding", pRows.map((p) => p.id));
  for (const p of pRows) {
    if (budget <= 0) break;
    const step = dueDayStep(ONBOARDING_STEPS, p.terms_accepted_at, now, pSent.get(p.id) ?? new Set());
    if (!step) continue;
    const mail = onboardingMail({ step: step.key, name: firstName(p.full_name), appUrl: APP_URL });
    if (mail && (await deliver(admin, "onboarding", p.id, step.key, p.email, mail.subject, mail.html))) {
      out.onboarding++;
      budget--;
    }
  }
  return out;
}
