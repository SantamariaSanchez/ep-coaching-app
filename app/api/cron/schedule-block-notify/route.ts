import { NextResponse } from "next/server";
import { isBlockOnDate } from "@/lib/agenda-day";
import { createAdminClient } from "@/lib/supabase-admin";
import { sendPushToUser } from "@/lib/push";
import { insertNotification } from "@/utils/insert-notification";
import { parisDateStr, localParts, minutesBetween, safeTimeZone } from "@/lib/schedule-time";

// Notifie chaque propriétaire de bloc d'agenda (schedule_blocks) quand
// l'heure du jour atteint le début d'un bloc marqué notify=true — même
// principe que app/api/cron/send-reminders (table reminders), mais lu
// directement sur schedule_blocks pour rester synchro si l'heure du bloc
// change (un rappel copié dans `reminders` à la création restait, lui,
// figé même après modification du bloc).

interface ScheduleBlockRow {
  id: string;
  owner_id: string;
  day_of_week: number; // 1 = lundi ... 7 = dimanche
  start_time: string; // "HH:MM:SS"
  label: string;
  notify: boolean;
  last_notified_at: string | null;
  alarm_ack_date: string | null;
  // NULL = gabarit récurrent (le comportement historique, sur day_of_week
  // seul). Renseigné = bloc ponctuel (voir migration
  // 20260901c_schedule_blocks_specific_date) qui ne doit notifier QUE sa
  // vraie date, jamais chaque semaine où day_of_week coïncide — sinon un
  // rendez-vous coiffeur ponctuel du mardi prochain notifierait dès ce
  // mardi-ci.
  specific_date: string | null;
  skipped_dates: string[] | null;
}

// Un réveil raté ("j'ai pas été réveillé car seulement notif sans son",
// retour direct 2026-09-01) n'a qu'un seul essai avec la logique
// last_notified_at classique : si le son système n'a pas suffi (téléphone en
// silencieux, Focus/DND — hors de portée du code, voir AlarmPlayer.tsx), il
// n'y a jamais de deuxième chance. Pour un bloc réveil, on relance donc la
// notif à chaque passage du cron (5 min) tant qu'elle n'est pas acquittée
// (alarm_ack_date, bouton "Arrêter" ou clic notif), avec une limite de 30 min
// après l'heure du bloc pour ne pas sonner indéfiniment si oublié.
const ALARM_ESCALATION_WINDOW_MIN = 30;

