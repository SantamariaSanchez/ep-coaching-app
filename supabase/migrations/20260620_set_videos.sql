-- Set video uploads: client films a set for form-check, coach views it from the logbook.
ALTER TABLE public.session_sets
  ADD COLUMN IF NOT EXISTS video_url text;

-- Storage bucket for set videos (private — accessed via signed URLs only)
INSERT INTO storage.buckets (id, name, public)
VALUES ('set-videos', 'set-videos', false)
ON CONFLICT (id) DO NOTHING;

-- App is a private coach/client tool with no public sign-up; same trust model
-- as the existing "voice-messages" bucket — any authenticated user may upload
-- and read objects, isolation is enforced by unguessable folder paths.
DROP POLICY IF EXISTS "set-videos authenticated read" ON storage.objects;
CREATE POLICY "set-videos authenticated read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'set-videos');

DROP POLICY IF EXISTS "set-videos authenticated upload" ON storage.objects;
CREATE POLICY "set-videos authenticated upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'set-videos');
