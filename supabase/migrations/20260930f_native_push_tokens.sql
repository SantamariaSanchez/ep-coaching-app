-- Notifications push de l'appli native iOS/Android (Capacitor + Firebase
-- Cloud Messaging), en plus du push web existant (push_subscriptions).
create table if not exists public.native_push_tokens (
  token text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  platform text not null check (platform in ('ios', 'android')),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index if not exists native_push_tokens_user_idx on public.native_push_tokens (user_id);
alter table public.native_push_tokens enable row level security;
drop policy if exists "own native push tokens" on public.native_push_tokens;
create policy "own native push tokens" on public.native_push_tokens for select using (user_id = (select auth.uid()));
notify pgrst, 'reload schema';
