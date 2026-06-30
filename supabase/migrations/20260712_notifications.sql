-- EP Coaching — Notifications in-app (cloche dans la nav) + rappel avant
-- un live. utils/insert-notification.ts référence déjà cette table mais
-- elle n'avait jamais été créée — la cloche était un feature scaffoldé
-- mort. Même convention que push_subscriptions/reminders : lu/écrit
-- uniquement via le client admin, pas de RLS stricte.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  url text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user on public.notifications (user_id, created_at desc);
create index if not exists idx_notifications_unread on public.notifications (user_id) where read_at is null;

alter table if exists public.notifications disable row level security;

-- Rappel avant le début d'un live : évite les doublons quand le cron
-- (toutes les 5 min) repasse sur le même événement.
alter table if exists public.live_events add column if not exists reminder_sent_at timestamptz;
