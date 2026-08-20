import { createAdminClient } from "@/lib/supabase-admin";

// Import auto Stripe dans la compta perso du coach (Axe 4, VISION.md).
// Décision directe du 2026-08-20 : cadrage du "reste à faire" documenté le
// 2026-08-14 ("à cadrer si l'usage de la v1 montre que la saisie manuelle
// est le vrai point de friction").
//
// Périmètre VOLONTAIREMENT limité au premier paiement (checkout.session.
// completed, déjà géré par le webhook Stripe pour activer l'abonnement) :
// les renouvellements mensuels arrivent par un événement Stripe différent
// (invoice.payment_succeeded) qui n'est pas branché ici. Ajouter ce
// deuxième événement toucherait le webhook de paiement le plus sensible de
// l'appli (celui qui contrôle l'accès payant des clients) pour un gain
// incrémental — pas fait dans cette passe, une vraie session de test
// dédiée est plus appropriée pour un flux financier récurrent.
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
  try {
    if (!params.amountTotalCents || params.amountTotalCents <= 0) return;

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
      label: `Abonnement ${params.clientName ?? "client"} — premier paiement`,
      amount: Math.round(params.amountTotalCents) / 100,
      entry_date: new Date().toISOString().split("T")[0],
      note: "Importé automatiquement depuis Stripe.",
      source: "stripe",
      stripe_event_id: params.stripeSessionId,
    });
    // 23505 = conflit sur l'index unique (coach_id, stripe_event_id), donc
    // webhook déjà traité une première fois (retry Stripe) : attendu, pas
    // de log bruyant. Toute autre erreur reste loguée normalement.
    if (error && error.code !== "23505") {
      console.error("logStripeCoachingPayment insert error:", error);
    }
  } catch (e) {
    console.error("logStripeCoachingPayment error:", e);
  }
}
