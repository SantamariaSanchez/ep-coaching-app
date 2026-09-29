-- Personnalisation de l'appli (demande directe 2026-09-29 : "poser des
-- questions pour bien configurer et n'utiliser que ce qui est nécessaire").
-- Une ligne par utilisateur (membre, client, coach) : les réponses au
-- questionnaire "Mon appli" et les modules actifs qui en découlent (suivis,
-- champs du bilan, outils coach). Tout module absent = actif, pour ne
-- jamais rien retirer à quelqu'un qui n'a pas encore répondu.

create table if not exists public.user_app_setup (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  modules jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.user_app_setup enable row level security;

drop policy if exists "own app setup" on public.user_app_setup;
create policy "own app setup" on public.user_app_setup
  for all using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Le coach lit la configuration de ses membres (pour savoir ce qu'ils suivent).
drop policy if exists "coach reads members app setup" on public.user_app_setup;
create policy "coach reads members app setup" on public.user_app_setup
  for select using (exists (select 1 from public.profiles p where p.id = user_app_setup.user_id and p.coach_id = (select auth.uid())));

-- Taux de masse grasse dans les mensurations (en %), et comment il a été mesuré.
alter table public.measurements add column if not exists body_fat numeric check (body_fat is null or (body_fat >= 2 and body_fat <= 70));
alter table public.measurements add column if not exists body_fat_method text;

notify pgrst, 'reload schema';
