-- ═══════════════════════════════════════════════════════════════════════
-- EP Coaching — Active le Realtime Supabase sur la table messages
-- Exécute dans Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════
-- Contexte : la messagerie coach/client (components/messaging/ConversationView.tsx)
-- et la cloche de notifications (components/ui/DashboardNav.tsx) s'abonnent
-- toutes les deux à des évènements postgres_changes sur "messages", mais
-- cette table n'a jamais été ajoutée à la publication supabase_realtime —
-- les deux tentatives précédentes étaient laissées en commentaire dans
-- d'anciennes migrations. Résultat : un message envoyé n'apparaît jamais
-- en direct chez le destinataire, il faut recharger la page pour le voir.
-- ═══════════════════════════════════════════════════════════════════════

alter publication supabase_realtime add table public.messages;
