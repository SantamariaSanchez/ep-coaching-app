-- ═══════════════════════════════════════════════════════════════════════
-- EP Coaching — Deuxième passe de sécurité (audit approfondi 2026-08-04)
-- Exécute dans le Supabase SQL Editor (jamais automatisé par Vercel)
-- ═══════════════════════════════════════════════════════════════════════
-- Fait suite à 20260804_security_rls_hardening.sql. Cette passe corrige :
--
-- 1. Neuf tables où la RLS a été réactivée (probablement lors du premier
--    audit du jour) mais sans jamais recevoir de policy ("RLS Enabled No
--    Policy" côté advisor Supabase) — piège silencieux : la table devient
--    inaccessible à TOUT LE MONDE sauf le service role. Pour deux d'entre
--    elles (period_logs, exercise_library), ça casse une vraie fonctionnalité
--    en prod (lecture directe côté client via le client RLS classique).
--    Pour les sept autres, ça ne casse rien aujourd'hui (l'app lit/écrit
--    exclusivement via le client admin) mais on pose quand même une policy
--    de lecture cohérente avec l'usage réel, plutôt que de laisser le piège
--    ouvert pour le prochain qui ajoutera un accès direct.
--
-- 2. Policies de stockage (storage.objects) qui ne vérifiaient en réalité
--    RIEN malgré leur nom : "exercise-videos coach upload/delete" et
--    "set-videos authenticated read/upload" n'imposaient aucune condition
--    d'authentification — n'importe qui, même sans compte, pouvait uploader
--    ou supprimer des fichiers dans ces buckets, et lire le contenu du
--    bucket privé set-videos. "resources" acceptait l'upload/suppression de
--    n'importe quel utilisateur authentifié alors que seul le coach doit
--    pouvoir publier/retirer une ressource (l'app elle-même passe toujours
--    par le client admin ici, donc resserrer ne casse rien de réel).
--
-- 3. Garde-fou taille/type sur tous les buckets de stockage — aucun n'avait
--    de file_size_limit ni d'allowed_mime_types configuré, alors que
--    plusieurs uploads se font directement depuis le navigateur (client
--    Supabase + session, pas un server action) : la validation côté JS de
--    l'appli est facilement contournable par un appel direct à l'API
--    Storage. Cadenasse au niveau du bucket, qui s'applique quel que soit
--    le point d'entrée.
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1. RLS "enabled no policy" — tables de contenu partagé ────────────────
-- Lues aujourd'hui exclusivement via le client admin (bypass RLS), sauf
-- exercise_library (app/api/client/sessions/[id]/route.ts, conseils
-- d'exécution en séance) qui utilise le client RLS classique et retournait
-- silencieusement un tableau vide depuis le passage en RLS.

drop policy if exists "Authenticated members read exercise library" on public.exercise_library;
create policy "Authenticated members read exercise library" on public.exercise_library
  for select to authenticated using (true);

drop policy if exists "Authenticated members read gyms" on public.gyms;
create policy "Authenticated members read gyms" on public.gyms
  for select to authenticated using (true);

drop policy if exists "Authenticated members read gym reviews" on public.gym_reviews;
create policy "Authenticated members read gym reviews" on public.gym_reviews
  for select to authenticated using (true);

drop policy if exists "Authenticated members read science articles" on public.science_articles;
create policy "Authenticated members read science articles" on public.science_articles
  for select to authenticated using (true);

drop policy if exists "Authenticated members read science studies" on public.science_studies;
create policy "Authenticated members read science studies" on public.science_studies
  for select to authenticated using (true);

-- Participation à une étude : visible par le participant lui-même et par
-- n'importe quel coach (les études sont une fonctionnalité transverse, pas
-- scopée à un client précis) — jamais par un autre client.
drop policy if exists "Participant or coach reads study participants" on public.science_study_participants;
create policy "Participant or coach reads study participants" on public.science_study_participants
  for select using (participant_id = auth.uid() or public.is_coach());

-- ── 2. RLS "enabled no policy" — données personnelles scopées client ──────

-- period_logs : bug fonctionnel confirmé (getPeriodLogs utilise le client
-- RLS classique, aussi bien depuis l'espace client que depuis la fiche
-- client coté coach) en plus du trou de sécurité générique.
drop policy if exists "Users manage own period logs" on public.period_logs;
create policy "Users manage own period logs" on public.period_logs
  for all using (client_id = auth.uid() or public.is_own_coach(client_id))
  with check (client_id = auth.uid() or public.is_own_coach(client_id));

