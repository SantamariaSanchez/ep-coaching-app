import { stripe } from "@/lib/stripe";

export interface CoachBillingInfo {
  status: string | null; // trialing | active | past_due | canceled | unpaid...
  planLabel: string | null;
  amount: number | null; // en euros
  currency: string | null;
  intervalMonths: number | null; // 1 (mensuel) ou 6 (semestriel)
  currentPeriodEnd: string | null; // ISO
  trialEnd: string | null; // ISO
  stripeCustomerUrl: string | null;
}

// Va chercher l'état réel de l'abonnement Stripe d'un coach — utilisé
// uniquement par la page d'admin (propriétaire de la plateforme), jamais
// exposé aux coachs eux-mêmes.
export async function getCoachBillingInfo(
  stripeCustomerId: string | null,
  stripeSubscriptionId: string | null
): Promise<CoachBillingInfo | null> {
  if (!stripeCustomerId) return null;
  const stripeCustomerUrl = `https://dashboard.stripe.com/customers/${stripeCustomerId}`;

  if (!stripeSubscriptionId) {
    return {
      status: null, planLabel: null, amount: null, currency: null,
      intervalMonths: null, currentPeriodEnd: null, trialEnd: null,
      stripeCustomerUrl,
    };
  }

  try {
    const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId, {
      expand: ["items.data.price"],
    });
    const item = sub.items.data[0];
    const price = item?.price;

    return {
      status: sub.status,
      planLabel: price?.nickname ?? null,
      amount: price?.unit_amount != null ? price.unit_amount / 100 : null,
      currency: price?.currency ?? null,
      intervalMonths: price?.recurring?.interval_count ?? null,
      currentPeriodEnd: item?.current_period_end
        ? new Date(item.current_period_end * 1000).toISOString()
        : null,
      trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
      stripeCustomerUrl,
    };
  } catch (e) {
    console.error("getCoachBillingInfo:", e);
    return {
      status: "erreur", planLabel: null, amount: null, currency: null,
      intervalMonths: null, currentPeriodEnd: null, trialEnd: null,
      stripeCustomerUrl,
    };
  }
}
