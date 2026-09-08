-- Séquence de relance des membres dormants (voir lib/reengagement.ts et
-- app/api/cron/weekly-reengagement/route.ts). Chaque étape de la séquence a
-- un angle différent ; ce compteur avance d'une étape à chaque relance envoyée
-- et évite de renvoyer deux fois le même message à la même personne.
--
-- Appliquée en prod le 2026-09-08 (migration cadmwvrsjklgtrrebflz
-- 20260908125850_reengagement_sequence_step), ce fichier rejoint le repo après
-- coup.

alter table public.profiles
  add column if not exists reengagement_step smallint not null default 0;

comment on column public.profiles.reengagement_step is
  'Étape atteinte dans la séquence de relance des membres dormants (0 = aucune relance envoyée). Voir lib/reengagement.ts.';
