-- Lieu / matériel d'entraînement du client — jusque-là complètement absent
-- de la fiche client, alors que le générateur de suggestions et le
-- constructeur de programme n'avaient donc aucun moyen de savoir si un
-- client s'entraîne en salle (accès machines/poulies) ou à la maison
-- (rien, ou juste haltères/élastique). Résultat concret : des machines de
-- salle (parfois même une marque précise, ex. Atlantis) suggérées à des
-- clients qui n'ont jamais mis les pieds dans une salle.
--
-- 'salle'              -> accès complet (machines, poulies, barres, poids libres)
-- 'domicile_equipe'    -> poids libres / élastique / poids du corps, jamais machine/poulie
-- 'domicile_minimal'   -> poids du corps (+ élastique) uniquement
--
-- gym_name reste tel quel (rempli seulement si training_access = 'salle',
-- géré côté onboarding/formulaire, pas de contrainte DB pour rester souple
-- sur les fiches déjà existantes).
alter table public.client_intake
  add column if not exists training_access text
    check (training_access in ('salle', 'domicile_equipe', 'domicile_minimal'));
