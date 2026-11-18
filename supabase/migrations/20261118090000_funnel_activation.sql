-- C64 : moment de première valeur et retour à J+7, lus dans les tables d'usage
-- existantes (aucun nouveau suivi, aucune donnée de santé exposée : seulement
-- des comptes). Réservé au service_role (page Leads du propriétaire).
create or replace function public.funnel_activation(p_since timestamptz)
returns table (
  members int, members_first_value int, members_cohort7 int, members_returned7 int,
  coaches int, coaches_first_value int
)
language sql
stable
security definer
set search_path = public
as $$
  with inscrits as (
    select p.id, p.role, p.terms_accepted_at as t0
    from profiles p
    where p.terms_accepted_at >= p_since
      and coalesce(p.is_platform_owner, false) = false
      and coalesce(p.email, '') not ilike '%@epcoaching.app'
  ),
  usage as (
    select client_id as uid, created_at as at from sessions where is_completed
    union all select client_id, created_at from workout_logs
    union all select client_id, created_at from food_logs
    union all select client_id, updated_at from meal_checks
    union all select client_id, created_at from daily_logs
    union all select client_id, created_at from check_ins
    union all select client_id, created_at from step_logs
  ),
  membres as (
    select i.id, i.t0,
      exists (select 1 from sessions s where s.client_id = i.id and s.is_completed)
        or exists (select 1 from workout_logs w where w.client_id = i.id)
        or exists (select 1 from food_logs f where f.client_id = i.id) as valeur,
      i.t0 <= now() - interval '7 days' as cohorte7,
      exists (select 1 from usage u where u.uid = i.id and u.at >= i.t0 + interval '7 days') as revenu7
    from inscrits i where i.role = 'client'
  ),
  coachs as (
    select i.id,
      exists (select 1 from profiles c where c.coach_id = i.id and c.id <> i.id)
        or exists (select 1 from program_templates pt where pt.coach_id = i.id) as valeur
    from inscrits i where i.role = 'coach'
  )
  select
    (select count(*) from membres)::int,
    (select count(*) from membres where valeur)::int,
    (select count(*) from membres where cohorte7)::int,
    (select count(*) from membres where cohorte7 and revenu7)::int,
    (select count(*) from coachs)::int,
    (select count(*) from coachs where valeur)::int;
$$;

revoke all on function public.funnel_activation(timestamptz) from public, anon, authenticated;
grant execute on function public.funnel_activation(timestamptz) to service_role;
