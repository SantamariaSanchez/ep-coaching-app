-- Cases « mangé » de la diète (2026-10-14). Retour direct du fondateur :
-- « quand je vais sur ma diète je veux savoir ce que je mange, combien,
-- quand, et si j'ai bien suivi ma diète ». Un tap par repas suffit : mangé,
-- remplacé par un équivalent, écart, ou sauté. Sert au taux de suivi du jour
-- et de la semaine, sans saisie lourde.
--
-- Rejouable : tout est en "if not exists" / "drop policy if exists".

create table if not exists public.meal_checks (
  client_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  meal_slot text not null check (length(meal_slot) between 1 and 40),
  status text not null check (status in ('mange', 'remplace', 'ecart', 'saute')),
  note text check (note is null or length(note) <= 200),
  updated_at timestamptz not null default now(),
  primary key (client_id, log_date, meal_slot)
);

create index if not exists meal_checks_client_date_idx on public.meal_checks(client_id, log_date desc);

alter table public.meal_checks enable row level security;

-- Chacun gère ses cases ; son coach peut les lire (suivi de l'adhérence).
drop policy if exists meal_checks_owner on public.meal_checks;
create policy meal_checks_owner on public.meal_checks
  for all using (client_id = (select auth.uid())) with check (client_id = (select auth.uid()));

drop policy if exists meal_checks_coach_read on public.meal_checks;
create policy meal_checks_coach_read on public.meal_checks
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = meal_checks.client_id and p.coach_id = (select auth.uid())
    )
  );

notify pgrst, 'reload schema';
