-- Un membre gratuit ACTIF (qui ouvre l'appli régulièrement) n'était prévenu
-- de la fin de ses 60 jours gratuits que s'il tombait dessus par hasard sur
-- le bandeau in-app (FreeTierBanner). Contrairement au membre inactif, qui
-- reçoit déjà 2 emails d'avertissement avant suppression (voir
-- app/api/cron/free-tier-inactivity), personne ne le prévenait par email
-- avant le verrou. Colonne séparée de deletion_warned_at : messages et
-- déclencheurs différents, jamais à confondre.

alter table public.profiles add column if not exists free_tier_warned_at timestamptz;

comment on column public.profiles.free_tier_warned_at is
  'Dernier avertissement de fin de periode gratuite envoye a un membre ACTIF (distinct de deletion_warned_at, qui cible les comptes inactifs). Voir app/api/cron/free-tier-expiring.';
