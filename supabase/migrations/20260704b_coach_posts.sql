-- "Mot du coach" — simple text posts (reflections, advice, tips) written by
-- the coach, readable by every member (free and paying). Not the same as
-- community_posts (victoires/questions, member-authored).
CREATE TABLE IF NOT EXISTS public.coach_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coach_posts_created_at
  ON public.coach_posts (created_at DESC);

ALTER TABLE IF EXISTS public.coach_posts DISABLE ROW LEVEL SECURITY;
