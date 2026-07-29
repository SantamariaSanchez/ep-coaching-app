-- ═══════════════════════════════════════════════════════════════════════
-- EP Coaching — Préférences membre (questionnaire de personnalisation)
-- Exécute dans Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════
-- Contexte : questionnaire de 5 min proposé à l'onboarding pour adapter
-- l'appli au profil de la personne (débutant vs confirmé, objectif,
-- rapport au tracking...). Une ligne par profil, jamais obligatoire —
-- l'app doit fonctionner sans (segment par défaut appliqué côté code).
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists public.member_preferences (
  id uuid primary key references public.profiles(id) on delete cascade,
  experience_level text check (experience_level in ('debutant', 'intermediaire', 'confirme')),
  primary_goal text check (primary_goal in ('perte_poids', 'prise_muscle', 'performance', 'sante_bien_etre', 'remise_en_forme')),
  training_frequency text check (training_frequency in ('0', '1-2', '3-4', '5+')),
  tracks_nutrition text check (tracks_nutrition in ('jamais', 'parfois', 'toujours')),
  biggest_obstacle text check (biggest_obstacle in ('manque_de_temps', 'manque_de_motivation', 'sais_pas_par_ou_commencer', 'deja_essaye_sans_resultat')),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.member_preferences enable row level security;

drop policy if exists "Users manage own preferences" on public.member_preferences;
create policy "Users manage own preferences" on public.member_preferences
  for all using (id = auth.uid() or public.is_coach())
  with check (id = auth.uid());
