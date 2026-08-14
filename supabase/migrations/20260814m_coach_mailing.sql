-- Axe 2 (VISION.md) : mailing par coach, décision retenue = segmentation
-- par tag/liste sous le compte Brevo unique existant (pas de sous-comptes
-- séparés). brevo_list_id : liste Brevo dédiée à ce coach, créée à la
-- volée au premier envoi (voir lib/brevo-mailing.ts).
alter table public.profiles add column if not exists brevo_list_id integer;

create table if not exists public.coach_mailings (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  subject text not null,
  recipient_count integer not null default 0,
  brevo_campaign_id integer,
  status text not null default 'sent' check (status in ('sent', 'failed')),
  created_at timestamptz not null default now()
);

create index if not exists coach_mailings_coach_id_idx on public.coach_mailings(coach_id, created_at desc);

alter table public.coach_mailings enable row level security;

drop policy if exists "Coach manages own mailings" on public.coach_mailings;
create policy "Coach manages own mailings" on public.coach_mailings
  for all using (coach_id = auth.uid())
  with check (coach_id = auth.uid());
