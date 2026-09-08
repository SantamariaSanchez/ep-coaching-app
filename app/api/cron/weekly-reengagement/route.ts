import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { sendPushToUser } from "@/lib/push";
import { sendBrevoEmail } from "@/utils/brevo";
import {
  REENGAGEMENT_STEPS,
  buildMessage,
  categoryForGoal,
  pickGuide,
  type GuideRef,
} from "@/lib/reengagement";

// Relance des membres dormants, en séquence (voir lib/reengagement.ts
// pour le contenu et le raisonnement derrière chaque étape). Le nom de la
// route ("weekly") est un vestige : le job pg_cron qui l'appelle tourne
// désormais tous les jours (voir plus bas pourquoi), gardé tel quel plutôt
// que renommé pour un simple changement de fréquence.
//
// Corrigé le 2026-09-08 après lecture des vraies données : 14 membres sur 15
// n'avaient jamais fait la moindre action et la dernière connexion de presque
// tous était le jour de leur inscription. Quatre défauts expliquaient qu'ils
// ne recevaient rien d'utile :
//   1. le filtre `onboarding_completed_at not null` excluait précisément ceux
//      qui décrochent le premier jour, donc la population à récupérer ;
//   2. le message était tiré au hasard parmi 5 textes génériques, répétés
//      indéfiniment, sans jamais rien apporter ;
//   3. aucune notion de progression : impossible de varier l'angle ni de
//      s'arrêter proprement ;
//   4. le cron lui-même ne tournait qu'une fois par semaine (lundi) : un
//      membre inscrit le mardi et resté inactif attendait jusqu'à 6 jours
//      avant le tout premier message, en plein milieu de la fenêtre où son
//      intérêt est le plus fort. Passé à un passage quotidien le même jour :
//      la vraie garde anti-spam reste MIN_DAYS_BETWEEN_MESSAGES ci-dessous
//      (6 jours par personne), la fréquence du cron ne change que le délai
//      maximum avant le premier contact, pas le rythme des suivants.
//
// Un membre actif (check-in, repas loggé ou séance récente) n'est jamais
// relancé : la séquence ne s'adresse qu'à ceux qui ne reviennent pas.

const DORMANT_DAYS = 10;
const MIN_DAYS_BETWEEN_MESSAGES = 6;

interface ClientRow {
  id: string;
  full_name: string | null;
  email: string | null;
  reengagement_step: number | null;
}

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://ep-coaching.vercel.app";
  const now = Date.now();
  const cooldown = new Date(now - MIN_DAYS_BETWEEN_MESSAGES * 24 * 60 * 60 * 1000).toISOString();
  const dormantSince = new Date(now - DORMANT_DAYS * 24 * 60 * 60 * 1000).toISOString();

  // Tous les clients pas encore arrivés au bout de la séquence et hors période
  // de refroidissement. Volontairement sans filtre sur l'onboarding : c'est le
  // bug qui privait de relance ceux qui abandonnent dès la première session.
  const { data: clients } = await supabase
    .from("profiles")
    .select("id, full_name, email, reengagement_step")
    .eq("role", "client")
    .lt("reengagement_step", REENGAGEMENT_STEPS)
    .or(`last_reengagement_notified_at.is.null,last_reengagement_notified_at.lt.${cooldown}`);

  const rows = (clients as ClientRow[] | null) ?? [];
  let pushed = 0;
  let emailed = 0;
  let skippedActive = 0;

  for (const client of rows) {
    // Un membre qui vit dans l'appli n'a rien à faire dans une séquence de
    // relance : on vérifie les trois signaux d'activité réels avant d'écrire.
    const [checkins, foodLogs, sessions] = await Promise.all([
      supabase
        .from("check_ins")
        .select("id", { count: "exact", head: true })
        .eq("client_id", client.id)
        .gte("created_at", dormantSince),
      supabase
        .from("food_logs")
        .select("id", { count: "exact", head: true })
        .eq("client_id", client.id)
        .gte("created_at", dormantSince),
      supabase
        .from("sessions")
        .select("id", { count: "exact", head: true })
        .eq("client_id", client.id)
        .gte("created_at", dormantSince),
    ]);
    const isActive =
      (checkins.count ?? 0) > 0 || (foodLogs.count ?? 0) > 0 || (sessions.count ?? 0) > 0;
    if (isActive) {
      skippedActive++;
      continue;
    }

    const step = (client.reengagement_step ?? 0) + 1;

    // Objectif réellement déclaré par le membre, jamais supposé : sert à la
    // fois à personnaliser le texte et à choisir la catégorie du guide offert.
    const { data: intake } = await supabase
      .from("client_intake")
      .select("goal_3_months")
      .eq("client_id", client.id)
      .maybeSingle();
    const goal = (intake as { goal_3_months: string | null } | null)?.goal_3_months ?? null;

    const { data: guides } = await supabase
      .from("lead_magnets")
      .select("slug, title, hook")
      .eq("published", true)
      .eq("category", categoryForGoal(goal))
      .limit(60);
    const guide = pickGuide((guides as GuideRef[] | null) ?? [], client.id, step);

    const message = buildMessage(step, {
      firstName: client.full_name?.split(" ")[0] ?? "",
      goal,
      guide,
      appUrl,
    });

    // Push d'abord (gratuit et immédiat), email en repli dès que le push
    // échoue pour n'importe quelle raison : sans abonnement, abonnement expiré
    // ou navigateur qui a révoqué l'autorisation, le membre doit être joint.
    const pushResult = await sendPushToUser(
      client.id,
      message.pushTitle,
      message.pushBody,
      message.pushUrl
    );

    let notified = false;
    if (pushResult.ok) {
      pushed++;
      notified = true;
    }
    // L'email part même quand le push a fonctionné : sur cette séquence, le
    // contenu utile (le guide) vit dans l'email, la notification n'est qu'un
    // rappel court qui ne peut pas le porter.
    if (client.email) {
      const sent = await sendBrevoEmail({
        to: client.email,
        subject: message.subject,
        htmlContent: message.html,
      });
      if (sent) {
        emailed++;
        notified = true;
      }
    }

    if (notified) {
      await supabase
        .from("profiles")
        .update({
          reengagement_step: step,
          last_reengagement_notified_at: new Date().toISOString(),
        })
        .eq("id", client.id);
    }
  }

  return NextResponse.json({
    ok: true,
    candidates: rows.length,
    skippedActive,
    pushed,
    emailed,
  });
}
