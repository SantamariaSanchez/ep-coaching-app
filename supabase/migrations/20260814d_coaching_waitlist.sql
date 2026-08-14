-- Item 45 (chantier 50 idees) : liste d'attente coaching, pour le cas ou
-- un coach est a capacite et ne veut pas activer de nouveaux clients tout
-- de suite. Colonne dediee sur profiles (coach uniquement, mais pas
-- restreinte par role au niveau DB, meme convention que invite_code) +
-- table de la liste elle-meme.
alter table public.profiles add column if not exists accepting_new_clients boolean not null default true;

create table if not exists public.coaching_waitlist (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  note text,
  created_at timestamptz not null default now(),
  contacted_at timestamptz,
  unique (coach_id, member_id)
);

create index if not exists coaching_waitlist_coach_id_idx on public.coaching_waitlist(coach_id);

alter table public.coaching_waitlist enable row level security;

drop policy if exists "Member manages own waitlist entry" on public.coaching_waitlist;
create policy "Member manages own waitlist entry" on public.coaching_waitlist
  for all using (member_id = auth.uid())
  with check (member_id = auth.uid());

drop policy if exists "Coach manages own waitlist" on public.coaching_waitlist;
create policy "Coach manages own waitlist" on public.coaching_waitlist
  for all using (coach_id = auth.uid())
  with check (coach_id = auth.uid());
