-- ═══════════════════════════════════════════════════════════════════════
-- EP Coaching — Fix faille critique : bucket message-images lisible sans
-- authentification, plus deux failles IMPORTANT sur set-videos et
-- exercise-videos. Deja appliquees en prod via MCP Supabase, ce fichier
-- est pour tracabilite.
-- ═══════════════════════════════════════════════════════════════════════
-- CRITIQUE : message-images (photos privees echangees en messagerie
-- coach/client) avait une policy SELECT "public read" sans aucune
-- verification, alors que sa policy INSERT est correctement scopee. Trouve
-- par un audit independant le 2026-08-06, reproduit avec la seule cle anon
-- publique (sans session) : listage du bucket puis telechargement reussi
-- d'une vraie photo privee (790 Ko, JPEG). Corrige avec la meme condition
-- que la policy INSERT deja en place.
--
-- IMPORTANT : set-videos (verifications de forme des series) n'avait
-- aucune restriction de dossier, seulement auth.role() = 'authenticated' -
-- justifie a tort dans la migration d'origine (20260620_set_videos.sql)
-- par l'absence d'inscription publique, devenue fausse depuis
-- l'auto-inscription libre-service. N'importe quel membre auto-inscrit
-- pouvait parcourir/uploader les videos de n'importe quel autre client.
--
-- IMPORTANT : exercise-videos avait une policy d'upload nommee "coach
-- upload" qui ne verifiait en realite que auth.role() = 'authenticated',
-- pas is_coach() (contrairement a sa policy DELETE, qui elle le fait
-- correctement). N'importe quel membre pouvait uploader/ecraser du
-- contenu presente comme curé par le coach.
-- ═══════════════════════════════════════════════════════════════════════

drop policy if exists "message-images public read" on storage.objects;
create policy "message-images owner or coach read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'message-images'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or is_own_coach(((storage.foldername(name))[1])::uuid)
      or is_platform_owner()
    )
  );

drop policy if exists "set-videos authenticated read" on storage.objects;
create policy "set-videos owner or coach read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'set-videos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or is_own_coach(((storage.foldername(name))[1])::uuid)
      or is_platform_owner()
    )
  );

drop policy if exists "set-videos authenticated upload" on storage.objects;
create policy "set-videos owner or coach upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'set-videos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or is_own_coach(((storage.foldername(name))[1])::uuid)
      or is_platform_owner()
    )
  );

drop policy if exists "exercise-videos coach upload" on storage.objects;
create policy "exercise-videos coach upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'exercise-videos' and is_coach());
