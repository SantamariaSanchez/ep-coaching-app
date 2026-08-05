-- Rate limiting generique, meme principe que le throttling de connexion
-- (20260805f_login_attempt_throttling.sql) : un compteur en base, pas de Redis.
-- Vercel execute chaque requete dans une instance potentiellement differente,
-- un compteur en RAM ne bloquerait rien.
--
-- La table et la fonction sont reservees a la service_role : rien n'est
-- appelable depuis le navigateur, sinon un attaquant remettrait simplement son
-- propre compteur a zero.

create table if not exists public.rate_limit_counters (
  bucket            text primary key,
  hits              integer     not null default 0,
  window_started_at timestamptz not null default now(),
  last_hit_at       timestamptz not null default now()
);

alter table public.rate_limit_counters enable row level security;
-- Aucune policy volontairement : seule la service_role (qui bypass RLS) ecrit.

revoke all on table public.rate_limit_counters from anon, authenticated;

create index if not exists rate_limit_counters_last_hit_at_idx
  on public.rate_limit_counters (last_hit_at);

-- Incremente le compteur du bucket et renvoie le nombre de secondes a attendre
-- avant de reessayer. Renvoie 0 quand la requete est autorisee.
--
-- Fenetre fixe : le compteur repart de 1 des que la fenetre precedente est
-- expiree. Simple, previsible, et suffisant pour bloquer un abus manifeste.
create or replace function public.consume_rate_limit(
  p_key             text,
  p_limit           integer,
  p_window_seconds  integer
)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_window  interval := make_interval(secs => greatest(1, p_window_seconds));
  v_key     text     := left(coalesce(p_key, ''), 200);
  v_hits    integer;
  v_started timestamptz;
begin
  if v_key = '' or p_limit is null or p_limit < 1 then
    return 0;
  end if;

  insert into public.rate_limit_counters as c (bucket, hits, window_started_at, last_hit_at)
  values (v_key, 1, now(), now())
  on conflict (bucket) do update
    set hits = case
          when c.window_started_at < now() - v_window then 1
          else c.hits + 1
        end,
        window_started_at = case
          when c.window_started_at < now() - v_window then now()
          else c.window_started_at
        end,
        last_hit_at = now()
  returning c.hits, c.window_started_at into v_hits, v_started;

  -- Menage opportuniste des vieux compteurs, sans cron dedie.
  if random() < 0.01 then
    delete from public.rate_limit_counters
      where last_hit_at < now() - interval '1 day';
  end if;

  if v_hits > p_limit then
    return greatest(1, ceil(extract(epoch from ((v_started + v_window) - now())))::integer);
  end if;

  return 0;
end;
$$;

revoke all on function public.consume_rate_limit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;
