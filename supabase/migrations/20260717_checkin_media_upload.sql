-- Upload direct de photos/vidéo pour le check-in hebdo, à la place des liens
-- Google Drive (trop technique à partager pour la plupart des clients — il
-- fallait créer un dossier, régler son partage, copier le lien...). Même
-- logique que "set-videos" côté logbook : le client filme/prend en photo
-- directement depuis l'appli, l'appareil photo s'ouvre tout seul, upload
-- immédiat vers Supabase Storage.
ALTER TABLE public.check_ins
  ADD COLUMN IF NOT EXISTS photo_paths text[],
  ADD COLUMN IF NOT EXISTS video_path text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('checkin-media', 'checkin-media', false)
ON CONFLICT (id) DO NOTHING;

-- Même modèle de confiance que "set-videos" : coach et client sont les deux
-- seuls rôles authentifiés de l'appli, l'isolation vient des chemins non
-- devinables (préfixés par l'id du client), pas de policy par propriétaire.
DROP POLICY IF EXISTS "checkin-media authenticated read" ON storage.objects;
CREATE POLICY "checkin-media authenticated read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'checkin-media');

DROP POLICY IF EXISTS "checkin-media authenticated upload" ON storage.objects;
CREATE POLICY "checkin-media authenticated upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'checkin-media');
