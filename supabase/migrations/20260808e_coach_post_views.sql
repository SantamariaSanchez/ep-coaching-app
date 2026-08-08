-- ═══════════════════════════════════════════════════════════════════════
-- EP Coaching — Suivi de lecture "Mot du coach"
-- Déjà appliquée en prod via MCP Supabase, ce fichier est pour traçabilité
-- ═══════════════════════════════════════════════════════════════════════
-- Le coach publiait dans le vide, aucun signal de retour (pas même un
-- compteur de vues). Même schéma que formation_lesson_views.
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists coach_post_views (
  user_id uuid not null references profiles(id) on delete cascade,
  post_id uuid not null references coach_posts(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create index if not exists coach_post_views_post_idx on coach_post_views (post_id);

alter table coach_post_views enable row level security;

create policy "Users manage their own post views"
  on coach_post_views for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
