import { createAdminClient } from "@/lib/supabase-admin";
import { todayInParis } from "@/lib/dates";

// Import auto Stripe dans la compta perso du coach (Axe 4, VISION.md).
// Décision directe du 2026-08-20 : cadrage du "reste à faire" documenté le
// 2026-08-14 ("à cadrer si l'usage de la v1 montre que la saisie manuelle
// est le vrai point de friction").
//
// Longtemps limité au premier paiement (checkout.session.completed, déjà
// géré par le webhook Stripe pour activer l'abonnement) : les
// renouvellements mensuels arrivaient par un événement Stripe différent
// (invoice.payment_succeeded), volontairement laissé de côté ("toucher le
// webhook de paiement le plus sensible de l'appli pour un gain
// incrémental... une vraie session de test dédiée est plus appropriée").
// Branché le 2026-09-08 (voir logStripeRenewalPayment ci-dessous) : reste
// un ajout, aucune ligne touchée dans checkout.session.completed ni dans
// la logique qui accorde/révoque l'accès payant, uniquement de la lecture
// et une écriture dans coach_finance_entries.
//
// Jamais bloquant : appelé en best-effort depuis le webhook, une erreur
// ici ne doit jamais empêcher l'activation réelle de l'abonnement du
// client (déjà faite avant cet appel).
export async function logStripeCoachingPayment(params: {
  coachId: string;
  clientName: string | null;
  amountTotalCents: number | null;
  stripeSessionId: string;
}): Promise<void> {
  await insertCoachRevenueEntry({
    coachId: params.coachId,
    amountCents: params.amountTotalCents,
    label: `Abonnement ${params.clientName ?? "client"} · premier paiement`,
    stripeEventId: params.stripeSessionId,
  });
}

// Renouvellement mensuel d'un abonnement client (invoice.payment_succeeded,
// billing_reason "subscription_cycle" uniquement — voir le filtre posé côté
// webhook : "subscription_create" correspond au tout premier paiement, déjà
// importé par logStripeCoachingPayment ci-dessus via checkout.session.
// completed, sur un event id différent. Sans ce filtre, le premier paiement
// serait compté deux fois).
export async function logStripeRenewalPayment(params: {
  coachId: string;
  clientName: string | null;
  amountPaidCents: number | null;
  stripeInvoiceId: string;
}): Promise<void> {
  await insertCoachRevenueEntry({
    coachId: params.coachId,
    amountCents: params.amountPaidCents,
    label: `Abonnement ${params.clientName ?? "client"} · renouvellement`,
    stripeEventId: params.stripeInvoiceId,
  });
}

async function insertCoachRevenueEntry(params: {
  coachId: string;
  amountCents: number | null;
  label: string;
  stripeEventId: string;
}): Promise<void> {
  try {
    if (!params.amountCents || params.amountCents <= 0) return;

    const admin = createAdminClient();

    // Jamais pour un coach IA (profil bot, personne ne consultera jamais
    // sa "compta") — uniquement les vrais coachs humains.
    const { data: coach } = await admin
      .from("profiles")
      .select("is_ai_coach")
      .eq("id", params.coachId)
      .maybeSingle();
    if (!coach || coach.is_ai_coach) return;

    const { error } = await admin.from("coach_finance_entries").insert({
      coach_id: params.coachId,
      kind: "revenu",
      category: "Abonnements clients",
      label: params.label,
      amount: Math.round(params.amountCents) / 100,
      // MASTERCLASS.md Axe L : todayInParis(), pas new Date().toISOString().
      entry_date: todayInParis(),
      note: "Importé automatiquement depuis Stripe.",
      source: "stripe",
      stripe_event_id: params.stripeEventId,
    });
    // 23505 = conflit sur l'index unique (coach_id, stripe_event_id), donc
    // webhook déjà traité une première fois (retry Stripe) : attendu, pas
    // de log bruyant. Toute autre erreur reste loguée normalement.
    if (error && error.code !== "23505") {
      console.error("insertCoachRevenueEntry insert error:", error);
    }
  } catch (e) {
    console.error("insertCoachRevenueEntry error:", e);
  }
}
