-- Écosystème connecté de l'équipe (demande directe 2026-09-25 : "connecter
-- tout à tout"). Voir lib/staff-automation.ts pour la logique elle-même :
-- lead magnet et formulaire de préqualification vers le CRM d'un setter,
-- RDV Calendly vers l'agenda d'un closer, paiement Stripe vers vente closée,
-- trésorerie et suivi d'onboarding, candidature vers le pipeline RH.
-- Ré-exécutable sans erreur.

-- Objectifs du mois fixés par la personne (ou le fondateur), affichés en
-- barres de progression sur son tableau de bord.
alter table public.staff_members add column if not exists targets jsonb not null default '{}'::jsonb;

-- Recherche d'un prospect déjà suivi par email ou téléphone, pour ne jamais
-- créer deux fiches pour la même personne quand elle revient par un autre
-- canal (lead magnet puis préqualification puis RDV Calendly).
create index if not exists staff_records_lead_email_idx
  on public.staff_records ((lower(data->>'email'))) where kind = 'lead';
-- Identifiant de la source externe (événement Calendly, paiement Stripe,
-- candidature...) : empêche de créer deux fois le même enregistrement si
-- une synchro repasse dessus. Clé préfixée "_" : jamais écrasée par une
-- modification manuelle (voir internalKeys dans app/equipe/actions.ts).
create index if not exists staff_records_external_idx
  on public.staff_records ((data->>'_external_id')) where data ? '_external_id';

-- Préqualifications déjà envoyées dans un CRM (écrites par l'autre repo
-- ep-coaching-formulaires, reprises ici par le cron staff-sync).
alter table public.prequalification_responses add column if not exists staff_routed_at timestamptz;

-- ── Tâches planifiées ───────────────────────────────────────────────────
-- Le secret CRON_SECRET réel vit uniquement dans les jobs déjà en base
-- (les fichiers du repo contiennent un placeholder) : on le récupère
-- depuis un job existant plutôt que de l'écrire ici.
do $$
declare
  secret text;
begin
  select substring(command from 'Bearer ([^'']+)') into secret
  from cron.job
  where command like '%Bearer %' and command not like '%REPLACE_WITH_CRON_SECRET%'
  limit 1;

  if secret is null then
    raise notice 'Aucun job cron avec un vrai secret trouvé : staff-sync et staff-daily ne sont pas planifiés.';
    return;
  end if;

  perform cron.unschedule('staff-sync') where exists (select 1 from cron.job where jobname = 'staff-sync');
  perform cron.unschedule('staff-daily') where exists (select 1 from cron.job where jobname = 'staff-daily');

  -- Toutes les 5 minutes : préqualifications et RDV Calendly vers les CRM.
  perform cron.schedule(
    'staff-sync',
    '*/5 * * * *',
    format(
      $job$select net.http_get(url := 'https://ep-coaching.vercel.app/api/cron/staff-sync', headers := jsonb_build_object('Authorization', 'Bearer %s'));$job$,
      secret
    )
  );

  -- Toutes les heures : l'endpoint décide lui-même selon l'heure de Paris
  -- (briefing du matin, rappel du rapport du soir), insensible aux
  -- changements d'heure.
  perform cron.schedule(
    'staff-daily',
    '2 * * * *',
    format(
      $job$select net.http_get(url := 'https://ep-coaching.vercel.app/api/cron/staff-daily', headers := jsonb_build_object('Authorization', 'Bearer %s'));$job$,
      secret
    )
  );
end $$;
