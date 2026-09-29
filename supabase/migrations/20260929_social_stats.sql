-- Stats réseaux sociaux (demande directe 2026-09-29) : toutes les stats
-- d'Instagram, TikTok, YouTube, Facebook, LinkedIn et Threads, récupérées
-- via Windsor.ai, avec un historique complet et une synchro hebdomadaire.
-- Ajouter une plateforme plus tard = une valeur de plus dans le check.
--
-- Lecture réservée au propriétaire de la plateforme (profiles.is_platform_owner).
-- Toutes les écritures passent par le serveur avec la service role
-- (lib/social/*), aucune policy d'écriture n'est donc créée.
-- Idempotent : peut être relancée sans risque.

-- ── Comptes suivis ──────────────────────────────────────────────────────
create table if not exists public.social_accounts (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('instagram', 'tiktok', 'youtube', 'facebook', 'linkedin', 'threads')),
  connector text not null,
  external_account_id text not null,
  name text not null,
  active boolean not null default true,
  -- Curseur du backfill historique (date la plus ancienne déjà remontée).
  backfill_until date,
  backfill_done boolean not null default false,
  created_at timestamptz not null default now(),
  unique (platform, external_account_id)
);

-- ── Métriques du compte, une ligne par jour ─────────────────────────────
create table if not exists public.social_account_daily (
  account_id uuid not null references public.social_accounts(id) on delete cascade,
  date date not null,
  followers_total bigint,
  followers_gained bigint,
  followers_lost bigint,
  views bigint,
  reach bigint,
  impressions bigint,
  profile_views bigint,
  likes bigint,
  comments bigint,
  shares bigint,
  clicks bigint,
  engagements bigint,
  watch_time_seconds numeric,
  -- Tous les champs bruts renvoyés par Windsor pour ce jour (spécifiques
  -- à chaque plateforme), pour ne jamais perdre une donnée disponible.
  extra jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now(),
  primary key (account_id, date)
);
create index if not exists social_account_daily_date_idx on public.social_account_daily (date);

-- ── Publications (post, vidéo, reel) ────────────────────────────────────
create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.social_accounts(id) on delete cascade,
  platform text not null,
  external_post_id text not null,
  caption text,
  post_type text,
  published_at timestamptz,
  url text,
  thumbnail_url text,
  duration_seconds numeric,
  -- Script du Studio créatif dont vient ce contenu : relie les vraies stats
  -- à l'écriture, pour savoir quoi réitérer.
  script_id uuid references public.coach_scripts(id) on delete set null,
  script_link_source text check (script_link_source in ('auto', 'manuel')),
  -- Dernières valeurs connues (copie du dernier snapshot, pour trier vite).
  views bigint,
  reach bigint,
  impressions bigint,
  likes bigint,
  comments bigint,
  shares bigint,
  saves bigint,
  clicks bigint,
  new_followers bigint,
  avg_watch_seconds numeric,
  completion_rate numeric,
  engagement_rate numeric,
  extra jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_synced_at timestamptz not null default now(),
  unique (account_id, external_post_id)
);
create index if not exists social_posts_platform_published_idx on public.social_posts (platform, published_at desc);
create index if not exists social_posts_script_idx on public.social_posts (script_id) where script_id is not null;

-- ── Évolution d'une publication, un snapshot par jour de synchro ───────
create table if not exists public.social_post_metrics (
  post_id uuid not null references public.social_posts(id) on delete cascade,
  snapshot_date date not null,
  views bigint,
  reach bigint,
  impressions bigint,
  likes bigint,
  comments bigint,
  shares bigint,
  saves bigint,
  clicks bigint,
  new_followers bigint,
  avg_watch_seconds numeric,
  total_watch_seconds numeric,
  completion_rate numeric,
  engagement_rate numeric,
  extra jsonb not null default '{}'::jsonb,
  primary key (post_id, snapshot_date)
);
create index if not exists social_post_metrics_date_idx on public.social_post_metrics (snapshot_date);

-- ── Audience (âge, genre, pays, villes, heures, fonction, secteur...) ──
create table if not exists public.social_audience_snapshots (
  account_id uuid not null references public.social_accounts(id) on delete cascade,
  snapshot_date date not null,
  dimension text not null,
  value text not null,
  share numeric,
  count numeric,
  primary key (account_id, snapshot_date, dimension, value)
);
create index if not exists social_audience_dimension_idx on public.social_audience_snapshots (account_id, dimension, snapshot_date desc);

-- ── Journal des synchros ────────────────────────────────────────────────
create table if not exists public.social_sync_runs (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  trigger text not null default 'cron' check (trigger in ('cron', 'manuel', 'backfill', 'script')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running', 'success', 'partial', 'error')),
  rows_written integer not null default 0,
  error text,
  details jsonb not null default '{}'::jsonb
);
create index if not exists social_sync_runs_started_idx on public.social_sync_runs (platform, started_at desc);

-- ── Récap hebdomadaire (aussi envoyé dans Notion quand c'est configuré) ─
create table if not exists public.social_weekly_recaps (
  week_start date primary key,
  content jsonb not null,
  markdown text not null,
  notion_page_id text,
  created_at timestamptz not null default now()
);

-- ── Sécurité : lecture propriétaire uniquement ──────────────────────────
do $$
declare
  t text;
begin
  foreach t in array array['social_accounts', 'social_account_daily', 'social_posts', 'social_post_metrics', 'social_audience_snapshots', 'social_sync_runs', 'social_weekly_recaps']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "owner reads %s" on public.%I', t, t);
    execute format(
      'create policy "owner reads %s" on public.%I for select using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_platform_owner = true))',
      t, t
    );
  end loop;
end $$;

-- ── Comptes suivis au 2026-09-29 (Windsor) ──────────────────────────────
insert into public.social_accounts (platform, connector, external_account_id, name) values
  ('tiktok', 'tiktok_organic', '_000Nb3k2o7r2gqjKvTdhhGZttjtz6mbSyhX', 'Emmanuel Santamaria Sanchéz'),
  ('linkedin', 'linkedin_organic', '146645699', 'EP Coaching'),
  ('youtube', 'youtube', '39124', 'EP Coaching (YouTube)'),
  ('facebook', 'facebook_organic', '1300029156523458', 'EP Coaching'),
  -- Identifiants Windsor pas encore connus : "auto:" = le compte connecté
  -- à ce connecteur dans Windsor (voir accountFilter dans lib/social/sync.ts).
  ('instagram', 'instagram', 'auto:santamariasanchezep', '@santamariasanchezep'),
  ('threads', 'threads', 'auto:santamariasanchezep', '@santamariasanchezep')
on conflict (platform, external_account_id) do nothing;

-- ── Synchro hebdomadaire : lundi vers 6h, heure de Paris ────────────────
-- pg_cron tourne en UTC. 6h à Paris = 4h UTC en été, 5h UTC en hiver : le
-- job est planifié aux deux heures et la route ne lance la synchro que s'il
-- est bien 6h à Paris (paramètre auto=1), insensible au changement d'heure.
-- Le secret CRON_SECRET réel est repris d'un job existant (même méthode que
-- 20260925b_staff_automation.sql), jamais écrit dans ce fichier.
do $$
declare
  secret text;
begin
  select substring(command from 'Bearer ([^'']+)') into secret
  from cron.job
  where command like '%Bearer %' and command not like '%REPLACE_WITH_CRON_SECRET%'
  limit 1;

  if secret is null then
    raise notice 'Aucun job cron avec un vrai secret trouvé : social-sync-weekly n''est pas planifié.';
    return;
  end if;

  perform cron.unschedule('social-sync-weekly') where exists (select 1 from cron.job where jobname = 'social-sync-weekly');
  perform cron.schedule(
    'social-sync-weekly',
    '0 4,5 * * 1',
    format(
      $job$select net.http_get(url := 'https://ep-coaching.vercel.app/api/cron/social-sync?auto=1', headers := jsonb_build_object('Authorization', 'Bearer %s'), timeout_milliseconds := 10000);$job$,
      secret
    )
  );
end $$;

notify pgrst, 'reload schema';