// Fenêtre d'envoi d'un rappel normal (2026-10-08, retour direct : « quand il
// y a des notifs, c'est pas les bonnes heures ») : avant, un bloc dont l'heure
// était passée partait au passage suivant du cron, même des heures après
// (bloc modifié, cron en retard), avec « commence maintenant ». Un rappel
// n'a de sens qu'au moment du bloc : au delà de 10 minutes, il est sauté.
const SEND_WINDOW_MIN = 10;

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  // Référence Paris seulement pour le nettoyage des blocs ponctuels passés
  // (avec un jour de marge pour les fuseaux en retard sur Paris).
  const parisToday = parisDateStr(now);
  const yesterday = parisDateStr(new Date(now.getTime() - 86400000));

  const supabase = createAdminClient();

  // Nettoyage : la migration 20260901c_schedule_blocks_specific_date
  // prévoyait "un nettoyage quotidien (voir routine Sync Google Calendar)
  // supprime tout bloc dont specific_date est dans le passé", mais cette
  // routine n'a jamais existé — les blocs ponctuels (rendez-vous coiffeur,
  // appels de vente...) s'accumulaient indéfiniment en base. Ce cron tourne
  // déjà toutes les 5 min avec les bons accès, plutôt qu'une routine à
  // part : retour direct 2026-09-09, "ya encore le rdv du coiffeur de la
  // semaine derniere" — l'affichage (WeeklyAgenda.tsx) filtre maintenant
  // aussi ces blocs, mais autant les supprimer réellement plutôt que de
  // laisser la table grossir pour rien.
  await supabase.from("schedule_blocks").delete().not("specific_date", "is", null).lt("specific_date", yesterday);
  void parisToday;

  // Tous les blocs à notifier, évalués chacun à l'heure locale de son
  // propriétaire (user_settings.timezone, Paris par défaut).
  const { data: blocks } = await supabase
    .from("schedule_blocks")
    .select("id, owner_id, day_of_week, start_time, label, notify, last_notified_at, alarm_ack_date, specific_date, skipped_dates")
    .eq("notify", true);
  const rows = (blocks as ScheduleBlockRow[] | null) ?? [];
  const owners = [...new Set(rows.map((b) => b.owner_id))];
  const { data: settings } = owners.length
    ? await supabase.from("user_settings").select("user_id, timezone").in("user_id", owners)
    : { data: [] };
  const tzOf = new Map(((settings ?? []) as { user_id: string; timezone: string | null }[]).map((r) => [r.user_id, safeTimeZone(r.timezone)]));
  const localByOwner = new Map(owners.map((id) => [id, localParts(now, tzOf.get(id) ?? "Europe/Paris")]));

  const due = rows.filter((b) => {
    const local = localByOwner.get(b.owner_id)!;
    if (!isBlockOnDate(b, local.date, local.isoDow)) return false; // autre jour, ponctuel d'une autre date, ou sauté
    const late = minutesBetween(b.start_time, local.time);
    if (late < 0) return false; // pas encore l'heure
    const isAlarm = /r[ée]veil/i.test(b.label);
    if (isAlarm) {
      // Escalade : renvoyer tant que non acquitté, dans la fenêtre de 30 min.
      if (b.alarm_ack_date === local.date) return false; // déjà arrêté par l'utilisateur
      return late <= ALARM_ESCALATION_WINDOW_MIN;
    }
    if (late > SEND_WINDOW_MIN) return false; // trop tard : un rappel en retard n'a plus de sens
    if (b.last_notified_at && localParts(new Date(b.last_notified_at), tzOf.get(b.owner_id) ?? "Europe/Paris").date === local.date) return false; // déjà envoyé aujourd'hui
    return true;
  });

  let sent = 0;
  for (const block of due) {
    // L'agenda vit à un chemin différent selon le rôle (coach ou client) —
    // sans ça, la notif d'un coach le renvoyait vers l'agenda client.
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", block.owner_id)
      .maybeSingle();
    const url = profile?.role === "coach" ? "/dashboard/coach/moi/agenda" : "/dashboard/client/agenda";

    // Un bloc "Réveil" doit vraiment sonner (voir components/ui/AlarmPlayer.tsx),
    // pas juste afficher une notif silencieuse qu'on peut rater en dormant.
    const isAlarm = /r[ée]veil/i.test(block.label);
    const title = `🕐 ${block.label}`;
    const body = `${block.start_time.slice(0, 5)} : ${block.label} commence maintenant.`;
    const result = await sendPushToUser(
      block.owner_id,
      title,
      body,
      url,
      isAlarm ? "alarm" : undefined,
      isAlarm ? block.id : undefined
    );

    // Retour direct 2026-09-09 ("les notif, corrige, yen a plus la") : ce
    // cron n'appelait jamais insertNotification, donc AUCUN rappel d'agenda
    // (repas, seance, steps, bilan...) n'atterrissait jamais dans la cloche
    // in-app - alors que lib/push.ts documente explicitement que sendPushToUser
    // gere le push seul et que "la notif in-app (cloche) est enregistree
    // separement par notifyUser()". Confirme en base : table `notifications`
    // vide pour ce compte malgre ~15-20 rappels d'agenda envoyes par jour.
    // Consequence concrete : si le push OS est rate/repousse/coupe par le
    // telephone (Doze, DND, notif balayee sans etre lue...), il n'existe
    // AUCUNE trace consultable dans l'appli - la cloche ne peut jamais
    // servir de filet de secours. Ecrit desormais la ligne in-app des que
    // le bloc est traite (meme si le push echoue - la cloche est
    // l'historique complet, meme principe que notifyUser), une seule fois
    // par jour et par bloc : last_notified_at avance maintenant meme si le
    // push echoue (sinon, un compte sans abonnement push ou en heures de
    // silence redeclencherait ce meme bloc, et donc une nouvelle ligne en
    // cloche, a chaque passage du cron - toutes les 5 min - pour le reste
    // de la journee). Les reveils gardent leur propre re-essai du push
    // (isAlarm, base sur alarm_ack_date, jamais sur last_notified_at) mais
    // n'ecrivent, eux aussi, qu'une seule ligne en cloche par jour.
    const ownerTz = tzOf.get(block.owner_id) ?? "Europe/Paris";
    const alreadyNotifiedToday =
      !!block.last_notified_at && localParts(new Date(block.last_notified_at), ownerTz).date === localByOwner.get(block.owner_id)!.date;
    if (!alreadyNotifiedToday) {
      await insertNotification({ userId: block.owner_id, type: "schedule_block", title, body, url });
    }

    if (result.ok) {
      sent++;
    } else if (result.reason && result.reason !== "no subscription" && result.reason !== "quiet hours") {
      // "no subscription" et "quiet hours" sont des cas normaux (push
      // jamais activé, ou volontairement coupé) — tout le reste est une
      // vraie panne de remise (voir lib/push.ts) qui mérite une trace,
      // au lieu d'être avalée ici comme avant.
      console.error(`schedule-block-notify: push non délivré pour bloc ${block.id} (${block.label}):`, result.reason);
    }
    await supabase
      .from("schedule_blocks")
      .update({ last_notified_at: now.toISOString() })
      .eq("id", block.id);
  }

  return NextResponse.json({ ok: true, checked: due.length, sent });
}
