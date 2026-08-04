-- ═══════════════════════════════════════════════════════════════════════
-- EP Coaching — Aligne les buckets de messagerie sur le bypass fondateur
-- Exécute dans Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════
-- Contexte : investigation du bug d'upload messagerie signalé (vocal/photo/
-- vidéo). Vérification faite en base réelle (policies live + objets déjà
-- présents dans voice-messages et message-images, uploadés avec succès par
-- le coach ET par des clients) : le chemin construit côté app
-- (`${conversationId}/${userId}-...`, conversationId = id du client) est
-- déjà correctement aligné avec les policies RLS de stockage
-- ((storage.foldername(name))[1] = auth.uid() OR is_own_coach(...)), voir
-- 20260729b_multi_coach_foundation.sql. Aucun échec d'upload constaté pour
-- le flux standard client <-> son coach.
--
-- Un vrai écart subsiste cela dit : la table messages autorise déjà le
-- fondateur (is_platform_owner) à écrire à N'IMPORTE QUEL utilisateur pour
-- le support/la modération (20260801c_founder_moderation.sql), mais les
-- policies de stockage des pièces jointes (voice-messages, message-images,
-- coach-videos) n'ont jamais reçu cette même exception. Si le fondateur
-- ouvre une conversation de support avec un utilisateur qui n'est pas SON
-- propre client (cas multi-coach), l'envoi de texte fonctionnerait mais
-- l'envoi de vocal/photo/vidéo échouerait silencieusement à l'upload
-- storage. Non reproductible aujourd'hui (un seul coach en prod, qui est
-- aussi le fondateur, donc is_own_coach() est toujours vrai pour ses
-- clients), mais latent dès qu'un deuxième coach existera sur la
-- plateforme. On aligne par cohérence avec la policy messages.
-- ═══════════════════════════════════════════════════════════════════════

drop policy if exists "voice-messages owner or coach read" on storage.objects;
create policy "voice-messages owner or coach read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'voice-messages'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_own_coach(((storage.foldername(name))[1])::uuid)
      or public.is_platform_owner()
    )
  );

drop policy if exists "voice-messages owner or coach upload" on storage.objects;
create policy "voice-messages owner or coach upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'voice-messages'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_own_coach(((storage.foldername(name))[1])::uuid)
      or public.is_platform_owner()
    )
  );

drop policy if exists "coach-videos owner or coach read" on storage.objects;
create policy "coach-videos owner or coach read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'coach-videos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_own_coach(((storage.foldername(name))[1])::uuid)
      or public.is_platform_owner()
    )
  );

drop policy if exists "coach-videos owner or coach upload" on storage.objects;
create policy "coach-videos owner or coach upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'coach-videos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_own_coach(((storage.foldername(name))[1])::uuid)
      or public.is_platform_owner()
    )
  );

drop policy if exists "message-images owner or coach upload" on storage.objects;
create policy "message-images owner or coach upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'message-images'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_own_coach(((storage.foldername(name))[1])::uuid)
      or public.is_platform_owner()
    )
  );
