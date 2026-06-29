-- Annuaire des salles — pré-remplissage avec les grandes enseignes de salles
-- de musculation (France/Belgique). Ce sont des entrées "enseigne" sans
-- ville précise : les membres ajoutent ensuite leur salle locale (avec
-- adresse) à côté, ou notent directement l'enseigne si elle leur convient.
-- INSERT idempotent : ignore les lignes dont le nom existe déjà.

INSERT INTO public.gyms (name, city, address, equipment_notes, website)
SELECT * FROM (VALUES
  ('Basic-Fit', NULL, NULL, 'Grande chaîne low-cost, beaucoup de machines, salle de fonte limitée selon les clubs.', 'https://www.basic-fit.com'),
  ('Fitness Park', NULL, NULL, 'Bon rapport qualité-prix, zone musculation correcte, cours collectifs.', 'https://www.fitnesspark.fr'),
  ('Neoness', NULL, NULL, 'Salles design, équipement varié, présent surtout en Île-de-France.', 'https://www.neoness.fr'),
  ('Keepcool', NULL, NULL, 'Réseau de salles de proximité, plutôt orienté fitness/cardio.', 'https://www.keepcool.fr'),
  ('On Air', NULL, NULL, 'Salles premium avec coaching inclus selon les clubs.', 'https://www.onair-fitness.fr'),
  ('L''Orange Bleue', NULL, NULL, 'Réseau de salles de proximité en franchise, équipement variable selon le club.', 'https://www.orangebleue.fr'),
  ('CMG Sports Club', NULL, NULL, 'Salles haut de gamme, bon plateau de fonte libre en général.', 'https://www.cmg-sportsclub.com'),
  ('Vita Liberté', NULL, NULL, 'Réseau présent surtout dans le sud de la France.', NULL),
  ('Magic Form', NULL, NULL, 'Chaîne franco-belge, équipement orienté musculation classique.', 'https://www.magicform.fr'),
  ('Aqualis Sporting Club', NULL, NULL, 'Salles avec souvent piscine/spa en plus de la zone musculation.', 'https://www.aqualis.fr'),
  ('USC Fitness', NULL, NULL, 'Petites salles de quartier, ambiance plus familiale.', NULL),
  ('Gymlib (réseau multi-salles)', NULL, NULL, 'Abonnement donnant accès à un réseau de salles partenaires, pas une enseigne unique.', 'https://www.gymlib.com'),
  ('Salle indépendante (hardcore gym)', NULL, NULL, 'Catégorie générique pour les salles indépendantes orientées powerlifting/bodybuilding — renomme l''entrée avec le vrai nom si tu en ajoutes une.', NULL)
) AS t(name, city, address, equipment_notes, website)
WHERE NOT EXISTS (SELECT 1 FROM public.gyms g WHERE g.name = t.name);
