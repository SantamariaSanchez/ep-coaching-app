-- Bilan en 2 temps + vraie routine de sommeil (demande explicite, 2026-08-15) :
-- jusqu'ici "sommeil" n'était que 2 champs noyés dans le bilan (sleep_hours,
-- sleep_rating), remplis n'importe quand, sans heure de coucher/lever
-- configurée nulle part. Impossible de calculer une régularité ou de
-- déclencher un bilan du soir "à l'heure du coucher" sans un objectif à
-- comparer.

-- Heure de coucher/lever cible, réglable par chaque utilisateur (client ou
-- coach suivant son propre sommeil) — vit sur profiles, pas une table à
-- part, car c'est un réglage 1-1 avec l'utilisateur comme season_mode ou
-- checkin_day juste au-dessus dans le schéma.
alter table public.profiles
  add column if not exists target_bedtime time,
  add column if not exists target_wake_time time;

comment on column public.profiles.target_bedtime is
  'Heure de coucher visée, réglée par le client/coach lui-même. Sert de référence pour la régularité et déclenche le bilan du soir obligatoire (target_bedtime - 15 min).';
comment on column public.profiles.target_wake_time is
  'Heure de lever visée. Sert de référence pour la régularité du sommeil (comparée à wake_time_actual).';

-- Heure réelle de coucher/lever, saisie au bilan du matin (à côté de
-- sleep_hours/sleep_rating qui restent la durée/qualité ressenties) — sans
-- ça la régularité ne peut être qu'estimée à partir de sleep_hours, ce qui
-- ne dit rien sur le respect d'un horaire.
alter table public.daily_logs
  add column if not exists bedtime_actual time,
  add column if not exists wake_time_actual time;

comment on column public.daily_logs.bedtime_actual is
  'Heure réelle de coucher de la veille, saisie au bilan du matin.';
comment on column public.daily_logs.wake_time_actual is
  'Heure réelle de lever du jour, saisie au bilan du matin.';
