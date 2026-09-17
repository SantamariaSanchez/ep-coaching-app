-- ═══════════════════════════════════════════════════════════════════════
-- EP Coaching — Note client persistante par exercice (Logbook)
-- ═══════════════════════════════════════════════════════════════════════
-- Retour direct 2026-09-17 : "pour les notes de réglage il y a une note ok
-- mais vérifie que c'est bien une note qui reste et qui n'est pas là que
-- sur cette séance mais toujours toujours, et qu'on peut modifier en
-- permanence". Avant cette migration, la note "Ton exercice" du Logbook
-- (SessionView.tsx) vivait en localStorage, clé par sessionId — donc
-- remise à zéro à chaque nouvelle séance, jamais vraiment persistante. Une
-- seule ligne par (client, exercice), indépendante de toute séance
-- précise : le vrai réglage/ressenti qu'on veut retrouver identique la
-- prochaine fois qu'on tombe sur cet exercice, modifiable à tout moment.
create table if not exists public.client_exercise_notes (
  client_id uuid not null references public.profiles(id) on delete cascade,
  exercise_name text not null,
  note text not null default '',
  updated_at timestamptz not null default now(),
  primary key (client_id, exercise_name)
);

alter table public.client_exercise_notes enable row level security;

drop policy if exists "Client manages own exercise notes" on public.client_exercise_notes;
create policy "Client manages own exercise notes" on public.client_exercise_notes
  for all using (client_id = auth.uid())
  with check (client_id = auth.uid());

drop policy if exists "Coach reads own client exercise notes" on public.client_exercise_notes;
create policy "Coach reads own client exercise notes" on public.client_exercise_notes
  for select using (public.is_own_coach(client_id));
