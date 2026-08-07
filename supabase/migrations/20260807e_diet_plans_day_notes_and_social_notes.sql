-- Pourquoi CE jour de la semaine est structuré comme ça (jour haut en
-- glucides avant une grosse séance, jour off en déficit plus marqué...) —
-- une décision de conception par jour, pas seulement un nombre de
-- calories qui tombe du ciel. Stocké en JSON (clé = DayOfWeek) plutôt
-- qu'une table à part : c'est une note de conception, pas une donnée
-- relationnelle interrogée indépendamment.
alter table diet_plans
  add column if not exists day_notes jsonb;

comment on column diet_plans.day_notes is 'Raison de la structure de chaque jour ({"mer": "haut glucides avant la séance jambes du jeudi soir", ...}), décidée par le coach.';

-- Sorties, repas en famille, contraintes sociales connues sur la période
-- couverte par ce plan — pour que la diète reste tenable dans la vraie vie
-- du client, pas seulement sur le papier.
alter table diet_plans
  add column if not exists social_notes text;

comment on column diet_plans.social_notes is 'Sorties, repas en famille, contraintes sociales connues — pour une diète tenable dans la vraie vie du client.';
