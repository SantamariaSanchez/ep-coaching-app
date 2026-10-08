-- Contenus publiés (2026-10-08) : retour direct du fondateur, « quand c'est
-- posté, enlève le script, sinon on en aura à l'infini ». Publier un script
-- le supprime du Studio ; cette table garde juste de quoi ne jamais répéter
-- un sujet (titre, accroche, pilier, source), lue par les routines.

create table if not exists public.content_published_log (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  hook text,
  pillar text,
  platform text,
  source_reference text,
  published_at timestamptz not null default now()
);
create index if not exists content_published_log_coach_idx on public.content_published_log (coach_id, published_at desc);

alter table public.content_published_log enable row level security;
drop policy if exists content_published_log_owner on public.content_published_log;
create policy content_published_log_owner on public.content_published_log
  for select using (coach_id = (select auth.uid()));

-- Un post écrit (LinkedIn, Threads) arrive toujours « à publier » : seul le
-- geste « Publié » dans l'appli le sort du Studio.
create or replace function public.coach_scripts_written_to_publish()
returns trigger language plpgsql as $$
begin
  if new.platform in ('linkedin', 'threads') and new.status = 'publie' then
    new.status := 'a_tourner';
  end if;
  return new;
end;
$$;
drop trigger if exists coach_scripts_written_to_publish on public.coach_scripts;
create trigger coach_scripts_written_to_publish before insert on public.coach_scripts
  for each row execute function public.coach_scripts_written_to_publish();
