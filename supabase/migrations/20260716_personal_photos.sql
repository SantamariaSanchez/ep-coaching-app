-- Suivi photo personnel pour les membres gratuits (pas de coach, pas de
-- catégorie de compétition, pas de lien Drive) — distinct de "photo_updates"
-- qui reste le circuit de revue coach/client pour les clients coachés.
CREATE TABLE IF NOT EXISTS public.personal_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  taken_at date NOT NULL DEFAULT current_date,
  storage_path text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS personal_photos_client_id_idx ON public.personal_photos(client_id, taken_at DESC);

ALTER TABLE public.personal_photos ENABLE ROW LEVEL SECURITY;

-- Photos strictement personnelles : chaque membre ne voit et ne gère que les siennes.
DROP POLICY IF EXISTS "personal_photos owner select" ON public.personal_photos;
CREATE POLICY "personal_photos owner select" ON public.personal_photos
  FOR SELECT TO authenticated
  USING (client_id = auth.uid());

DROP POLICY IF EXISTS "personal_photos owner insert" ON public.personal_photos;
CREATE POLICY "personal_photos owner insert" ON public.personal_photos
  FOR INSERT TO authenticated
  WITH CHECK (client_id = auth.uid());

DROP POLICY IF EXISTS "personal_photos owner delete" ON public.personal_photos;
CREATE POLICY "personal_photos owner delete" ON public.personal_photos
  FOR DELETE TO authenticated
  USING (client_id = auth.uid());

-- Storage bucket privé — accès uniquement via URL signée, jamais public.
INSERT INTO storage.buckets (id, name, public)
VALUES ('progress-photos', 'progress-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Isolation par dossier ({user_id}/...) comme "set-videos" : chaque membre
-- ne peut lire/écrire que dans son propre dossier.
DROP POLICY IF EXISTS "progress-photos owner read" ON storage.objects;
CREATE POLICY "progress-photos owner read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'progress-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "progress-photos owner upload" ON storage.objects;
CREATE POLICY "progress-photos owner upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'progress-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "progress-photos owner delete" ON storage.objects;
CREATE POLICY "progress-photos owner delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'progress-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
