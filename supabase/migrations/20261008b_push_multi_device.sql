-- Notifications sur tous les appareils (2026-10-08) : retour direct, « mon
-- agenda ne m'envoie plus de notif ». Il n'y avait qu'un abonnement push par
-- compte : le dernier appareil à activer les notifications (ordinateur,
-- autre navigateur) remplaçait celui du téléphone. Un abonnement par
-- appareil désormais, tous servis à chaque envoi.
alter table public.push_subscriptions add column if not exists endpoint text;
update public.push_subscriptions set endpoint = subscription->>'endpoint' where endpoint is null;
alter table public.push_subscriptions drop constraint if exists push_subscriptions_user_id_key;
create unique index if not exists push_subscriptions_user_endpoint_key on public.push_subscriptions (user_id, endpoint);
alter table public.push_subscriptions add column if not exists updated_at timestamptz not null default now();
