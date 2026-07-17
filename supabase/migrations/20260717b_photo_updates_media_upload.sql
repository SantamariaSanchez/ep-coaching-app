-- Upload direct de photos/vidéo pour les mises à jour photo coach (poses
-- obligatoires, routine de posing, vidéo perf), à la place du lien Drive/
-- YouTube/Vimeo obligatoire — même changement que pour le check-in hebdo
-- (20260717_checkin_media_upload.sql), trop technique à partager pour la
-- plupart des clients.
ALTER TABLE public.photo_updates
  ALTER COLUMN drive_link DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS photo_paths text[],
  ADD COLUMN IF NOT EXISTS video_path text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('photo-updates-media', 'photo-updates-media', false)
ON CONFLICT (id) DO NOTHING;

-- Même modèle de confiance que "set-videos"/"checkin-media" : coach et
-- client sont les deux seuls rôles authentifiés de l'appli.
DROP POLICY IF EXISTS "photo-updates-media authenticated read" ON storage.objects;
CREATE POLICY "photo-updates-media authenticated read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'photo-updates-media');

DROP POLICY IF EXISTS "photo-updates-media authenticated upload" ON storage.objects;
CREATE POLICY "photo-updates-media authenticated upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'photo-updates-media');
