import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase-admin";
import { isWithinQuietHours } from "@/lib/quiet-hours";

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
  url?: string,
  // "alarm" : traité différemment côté service worker (public/sw.js) — la
  // notif reste affichée tant qu'elle n'est pas fermée (requireInteraction),
  // vibre, et surtout déclenche un vrai son d'alarme joué en boucle dans
  // l'appli si un onglet est ouvert (Notification.silent seul ne "sonne"
  // pas vraiment, juste un bip discret du système). Voir components/ui/AlarmPlayer.tsx.
  type?: "alarm",
  // Id du schedule_blocks concerné — uniquement utile pour type "alarm" :
  // transmis jusqu'au bouton "Arrêter" (AlarmPlayer) et à l'action
  // "stop-alarm" de la notification (sw.js) pour qu'ils puissent acquitter
  // le bon bloc via /api/client/schedule-blocks/ack-alarm et stopper
  // l'escalade (voir app/api/cron/schedule-block-notify).
  blockId?: string
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
      .select("subscription, quiet_hours_start, quiet_hours_end")
      .eq("user_id", userId)
      .maybeSingle();

    if (!data?.subscription) {
      return { ok: false, reason: "no subscription" };
    }

    // Item 50 : coupe uniquement le push (qui sonne/vibre) — la notif
    // in-app (cloche) est enregistrée séparément par notifyUser() et n'est
    // jamais affectée, elle attendra que l'utilisateur rouvre l'appli.
    // Reason distincte de "no subscription" : les appelants qui font un
    // repli email sur cette chaîne précise (ex. weekly-reengagement) ne
    // doivent pas changer de comportement ici.
    //
    // JAMAIS pour un réveil (type "alarm") : les heures de silence existent
    // pour ne pas déranger PENDANT le sommeil, exactement la plage horaire
    // où un réveil doit justement sonner. Sans cette exception, un réveil
    // programmé à 6h avec des heures de silence couvrant 6h (ex. 22h-7h,
    // le défaut) ne partirait jamais — bug réel trouvé en creusant le
    // retour direct 2026-09-09 "je me suis pas reveiller".
    if (type !== "alarm" && isWithinQuietHours(data.quiet_hours_start, data.quiet_hours_end)) {
      return { ok: false, reason: "quiet hours" };
    }

    // Retour direct 2026-09-09 ("la notif de 17h n'est jamais arrivée") :
    // les logs pg_cron/pg_net confirment que ce cron a bien tourné à
    // l'heure et que webpush.sendNotification n'a jamais levé d'erreur
    // (FCM a donc accepté le message) — le problème n'est pas ici. Mais par
    // défaut web-push n'envoie aucun header Urgency, et sans lui Android
    // peut légitimement repousser la remise en Doze/économie de batterie
    // (FCM ne traite en priorité que les messages marqués high-priority).
    // Pour tout ce qui est daté (repas, réveil, live), une notif qui arrive
    // en retard ou jamais est aussi inutile qu'une notif jamais envoyée :
    // urgency "high" demande une remise immédiate, et un TTL court évite
    // qu'un envoi resté en attente ne "rattrape" son retard bien après coup
    // (une notif "repas 17h" livrée à 19h n'a plus de sens).
    await webpush.sendNotification(
      data.subscription as webpush.PushSubscription,
      JSON.stringify({ title, body, url: url ?? "/", type, blockId }),
      { urgency: "high", TTL: type === "alarm" ? 1800 : 900 }
    );

    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "unknown" };
  }
}
