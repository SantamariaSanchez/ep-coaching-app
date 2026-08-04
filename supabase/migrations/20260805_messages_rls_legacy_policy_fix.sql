-- ═══════════════════════════════════════════════════════════════════════
-- EP Coaching — Supprime une policy RLS fantôme trop permissive sur messages
-- Exécute dans Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════
-- Contexte : découvert en creusant le bug d'upload messagerie signalé.
-- Deux policies RLS héritées de la toute première version de la messagerie
-- (20260601_missing_tables.sql) sont restées actives EN PARALLÈLE des
-- policies plus récentes et plus strictes (20260729b_multi_coach_foundation.sql,
-- 20260801b/20260801c_founder_moderation.sql). Les policies RLS d'une même
-- commande sont combinées en OR (permissive par défaut) : la policy
-- "Users can insert their messages" (with check: auth.uid() = sender_id,
-- SANS AUCUNE restriction sur receiver_id) suffisait à elle seule à
-- autoriser n'importe quel utilisateur authentifié à insérer un message
-- vers N'IMPORTE QUEL destinataire de la plateforme, contournant entièrement
-- la policy "Active clients and coach can send messages" qui encode les
-- vraies règles métier (client vers son coach, coach vers son client,
-- fondateur vers/depuis n'importe qui). Comme les inserts messages sont
-- faits directement depuis le client (voir components/messaging/ConversationView.tsx),
-- RLS est la seule couche d'application réelle ici — cette policy fantôme
-- annulait donc de fait tout le cloisonnement coach/client sur l'envoi de
-- messages. On la supprime, ainsi que son équivalent SELECT strictement
-- redondant avec "Message participants can read" (aucun changement de
-- comportement pour la lecture, juste une policy dupliquée en moins).
-- ═══════════════════════════════════════════════════════════════════════

drop policy if exists "Users can insert their messages" on public.messages;
drop policy if exists "Users can read their messages" on public.messages;
