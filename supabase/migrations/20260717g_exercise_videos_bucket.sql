-- Bucket pour les vidéos d'exemple uploadées directement dans la
-- bibliothèque d'exercices (auparavant : uniquement un champ "lien vidéo"
-- à coller à la main). Public comme "resources"/"community-photos" : ce
-- sont des vidéos pédagogiques partagées avec tous les membres.
-- Exécute dans Supabase SQL Editor.

INSERT INTO storage.buckets (id, name, public)
VALUES ('exercise-videos', 'exercise-videos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "exercise-videos public read" ON storage.objects;
CREATE POLICY "exercise-videos public read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'exercise-videos');

DROP POLICY IF EXISTS "exercise-videos coach upload" ON storage.objects;
CREATE POLICY "exercise-videos coach upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'exercise-videos');

DROP POLICY IF EXISTS "exercise-videos coach delete" ON storage.objects;
CREATE POLICY "exercise-videos coach delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'exercise-videos');
