-- Suivi "vu" distinct de "terminé" (formation_progress) — pour proposer
-- "Reprendre : {leçon}" sur le catalogue de formations plutôt que de faire
-- rechercher au client où il en était. Une ligne par (user, leçon), mise à
-- jour à chaque ouverture de la page de leçon.
create table if not exists formation_lesson_views (
  user_id uuid not null references profiles(id) on delete cascade,
  lesson_id uuid not null references formation_lessons(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create index if not exists formation_lesson_views_user_viewed_idx
  on formation_lesson_views (user_id, viewed_at desc);

alter table formation_lesson_views enable row level security;

create policy "Users manage their own lesson views"
  on formation_lesson_views for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