-- schedule_blocks : écrit/lu aujourd'hui via le client admin partout, mais
-- même convention "propriétaire ou son coach" que le reste de l'app pour
-- ne pas laisser la table nue si un accès direct est ajouté plus tard.
drop policy if exists "Users manage own schedule blocks" on public.schedule_blocks;
create policy "Users manage own schedule blocks" on public.schedule_blocks
  for all using (owner_id = auth.uid() or public.is_own_coach(owner_id))
  with check (owner_id = auth.uid() or public.is_own_coach(owner_id));

-- oura_connections : contient des jetons OAuth bruts (access_token,
-- refresh_token) vers un service tiers de santé. Aucune policy ajoutée
-- volontairement : la table reste inaccessible à quiconque hors service
-- role. L'app entière (callback OAuth, cron de sync, page "mon suivi" du
-- coach) passe déjà par le client admin ; il n'existe aucun besoin
-- fonctionnel de lecture/écriture directe côté client pour cette table, et
-- l'exposer même au seul propriétaire ajouterait un accès direct à des
-- jetons d'accès à un compte de santé externe sans bénéfice réel.
comment on table public.oura_connections is
  'RLS activée sans aucune policy, volontairement : jetons OAuth Oura bruts, accès exclusivement via le client admin (service role) côté serveur. Ne pas ajouter de policy client_id = auth.uid() sans réévaluer le risque d''exposer ces jetons côté client.';

-- ── 3. Policies de stockage qui ne vérifiaient rien malgré leur nom ───────

drop policy if exists "exercise-videos coach upload" on storage.objects;
create policy "exercise-videos coach upload" on storage.objects
  for insert
  with check (bucket_id = 'exercise-videos' and auth.role() = 'authenticated');

drop policy if exists "exercise-videos coach delete" on storage.objects;
create policy "exercise-videos coach delete" on storage.objects
  for delete
  using (bucket_id = 'exercise-videos' and public.is_coach());

drop policy if exists "set-videos authenticated read" on storage.objects;
create policy "set-videos authenticated read" on storage.objects
  for select
  using (bucket_id = 'set-videos' and auth.role() = 'authenticated');

drop policy if exists "set-videos authenticated upload" on storage.objects;
create policy "set-videos authenticated upload" on storage.objects
  for insert
  with check (bucket_id = 'set-videos' and auth.role() = 'authenticated');

drop policy if exists "Authenticated users can upload resources" on storage.objects;
create policy "Coach can upload resources" on storage.objects
  for insert
  with check (bucket_id = 'resources' and public.is_coach());

drop policy if exists "Authenticated users can delete resources" on storage.objects;
create policy "Coach can delete resources" on storage.objects
  for delete
  using (bucket_id = 'resources' and public.is_coach());

-- ── 4. Garde-fou taille/type sur tous les buckets ──────────────────────────
-- Aucun bucket n'avait de limite : un appel direct au client Supabase
-- navigateur (plusieurs écrans uploadent ainsi, hors server action) pouvait
-- envoyer un fichier de n'importe quelle taille/type, la validation JS de
-- l'appli étant purement cosmétique. Les listes reflètent les formats
-- réellement produits par l'appli (input file + MediaRecorder navigateur).

update storage.buckets set file_size_limit = 8388608,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif']
  where id = 'avatars';

update storage.buckets set file_size_limit = 104857600,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif','video/webm','video/mp4','video/quicktime']
  where id = 'checkin-media';

update storage.buckets set file_size_limit = 157286400,
  allowed_mime_types = array['video/webm','video/mp4','video/quicktime']
  where id = 'coach-videos';

update storage.buckets set file_size_limit = 8388608,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif']
  where id = 'community-photos';

update storage.buckets set file_size_limit = 157286400,
  allowed_mime_types = array['video/webm','video/mp4','video/quicktime']
  where id = 'correction-videos';

update storage.buckets set file_size_limit = 157286400,
  allowed_mime_types = array['video/webm','video/mp4','video/quicktime']
  where id = 'exercise-videos';

update storage.buckets set file_size_limit = 8388608,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif']
  where id = 'message-images';

update storage.buckets set file_size_limit = 104857600,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif','video/webm','video/mp4','video/quicktime']
  where id = 'photo-updates-media';

update storage.buckets set file_size_limit = 8388608,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif']
  where id = 'progress-photos';

update storage.buckets set file_size_limit = 52428800,
  allowed_mime_types = array['application/pdf','text/html','image/png','image/jpeg','image/gif','image/webp','image/svg+xml','video/mp4','video/webm','video/quicktime','audio/mpeg','audio/wav','application/zip']
  where id = 'resources';

update storage.buckets set file_size_limit = 104857600,
  allowed_mime_types = array['video/webm','video/mp4','video/quicktime']
  where id = 'set-videos';

update storage.buckets set file_size_limit = 20971520,
  allowed_mime_types = array['audio/webm','audio/mp4','audio/ogg','audio/mpeg','audio/wav']
  where id = 'voice-messages';
