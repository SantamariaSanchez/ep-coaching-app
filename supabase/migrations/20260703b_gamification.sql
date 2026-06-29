-- EP Coaching — Système de points / rang (purement cosmétique, visible sur le
-- profil, aucun avantage fonctionnel). Append-only ledger : chaque ligne est
-- un gain de points, le total est calculé en sommant. La contrainte unique
-- sur (client_id, source_type, source_id) rend l'attribution idempotente —
-- un même évènement (ex. même jour de bilan, même leçon) ne peut être
-- récompensé qu'une seule fois, même si l'action sous-jacente est rejouée.

CREATE TABLE IF NOT EXISTS public.gamification_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points integer NOT NULL,
  reason text NOT NULL,
  source_type text NOT NULL,
  source_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, source_type, source_id)
);

CREATE INDEX IF NOT EXISTS idx_gamification_points_client
  ON public.gamification_points (client_id);

ALTER TABLE IF EXISTS public.gamification_points DISABLE ROW LEVEL SECURITY;
