-- ═══════════════════════════════════════════════════════════════════════
-- EP Coaching — Création de la table check_ins (jamais créée)
-- Exécute dans Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════
-- Contexte : la table "check_ins" est référencée partout dans le code
-- (soumission du check-in hebdo client, bilans coach, alertes analytics,
-- stats roadmap) mais n'a jamais été créée par aucune migration — seule
-- une entrée "DISABLE ROW LEVEL SECURITY IF EXISTS" y faisait référence.
-- Résultat : chaque soumission de check-in échouait en base, et toutes les
-- alertes coach basées dessus (check-in manquant, poids stagnant, bilan en
-- retard, récupération HRV/sommeil) étaient silencieusement vides.
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists public.check_ins (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  week_number integer not null,
  created_at timestamptz not null default now(),

  -- Mesures
  weight numeric,
  weight_avg numeric,
  nutrition_adherence numeric,
  calories_per_day numeric,
  steps_per_day numeric,
  sleep_hours numeric,
  hrv numeric,
  resting_hr numeric,
  digestion numeric,
  general_feeling numeric,

  -- Questions qualitatives du check-in hebdo client
  physique_feeling text,
  energy_mood text,
  biggest_win text,
  training_review text,
  nutrition_review text,
  digestion_review text,
  work_impact text,
  sleep_review text,
  upcoming_obstacles text,
  coach_questions text,
  additional_notes text,

  -- Liens médias
  photo_drive_link text,
  video_drive_link text,

  -- Retour libre du coach sur le check-in
  client_notes text,
  coach_notes text,
  coach_rating integer check (coach_rating between 1 and 10),
  coach_replied_at timestamptz,

  -- Système de bilan hebdo (coach → client)
  bilan_text text,
  bilan_rating integer check (bilan_rating between 1 and 10),
  bilan_sent_at timestamptz,

  unique (client_id, week_start)
);

create index if not exists idx_check_ins_client on public.check_ins(client_id, week_start desc);
create index if not exists idx_check_ins_bilan_pending on public.check_ins(bilan_sent_at) where bilan_sent_at is null;

alter table public.check_ins enable row level security;

drop policy if exists "Users manage own check-ins" on public.check_ins;
create policy "Users manage own check-ins" on public.check_ins
  for all using (client_id = auth.uid() or public.is_coach())
  with check (client_id = auth.uid() or public.is_coach());
