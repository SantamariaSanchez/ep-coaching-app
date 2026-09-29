-- Stats réseaux pour TOUS les coachs (demande directe 2026-09-29) : chaque
-- coach suit ses propres comptes. Deux sources :
--   - 'windsor' : synchro automatique (compte du fondateur pour l'instant) ;
--   - 'manuel'  : le coach saisit ses chiffres (abonnés, vues, portée...) et
--     ses publications lui-même, depuis Contenu > Mes stats réseaux.
-- Rien n'est supprimé : les comptes existants passent au fondateur.
-- Idempotent : peut être relancée sans risque.

alter table public.social_accounts add column if not exists owner_id uuid references public.profiles(id) on delete cascade;
alter table public.social_accounts add column if not exists source text not null default 'windsor';
alter table public.social_accounts add column if not exists handle text;
-- Objectif d'abonnés (et date visée), fixé par le coach.
alter table public.social_accounts add column if not exists goal_followers bigint;
alter table public.social_accounts add column if not exists goal_date date;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'social_accounts_source_check') then
    alter table public.social_accounts add constraint social_accounts_source_check check (source in ('windsor', 'manuel'));
  end if;
end $$;

update public.social_accounts
set owner_id = (select id from public.profiles where is_platform_owner = true limit 1)
where owner_id is null;

create index if not exists social_accounts_owner_idx on public.social_accounts (owner_id, platform);
-- Un seul compte manuel par coach et par plateforme.
create unique index if not exists social_accounts_manual_unique on public.social_accounts (owner_id, platform) where source = 'manuel';
create index if not exists social_posts_account_published_idx on public.social_posts (account_id, published_at desc);

-- Lecture : chaque coach voit ses propres comptes et tout ce qui en dépend
-- (les policies "owner reads" du fondateur restent en place).
drop policy if exists "coach reads own social_accounts" on public.social_accounts;
create policy "coach reads own social_accounts" on public.social_accounts
  for select using (owner_id = (select auth.uid()));

do $$
declare
  t text;
begin
  foreach t in array array['social_account_daily', 'social_posts', 'social_audience_snapshots']
  loop
    execute format('drop policy if exists "coach reads own %s" on public.%I', t, t);
    execute format(
      'create policy "coach reads own %s" on public.%I for select using (exists (select 1 from public.social_accounts a where a.id = account_id and a.owner_id = (select auth.uid())))',
      t, t
    );
  end loop;
end $$;

drop policy if exists "coach reads own social_post_metrics" on public.social_post_metrics;
create policy "coach reads own social_post_metrics" on public.social_post_metrics
  for select using (exists (
    select 1 from public.social_posts p join public.social_accounts a on a.id = p.account_id
    where p.id = post_id and a.owner_id = (select auth.uid())
  ));

notify pgrst, 'reload schema';
