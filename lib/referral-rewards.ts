import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase-admin";
import { notifyUser } from "@/lib/notify";

// Récompense monétaire de parrainage, en plus des points déjà distribués à
// l'inscription (voir app/auth/client/actions.ts::selfSignup). Le
// programme de points récompense l'inscription ; celui-ci récompense la
// conversion réelle en client payant, seul moment où EP Coaching encaisse
// de quoi financer la récompense. Voir
// supabase/migrations/20260816b_referral_rewards.sql.
//
// Montant fixe plutôt qu'un pourcentage du plan choisi par le filleul : plus
// simple à annoncer ("1 mois offert") et indépendant du plan que le parrain
// lui-même a choisi.
export const REFERRAL_REWARD_CENTS = 50_000; // 500€ = le plan mensuel

// Crédite le compte Stripe du parrain via son solde client (customer
// balance) : Stripe applique automatiquement un solde négatif sur la
// prochaine facture, quel que soit le plan (mensuel/semestriel/paiement
// unique), sans toucher à l'abonnement lui-même ni au Payment Link.
async function creditStripeBalance(stripeCustomerId: string, cents: number, description: string) {
  await stripe.customers.createBalanceTransaction(stripeCustomerId, {
    amount: -cents,
    currency: "eur",
    description,
  });
}

// Appelée quand un CLIENT devient payant (checkout.session.completed côté
// webhook Stripe, voir app/api/webhooks/stripe/route.ts). Si cette personne
// a été parrainée, crédite le parrain, une seule fois grâce à la contrainte
// unique sur referred_id (Stripe peut rejouer le même événement webhook).
export async function rewardReferrerForNewPayment(referredUserId: string): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data: referred } = await admin
      .from("profiles")
      .select("referred_by, full_name")
      .eq("id", referredUserId)
      .maybeSingle();

    const referrerId = (referred as { referred_by: string | null; full_name: string | null } | null)?.referred_by;
    if (!referrerId) return;

    const { error: insertError } = await admin.from("referral_rewards").insert({
      referrer_id: referrerId,
      referred_id: referredUserId,
      amount_cents: REFERRAL_REWARD_CENTS,
      status: "pending",
    });
    // Contrainte unique sur referred_id : un conflit veut dire que cette
    // récompense a déjà été créée par un appel précédent (webhook rejoué),
    // on s'arrête là plutôt que de créditer deux fois.
    if (insertError) return;

    await applyPendingRewardsFor(referrerId);

    const referredName = (referred as { full_name: string | null } | null)?.full_name ?? "Un ami";
    notifyUser(referrerId, {
      type: "referral_reward",
      title: "💰 Parrainage récompensé",
      body: `${referredName} vient de devenir client payant, tu as gagné un mois offert.`,
      url: "/dashboard/client/profile",
    }).catch(() => {});
  } catch (e) {
    console.error("rewardReferrerForNewPayment error:", e);
  }
}

// Applique toute récompense en attente pour un parrain qui vient d'obtenir
// un stripe_customer_id (son propre paiement). Nécessaire pour l'ordre
// "j'invite un ami avant même de payer moi-même" : la récompense existe
// (status pending) mais ne peut être créditée qu'une fois qu'il existe un
// client Stripe pour recevoir le solde.
export async function applyPendingRewardsFor(userId: string): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", userId)
      .maybeSingle();
    const stripeCustomerId = (profile as { stripe_customer_id: string | null } | null)?.stripe_customer_id;
    if (!stripeCustomerId) return;

    const { data: pending } = await admin
      .from("referral_rewards")
      .select("id, amount_cents")
      .eq("referrer_id", userId)
      .eq("status", "pending");

    for (const reward of (pending as { id: string; amount_cents: number }[] | null) ?? []) {
      await creditStripeBalance(stripeCustomerId, reward.amount_cents, "Récompense de parrainage EP Coaching");
      await admin
        .from("referral_rewards")
        .update({ status: "credited", credited_at: new Date().toISOString() })
        .eq("id", reward.id);
    }
  } catch (e) {
    console.error("applyPendingRewardsFor error:", e);
  }
}
