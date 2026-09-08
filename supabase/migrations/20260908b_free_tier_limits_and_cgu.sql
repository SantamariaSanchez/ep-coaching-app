-- Limites du compte gratuit + traçabilité de l'acceptation des CGU.
-- Voir lib/free-tier.ts et lib/legal.ts pour les règles appliquées à ces
-- colonnes ; app/legal/cgu/page.tsx article 5 pour la version lisible par
-- l'utilisateur.
--
-- Appliquée en prod le 2026-09-08 (migration cadmwvrsjklgtrrebflz
-- 20260908133714_free_tier_limits_and_cgu), ce fichier rejoint le repo après
-- coup.

-- Début de la période gratuite de 2 mois. Voir lib/free-tier.ts.
-- Défaut now() : tout nouveau compte démarre son compteur immédiatement.
-- Rétro-rempli ci-dessous pour les comptes déjà existants à partir de leur
-- date de création réelle, pour ne pas leur donner artificiellement 2 mois
-- pleins à partir d'aujourd'hui.
alter table public.profiles
  add column if not exists free_tier_started_at timestamptz default now();

-- Date à laquelle le compte a été verrouillé (fin des 2 mois gratuits, voir
-- freeTierStatus dans lib/free-tier.ts). null = jamais verrouillé.
alter table public.profiles
  add column if not exists locked_at timestamptz;

-- Date du dernier email d'avertissement avant suppression pour inactivité
-- (~40 puis ~55 jours sans connexion). Évite de renvoyer le même
-- avertissement à chaque passage du cron.
alter table public.profiles
  add column if not exists deletion_warned_at timestamptz;

-- Horodatage + version des CGU acceptées à l'inscription (case à cocher,
-- voir app/auth/client/SignupFlow.tsx et CGU_VERSION dans lib/legal.ts).
alter table public.profiles
  add column if not exists cgu_accepted_at timestamptz;

alter table public.profiles
  add column if not exists cgu_version text;

comment on column public.profiles.free_tier_started_at is
  'Debut de la periode gratuite de 2 mois. Voir lib/free-tier.ts.';
comment on column public.profiles.locked_at is
  'Date de verrouillage du compte gratuit apres expiration des 2 mois. Voir lib/free-tier.ts.';
comment on column public.profiles.deletion_warned_at is
  'Dernier avertissement de suppression pour inactivite envoye (~40 puis ~55 jours). Voir lib/free-tier.ts.';
comment on column public.profiles.cgu_accepted_at is
  'Date d''acceptation des CGU/CGV/politique de confidentialite a l''inscription.';
comment on column public.profiles.cgu_version is
  'Version des CGU acceptee (voir CGU_VERSION dans lib/legal.ts), pour rester opposable si les conditions evoluent.';

-- Rétro-remplissage : les comptes créés avant cette migration démarrent leur
-- période gratuite à leur vraie date de création (auth.users.created_at),
-- jamais à "maintenant" — sinon un membre inscrit il y a 3 mois se
-- retrouverait avec 2 mois pleins à partir d'aujourd'hui.
update public.profiles p
set free_tier_started_at = u.created_at
from auth.users u
where p.id = u.id
  and p.free_tier_started_at is null;
