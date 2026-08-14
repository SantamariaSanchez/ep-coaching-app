-- Mot-clé CTA pour les Reels : un code à 3 chiffres, attribué une seule
-- fois et jamais réattribué (même si l'entrée est supprimée plus tard),
-- pour que ce que le coach met dans une vidéo publiée reste valable
-- indéfiniment. Adossé à une séquence dédiée : chaque nouvelle ligne
-- (qu'elle vienne de cette session ou de la routine cloud de production
-- continue, qui ne connaît pas cette colonne) reçoit automatiquement le
-- prochain numéro via la valeur par défaut, sans rien à changer côté
-- INSERT. lpad ne tronque jamais : au delà de 999 le code devient
-- naturellement "1000", "1001", etc. plutôt que de casser le format.
create sequence if not exists lead_magnets_keyword_seq start 1;

alter table lead_magnets
  add column if not exists keyword text unique
  default lpad(nextval('lead_magnets_keyword_seq')::text, 3, '0');

-- Backfill des entrées déjà en place, dans l'ordre chronologique de
-- création (avec l'id comme départage stable pour les lignes insérées
-- dans le même batch, donc au même timestamp).
with ordered as (
  select id, row_number() over (order by created_at asc, id asc) as rn
  from lead_magnets
  where keyword is null
)
update lead_magnets lm
set keyword = lpad(ordered.rn::text, 3, '0')
from ordered
where lm.id = ordered.id;

-- La séquence doit repartir après le dernier keyword backfillé, sinon le
-- premier insert de la routine cloud entrerait en collision avec un
-- keyword déjà attribué manuellement ci-dessus.
select setval('lead_magnets_keyword_seq', (select count(*) from lead_magnets), true);

alter table lead_magnets alter column keyword set not null;

create index if not exists lead_magnets_keyword_idx on lead_magnets (keyword);
