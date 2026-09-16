-- Suivi de performance mailing (2026-09-16) : retour direct de
-- l'utilisateur ("travaille encore plus sur le mailing et derrière le
-- tracking des données : taux d'ouverture, de clic etc, dans l'appli en
-- tant que coach"). Lecture à la demande de l'API Brevo (GET
-- /v3/emailCampaigns/{id}), pas de webhook (l'utilisateur non-développeur
-- ne peut pas le configurer côté Brevo lui-même) — voir lib/brevo-stats.ts.
--
-- stats_json : dernier snapshot récupéré (structure CampaignStats, voir
-- lib/brevo-stats.ts), mis en cache plutôt que refetché à chaque rendu de
-- la page mailing : les stats Brevo ne sont pas temps réel juste après un
-- envoi, et chaque appel consomme le quota d'API du compte Brevo (partagé
-- avec les emails critiques de l'appli, voir MAX_RECIPIENTS_PER_SEND dans
-- lib/brevo-mailing.ts).
-- stats_fetched_at : horodatage du dernier fetch, affiché au coach pour
-- qu'il comprenne que ce n'est pas du temps réel. NULL tant que personne
-- n'a cliqué sur "Rafraîchir les stats" pour cet envoi.
alter table public.coach_mailings
  add column if not exists stats_json jsonb,
  add column if not exists stats_fetched_at timestamptz;
