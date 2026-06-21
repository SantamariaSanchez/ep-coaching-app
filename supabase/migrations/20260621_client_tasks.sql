-- Coach-assigned client tasks ("Prends ta créatine", etc.) that nag the client
-- via push notification every `nag_minutes` until checked off as done.
CREATE TABLE IF NOT EXISTS public.client_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id),
  label text NOT NULL,
  icon text NOT NULL DEFAULT '✅',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done')),
  nag_minutes integer NOT NULL DEFAULT 30,
  last_notified_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_tasks DISABLE ROW LEVEL SECURITY;
