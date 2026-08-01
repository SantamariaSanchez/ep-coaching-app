-- ═══════════════════════════════════════════════════════════════════════
-- EP Coaching — Upload natif pour les vidéos de correction technique
-- Exécute APRÈS 20260731c_exercise_corrections_rls.sql (dépend de is_own_coach())
-- ═══════════════════════════════════════════════════════════════════════
-- Contexte : jusqu'ici, un lien Google Drive était le SEUL moyen d'envoyer
-- une vidéo de correction technique (client) ou d'y répondre (coach), alors
-- que check-ins, photos et messages uploadent tous directement dans l'appli.
-- On ajoute des colonnes de chemin de stockage natif, en gardant video_link/
-- coach_video_link (nullable) pour l'affichage des dépôts déjà envoyés par
-- lien Drive avant ce changement.

alter table public.exercise_corrections
  alter column video_link drop not null;

alter table public.exercise_corrections
  add column if not exists video_path text,
  add column if not exists coach_video_path text;

-- Bucket pour la vidéo d'exercice envoyée par le client. La réponse vidéo du
-- coach réutilise le bucket "coach-videos" déjà en place (mêmes policies).
insert into storage.buckets (id, name, public)
values ('correction-videos', 'correction-videos', false)
on conflict (id) do nothing;

drop policy if exists "correction-videos owner or coach read" on storage.objects;
create policy "correction-videos owner or coach read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'correction-videos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_own_coach(((storage.foldername(name))[1])::uuid)
    )
  );

drop policy if exists "correction-videos owner or coach upload" on storage.objects;
create policy "correction-videos owner or coach upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'correction-videos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_own_coach(((storage.foldername(name))[1])::uuid)
    )
  );
