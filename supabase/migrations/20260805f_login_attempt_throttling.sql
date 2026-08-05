-- Throttling applicatif des tentatives de connexion.
-- 5 echecs sur un meme email en 15 minutes => verrouillage 15 minutes.
-- Table + fonctions reservees a la service_role (server actions de login) :
-- rien n'est appelable depuis le navigateur, sinon un attaquant pourrait
-- simplement appeler clear_login_attempts pour remettre son compteur a zero.
--
-- Deja appliquee en production via le MCP Supabase le 2026-08-05.

create table if not exists public.auth_login_attempts (
  email             text primary key,
  failed_count      integer     not null default 0,
  window_started_at timestamptz not null default now(),
  locked_until      timestamptz,
  last_attempt_at   timestamptz not null default now()
);

alter table public.auth_login_attempts enable row level security;
-- Aucune policy volontairement : seule la service_role (qui bypass RLS) ecrit.

revoke all on table public.auth_login_attempts from anon, authenticated;

-- Enregistre un echec et renvoie la date de fin de verrouillage si le seuil
-- est atteint (null sinon).
create or replace function public.register_failed_login(p_email text)
returns timestamptz
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_window  interval := interval '15 minutes';
  v_lock    interval := interval '15 minutes';
  v_max     integer  := 5;
  v_email   text     := lower(trim(p_email));
  v_count   integer;
  v_locked  timestamptz;
begin
  if v_email = '' or v_email is null then
    return null;
  end if;

  insert into public.auth_login_attempts as a (email, failed_count, window_started_at, last_attempt_at)
  values (v_email, 1, now(), now())
  on conflict (email) do update
    set failed_count = case
          when a.window_started_at < now() - v_window then 1
          else a.failed_count + 1
        end,
        window_started_at = case
          when a.window_started_at < now() - v_window then now()
          else a.window_started_at
        end,
        last_attempt_at = now()
  returning a.failed_count, a.locked_until into v_count, v_locked;

  if v_count >= v_max then
    update public.auth_login_attempts
      set locked_until = now() + v_lock
      where email = v_email
      returning locked_until into v_locked;
  else
    v_locked := null;
  end if;

  -- Menage opportuniste des vieilles lignes, sans cron dedie.
  if random() < 0.02 then
    delete from public.auth_login_attempts
      where last_attempt_at < now() - interval '1 day';
  end if;

  return v_locked;
end;
$$;

-- Renvoie la fin du verrouillage en cours, ou null si l'email n'est pas bloque.
create or replace function public.check_login_lock(p_email text)
returns timestamptz
language sql
stable
security definer
set search_path to 'public'
as $$
  select locked_until
  from public.auth_login_attempts
  where email = lower(trim(p_email))
    and locked_until is not null
    and locked_until > now();
$$;

-- Remise a zero apres une connexion reussie.
create or replace function public.clear_login_attempts(p_email text)
returns void
language sql
security definer
set search_path to 'public'
as $$
  delete from public.auth_login_attempts where email = lower(trim(p_email));
$$;

revoke all on function public.register_failed_login(text) from public, anon, authenticated;
revoke all on function public.check_login_lock(text)      from public, anon, authenticated;
revoke all on function public.clear_login_attempts(text)  from public, anon, authenticated;

grant execute on function public.register_failed_login(text) to service_role;
grant execute on function public.check_login_lock(text)      to service_role;
grant execute on function public.clear_login_attempts(text)  to service_role;
