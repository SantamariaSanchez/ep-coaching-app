-- ═══════════════════════════════════════════════════════════════════════
-- EP Coaching — Durcissement RLS messagerie (audit Messages/Inbox, 2026-08-19)
-- À EXÉCUTER MANUELLEMENT dans le Supabase SQL Editor (voir AGENTS.md).
-- ═══════════════════════════════════════════════════════════════════════
-- Faille confirmée en base de production : la policy UPDATE de
-- public.messages ("Users can update read status",
-- supabase/migrations/20260601_missing_tables.sql) n'a JAMAIS eu de
-- WITH CHECK explicite. Postgres réutilise alors le USING comme WITH
-- CHECK, qui ne contraint que receiver_id — aucune autre colonne n'est
-- protégée. Un utilisateur authentifié, receiver_id d'un message, peut
-- donc réécrire son content/sender_id/voice_url/image_url/video_url/type
-- via un appel direct au client Supabase JS (sa clé anon + son propre
-- token de session sont exposés côté navigateur), sans jamais passer par
-- l'UI (qui n'envoie jamais que { is_read: true }, voir
-- components/messaging/ConversationView.tsx).
--
-- Même motif déjà utilisé pour un problème analogue sur profiles :
-- supabase/migrations/20260804_security_rls_hardening.sql
-- (protect_profile_privileged_columns). Appliqué ici à messages : seule
-- la colonne is_read reste modifiable par un utilisateur normal, toutes
-- les autres sont figées à leur valeur existante côté trigger. Bypass
-- service_role indispensable : app/api/cleanup-voice/route.ts purge
-- voice_url/content/type des vocaux expirés via createAdminClient().

create or replace function public.protect_message_content_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  new.conversation_id := old.conversation_id;
  new.sender_id := old.sender_id;
  new.receiver_id := old.receiver_id;
  new.type := old.type;
  new.content := old.content;
  new.voice_url := old.voice_url;
  new.voice_duration_seconds := old.voice_duration_seconds;
  new.image_url := old.image_url;
  new.video_url := old.video_url;
  new.expires_at := old.expires_at;
  new.created_at := old.created_at;

  return new;
end;
$$;

drop trigger if exists protect_message_content_columns on public.messages;
create trigger protect_message_content_columns
before update on public.messages
for each row execute function public.protect_message_content_columns();

-- ── Traçabilité (pas une faille active) ─────────────────────────────────
-- storage.buckets 'message-images' a été créé public=true par
-- 20260717d_messaging_media_fix.sql, corrigé en public=false directement
-- en base (dashboard/SQL Editor) sans migration versionnée correspondante
-- — aucune migration du dépôt ne le reflète. Un rejeu complet des
-- migrations depuis zéro recréerait le bucket public sans que rien ne le
-- signale. Aligne le code source sur l'état réel actuel.
update storage.buckets set public = false where id = 'message-images';
