-- Verrouillage des buckets partagés (audit du 2026-11-14).
--
-- Avant : tout compte coach (y compris un coach tiers tout juste inscrit)
-- pouvait SUPPRIMER n'importe quel fichier des buckets partagés
-- `resources`, `exercise-images` et `exercise-videos`, et déposer n'importe
-- quoi dans `resources`. Supprimer puis redéposer au même chemin revenait à
-- remplacer un guide HTML du catalogue par le sien, servi ensuite depuis le
-- domaine de l'appli (app/api/resources/[id], app/guides/[...slug]).
--
-- Après :
--   - `resources` : dépôt et suppression réservés au propriétaire de la
--     plateforme (aucun écran de l'appli n'y dépose de fichier côté coach).
--   - `exercise-images` / `exercise-videos` : chaque coach garde le dépôt
--     (bibliothèque d'exercices), mais ne supprime que SES fichiers ; le
--     propriétaire de la plateforme peut tout supprimer.

drop policy if exists "Coach can upload resources" on storage.objects;
drop policy if exists "Platform owner can upload resources" on storage.objects;
create policy "Platform owner can upload resources" on storage.objects
  for insert with check (bucket_id = 'resources' and public.is_platform_owner());

drop policy if exists "Coach can delete resources" on storage.objects;
drop policy if exists "Platform owner can delete resources" on storage.objects;
create policy "Platform owner can delete resources" on storage.objects
  for delete using (bucket_id = 'resources' and public.is_platform_owner());

drop policy if exists "exercise-images coach delete" on storage.objects;
drop policy if exists "exercise-images owner delete" on storage.objects;
create policy "exercise-images owner delete" on storage.objects
  for delete using (
    bucket_id = 'exercise-images'
    and public.is_coach()
    and (owner_id = (auth.uid())::text or public.is_platform_owner())
  );

drop policy if exists "exercise-videos coach delete" on storage.objects;
drop policy if exists "exercise-videos owner delete" on storage.objects;
create policy "exercise-videos owner delete" on storage.objects
  for delete using (
    bucket_id = 'exercise-videos'
    and public.is_coach()
    and (owner_id = (auth.uid())::text or public.is_platform_owner())
  );
