-- Item 43 (chantier 50 idees) : essai coaching limite dans le temps.
-- Reutilise entierement le mecanisme d'activation existant
-- (subscription_status='active', voir setClientSubscriptionStatus) — un
-- essai a exactement les memes acces qu'un coaching payant pendant sa
-- duree, c'est le but. trial_ends_at marque juste QUAND repasser
-- automatiquement en gratuit (cron expire-trials).
alter table public.profiles add column if not exists trial_ends_at timestamptz;
