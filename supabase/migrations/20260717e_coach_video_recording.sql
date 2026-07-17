-- Enregistrement vidéo type Loom côté coach : webcam et/ou partage d'écran
-- directement depuis l'appli, envoyée en message ou associée à un check-in.
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS video_url text;

ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_type_check;
ALTER TABLE public.messages
  ADD CONSTRAINT messages_type_check CHECK (type IN ('text', 'voice', 'image', 'video'));

ALTER TABLE public.check_ins
  ADD COLUMN IF NOT EXISTS coach_video_path text;

-- Bucket privé — accès par URL signée uniquement, comme set-videos/checkin-media.
INSERT INTO storage.buckets (id, name, public)
VALUES ('coach-videos', 'coach-videos', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "coach-videos authenticated read" ON storage.objects;
CREATE POLICY "coach-videos authenticated read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'coach-videos');

DROP POLICY IF EXISTS "coach-videos authenticated upload" ON storage.objects;
CREATE POLICY "coach-videos authenticated upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'coach-videos');
