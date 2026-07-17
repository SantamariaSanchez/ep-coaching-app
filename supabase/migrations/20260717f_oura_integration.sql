-- Connexion Oura Ring (onglet Sommeil, ex-Tracking) — stocke les tokens
-- OAuth par utilisateur connecté, et planifie la synchro quotidienne.
-- Exécute ce fichier dans le Supabase SQL Editor.
-- IMPORTANT : remplace REPLACE_WITH_CRON_SECRET par la vraie valeur de
-- CRON_SECRET (Vercel) avant d'exécuter cette migration.

create table if not exists oura_connections (
  client_id uuid primary key references profiles(id) on delete cascade,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  connected_at timestamptz not null default now(),
  last_synced_at timestamptz
);

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('sync-oura')
where exists (select 1 from cron.job where jobname = 'sync-oura');

-- Une fois par jour à 7h UTC — laisse le temps à Oura de traiter la nuit
-- écoulée avant qu'on aille chercher les données.
select cron.schedule(
  'sync-oura',
  '0 7 * * *',
  $$
  select net.http_get(
    url := 'https://ep-coaching.vercel.app/api/cron/sync-oura',
    headers := jsonb_build_object(
      'Authorization', 'Bearer REPLACE_WITH_CRON_SECRET'
    )
  );
  $$
);
