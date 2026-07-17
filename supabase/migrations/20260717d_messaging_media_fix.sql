-- ═══════════════════════════════════════════════════════════════════════
-- EP Coaching — Corrige l'envoi de vocaux et ajoute l'envoi de photos
-- Exécute dans Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════
-- Contexte : components/messaging/ConversationView.tsx uploade les vocaux
-- vers un bucket "voice-messages" qui est mentionné en commentaire dans
-- 20260620_set_videos.sql comme "existant", mais n'a en réalité jamais été
-- créé par aucune migration — même symptôme que "check_ins" et
-- "photo_updates" avant elles (référencées partout, jamais créées). Chaque
-- envoi de vocal échouait donc silencieusement à l'upload (l'erreur était
-- avalée par un catch vide côté client, sans aucun retour visible).
-- L'envoi de photo, lui, n'existe tout simplement pas encore dans le code.
-- ═══════════════════════════════════════════════════════════════════════

-- Bucket vocaux — privé, accès par URL signée (le lien expire, cohérent
-- avec le principe de vocal éphémère déjà en place côté app).
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-messages', 'voice-messages', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "voice-messages authenticated read" ON storage.objects;
CREATE POLICY "voice-messages authenticated read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'voice-messages');

DROP POLICY IF EXISTS "voice-messages authenticated upload" ON storage.objects;
CREATE POLICY "voice-messages authenticated upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'voice-messages');

-- Support des messages image : nouvelle colonne + type autorisé.
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS image_url text;

ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_type_check;
ALTER TABLE public.messages
  ADD CONSTRAINT messages_type_check CHECK (type IN ('text', 'voice', 'image'));

-- Bucket photos de messagerie — public (comme "community-photos"), pas
-- d'expiration : contrairement aux vocaux, une photo envoyée en message
-- n'a pas vocation à s'auto-détruire.
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-images', 'message-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "message-images public read" ON storage.objects;
CREATE POLICY "message-images public read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'message-images');

DROP POLICY IF EXISTS "message-images authenticated upload" ON storage.objects;
CREATE POLICY "message-images authenticated upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'message-images');
