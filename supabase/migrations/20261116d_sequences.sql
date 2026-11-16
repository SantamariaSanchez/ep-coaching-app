-- Séquences de mails automatiques (lib/sequences.ts).
-- prospect_bookings : chaque audit stratégique pris sur Calendly, même
-- quand personne dans l'équipe ne le reçoit (avant, ces rendez-vous étaient
-- ignorés sans closer). sequence_sends : une ligne par mail envoyé, unique
-- par (parcours, cible, étape), pour qu'aucune étape ne parte deux fois.
create table if not exists public.prospect_bookings (
  event_uri text primary key,
  starts_at timestamptz not null,
  status text not null default 'active' check (status in ('active', 'canceled')),
  name text,
  email text,
  join_url text,
  updated_at timestamptz not null default now()
);
create index if not exists prospect_bookings_starts_idx on public.prospect_bookings (starts_at);
alter table public.prospect_bookings enable row level security;

create table if not exists public.sequence_sends (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('lead', 'audit', 'onboarding')),
  target text not null,
  step text not null,
  email text,
  sent_at timestamptz not null default now(),
  unique (kind, target, step)
);
alter table public.sequence_sends enable row level security;

do $$
declare
  secret text;
begin
  select substring(command from 'Bearer ([^'']+)') into secret
  from cron.job
  where command like '%Bearer %' and command not like '%REPLACE_WITH_CRON_SECRET%'
  limit 1;
  if secret is null then
    raise notice 'Aucun job cron avec un vrai secret trouvé : sequences n''est pas planifié.';
    return;
  end if;
  perform cron.unschedule('sequences') where exists (select 1 from cron.job where jobname = 'sequences');
  perform cron.schedule(
    'sequences',
    '*/10 * * * *',
    format(
      $job$select net.http_get(url := 'https://ep-coaching.vercel.app/api/cron/sequences', headers := jsonb_build_object('Authorization', 'Bearer %s'), timeout_milliseconds := 10000);$job$,
      secret
    )
  );
end $$;
