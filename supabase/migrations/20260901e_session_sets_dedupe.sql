-- Doublons de series dans le logbook
--
-- Un set est identifie de facon unique par (seance, exercice, numero de
-- serie). Rien ne l'imposait en base, et l'appli pouvait renvoyer le meme
-- set plusieurs fois : double-tap sur "Valider le set" en salle (les deux
-- requetes partent a ~1 seconde d'ecart), revalidation apres correction,
-- meme seance rouverte ailleurs. Resultat constate en production : des
-- series strictement identiques en double, comptees deux fois dans le
-- volume par muscle, le recap de seance et l'historique de l'exercice.
--
-- 1) On garde la ligne la plus RECENTE de chaque triplet (c'est la derniere
--    correction saisie par le client) et on supprime les autres.
-- 2) On ajoute l'index unique qui rend le probleme impossible a l'avenir.
--    La route POST sait deja gerer la collision : elle met a jour la ligne
--    existante au lieu d'en inserer une seconde.

begin;

with ranked as (
  select
    id,
    row_number() over (
      partition by session_id, exercise_name, set_number
      order by created_at desc, id desc
    ) as rn
  from public.session_sets
)
delete from public.session_sets s
using ranked r
where s.id = r.id
  and r.rn > 1;

create unique index if not exists session_sets_unique_set_per_exercise_idx
  on public.session_sets (session_id, exercise_name, set_number);

commit;
