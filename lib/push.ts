import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase-admin";

function initVapid() {
  if (
    process.env.VAPID_EMAIL &&
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY
  ) {
    webpush.setVapidDetails(
      process.env.VAPID_EMAIL,
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
  }
}

export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  url?: string
): Promise<{ ok: boolean; reason?: string }> {
  try {
    initVapid();
    const supabase = createAdminClient();

    // .maybeSingle(), pas .single() : l'immense majorité des utilisateurs
    // n'ont aucune ligne ici (push jamais activé), un cas normal et attendu,
    // pas une erreur. Avec .single(), PostgREST répond 406 sur 0 ligne — sans
    // vérifier `error` (juste `data`), un appelant qui ne teste que
    // `reason === "no subscription"` (voir weekly-reengagement) ratait ce
    // cas et ne repartait jamais sur le repli email. Trouvé en creusant
    // pourquoi last_reengagement_notified_at n'était renseigné pour AUCUN
    // client après un mois de cron hebdomadaire, alors que les emails de
    // vérification (même sendBrevoEmail) arrivent bien à tout le monde.
    const { data } = await supabase
      .from("push_subscriptions")
      .select("subscription")
      .eq("user_id", userId)
      .maybeSingle();

    if (!data?.subscription) {
      return { ok: false, reason: "no subscription" };
    }

    await webpush.sendNotification(
      data.subscription as webpush.PushSubscription,
      JSON.stringify({ title, body, url: url ?? "/" })
    );

    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "unknown" };
  }
}
