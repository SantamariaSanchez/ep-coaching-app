-- Accusé de réception des notifications push : le service worker signale
-- quand la notif arrive vraiment sur l'appareil. Si le téléphone la retient
-- (économie de batterie), l'appli le voit et affiche le réglage à faire.
alter table public.push_subscriptions add column if not exists user_agent text;
alter table public.push_subscriptions add column if not exists last_sent_at timestamptz;
alter table public.push_subscriptions add column if not exists last_delivered_at timestamptz;
alter table public.push_subscriptions add column if not exists last_delay_seconds integer;
