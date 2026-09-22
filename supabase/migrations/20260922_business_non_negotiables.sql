-- Non-négociables quotidiens + pilotage hebdo du business du coach
-- (source : contenu Mastermind ThePrepDad, retour direct de Santamaria
-- 2026-09-22 : "les non négociables... les données à tracker", avec la
-- précision explicite que les chiffres cités dans le Mastermind ne sont
-- pas à copier tels quels — ce sont des objectifs par défaut ajustables,
-- pas des contraintes figées dans le code).
--
-- Volontairement centré sur le coach lui-même (coach_id), pas sur un
-- client : c'est le pilotage de SON PROPRE business, distinct de tout ce
-- qui existe déjà pour le suivi des clients. Le pilier "Pas" du Mastermind
-- n'a pas de colonne ici : il réutilise step_logs/step_settings qui
-- fonctionnent déjà génériquement par client_id (y compris pour le coach
-- sur sa propre page Moi, voir lib/habit-score.ts).

create table if not exists business_non_negotiables_log (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references profiles(id) on delete cascade,
  log_date date not null default current_date,
  reading_pages integer,
  mindfulness_minutes integer,
  -- Rituel "Reflect / Review / Reaffirm" du Mastermind (revoir ses
  -- objectifs matin/midi/soir) : une structure en 3 temps, pas juste un
  -- nombre, donc 3 booléens plutôt qu'un compteur.
  objectives_morning boolean not null default false,
  objectives_midday boolean not null default false,
  objectives_evening boolean not null default false,
  content_minutes integer,
  content_posts integer,
  outreach_conversations integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (coach_id, log_date)
);

comment on table business_non_negotiables_log is 'Non-négociables quotidiens du coach (lecture, pleine conscience, revue objectifs, création de contenu, outreach) — pilier business du Mastermind ThePrepDad. Le pilier "pas" réutilise step_logs.';

create index if not exists business_non_negotiables_log_coach_date_idx
  on business_non_negotiables_log(coach_id, log_date desc);

alter table business_non_negotiables_log enable row level security;

create policy "Coach manages own non-negotiables log"
  on business_non_negotiables_log
  for all
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

-- Les 5 objectifs du mois (Mastermind : "5 objectifs mensuels alignés avec
-- ma vision", relus 3x/jour via les booléens ci-dessus). Un texte libre par
-- objectif plutôt qu'un tableau typé : le contenu et le nombre réel varient
-- selon le mois, pas la peine de figer une structure plus stricte que
-- nécessaire.
create table if not exists business_monthly_objectives (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references profiles(id) on delete cascade,
  -- Toujours le 1er du mois, jamais une autre date — clé logique du mois.
  month_start date not null,
  objectives text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (coach_id, month_start)
);

comment on table business_monthly_objectives is 'Les 5 objectifs mensuels du coach (Mastermind ThePrepDad, "Pilotage & Objectifs") — relus matin/midi/soir via business_non_negotiables_log.';

alter table business_monthly_objectives enable row level security;

create policy "Coach manages own monthly objectives"
  on business_monthly_objectives
  for all
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());
