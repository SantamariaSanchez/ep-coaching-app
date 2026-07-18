-- Agenda hebdomadaire — emploi du temps récurrent (pas un calendrier à
-- dates fixes) que chaque utilisateur (client ou coach pour lui-même)
-- gère entièrement seul : blocs nommés, horaires, notes, par jour de la
-- semaine. Le coach peut CONSULTER l'agenda d'un client depuis sa fiche
-- mais ne peut pas le modifier — seul owner_id peut écrire dessus (géré
-- côté application, la table elle-même n'a pas de contrainte de rôle).

CREATE TABLE IF NOT EXISTS public.schedule_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 1 AND 7), -- 1 = lundi ... 7 = dimanche
  start_time time NOT NULL,
  end_time time NOT NULL,
  label text NOT NULL,
  color text NOT NULL DEFAULT '#E01E1E',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_schedule_blocks_owner ON public.schedule_blocks (owner_id, day_of_week);

ALTER TABLE IF EXISTS public.schedule_blocks DISABLE ROW LEVEL SECURITY;
