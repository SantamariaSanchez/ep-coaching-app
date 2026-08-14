import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase-admin";
import { detachClientsFromCoach } from "@/lib/coach-lifecycle";
import { notifyAdmin } from "@/lib/admin-notify";
import { notifyUser } from "@/lib/notify";

// Stripe needs the raw request body to verify the webhook signature.
export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Stripe webhook signature error:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const admin = createAdminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id;
      if (!userId) break;

      const stripeCustomerId = typeof session.customer === "string" ? session.customer : null;
      const stripeSubscriptionId =
        typeof session.subscription === "string" ? session.subscription : null;

      // Un même Payment Link mécanisme sert deux abonnements différents :
      // un client qui paie son coaching (subscription_status), ou un coach
      // qui paie son accès à la plateforme EP Coaching (platform_subscription_status).
      // On distingue via le rôle du profil cible, jamais via l'URL utilisée.
      const { data: profile } = await admin
        .from("profiles")
        .select("role, full_name, email")
        .eq("id", userId)
        .single();

      if (profile?.role === "coach") {
        await admin
          .from("profiles")
          .update({
            platform_subscription_status: "active",
            platform_stripe_customer_id: stripeCustomerId,
            platform_stripe_subscription_id: stripeSubscriptionId,
          })
          .eq("id", userId);
        notifyAdmin("Coach tiers : abonnement plateforme activé", [
          `<strong>${profile.full_name ?? "Coach"}</strong> (${profile.email ?? userId})`,
        ]).catch(() => {});
      } else {
        await admin
          .from("profiles")
          .update({
            subscription_status: "active",
            stripe_customer_id: stripeCustomerId,
            stripe_subscription_id: stripeSubscriptionId,
          })
          .eq("id", userId);
      }
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId =
        typeof subscription.customer === "string" ? subscription.customer : null;
      if (!customerId) break;

      const isActive = subscription.status === "active" || subscription.status === "trialing";

      // Le customerId n'apparaît que dans l'une des deux colonnes selon
      // qu'il s'agit d'un client ou d'un coach — l'autre update est un no-op.
      const { data: clientRow } = await admin
        .from("profiles")
        .update({ subscription_status: isActive ? "active" : "canceled" })
        .eq("stripe_customer_id", customerId)
        .select("id, full_name, email, coach_id")
        .maybeSingle();

      if (clientRow?.id && !isActive) {
        notifyAdmin("Client : résiliation de l'abonnement coaching", [
          `<strong>${clientRow.full_name ?? "Client"}</strong> (${clientRow.email ?? clientRow.id})`,
        ]).catch(() => {});

        // Item 46 : avant ce fix, seul le fondateur était prévenu (ligne
        // ci-dessus) — ni le client (accès premium perdu sans explication)
        // ni son coach (aucune relance possible) ne le voyaient nulle part.
        notifyUser(clientRow.id, {
          type: "subscription_canceled",
          title: "Ton coaching payant s'est arrêté",
          body: "Tu gardes l'accès aux outils gratuits. Contacte ton coach si c'est une erreur, ou réactive quand tu veux.",
          url: "/dashboard/client/abonnement",
        }).catch(() => {});

        if (clientRow.coach_id) {
          notifyUser(clientRow.coach_id, {
            type: "client_subscription_canceled",
            title: "⚠️ Abonnement client résilié",
            body: `${clientRow.full_name ?? "Un client"} n'est plus abonné au coaching payant.`,
            url: `/dashboard/coach/clients/${clientRow.id}`,
            senderId: clientRow.id,
          }).catch(() => {});
        }
      }

      const { data: coachRow } = await admin
        .from("profiles")
        .update({ platform_subscription_status: isActive ? "active" : "canceled" })
        .eq("platform_stripe_customer_id", customerId)
        .select("id, full_name, email")
        .maybeSingle();

      if (coachRow?.id) {
        if (isActive) {
          notifyAdmin("Coach tiers : abonnement plateforme activé", [
            `<strong>${coachRow.full_name ?? "Coach"}</strong> (${coachRow.email ?? coachRow.id})`,
          ]).catch(() => {});
        } else {
          notifyAdmin("Coach tiers : abonnement plateforme résilié", [
            `<strong>${coachRow.full_name ?? "Coach"}</strong> (${coachRow.email ?? coachRow.id})`,
            "Ses clients repassent automatiquement membres libres.",
          ]).catch(() => {});
        }
      }

      // Un coach qui n'a plus d'abonnement plateforme actif n'entraîne
      // jamais le blocage de ses clients : ils repassent membres libres.
      if (!isActive && coachRow?.id) {
        await detachClientsFromCoach(coachRow.id);
      }
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
