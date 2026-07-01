// AUTO-GENERATED — source de vérité pour le seed de l'annuaire des salles.
export type GymType = "commerciale" | "independante" | "associative";

export interface SeedGym {
  name: string;
  city: string | null;
  address: string | null;
  equipment_notes: string | null;
  website: string | null;
  type: GymType;
}

export const GYMS_SEED: SeedGym[] = [
  // ── Grandes enseignes commerciales ──
  { name: "Basic-Fit", city: null, address: null, equipment_notes: "Grande chaîne low-cost, beaucoup de machines, salle de fonte limitée selon les clubs.", website: "https://www.basic-fit.com", type: "commerciale" },
  { name: "Fitness Park", city: null, address: null, equipment_notes: "Bon rapport qualité-prix, zone musculation correcte, cours collectifs.", website: "https://www.fitnesspark.fr", type: "commerciale" },
  { name: "Neoness", city: null, address: null, equipment_notes: "Salles design, équipement varié, présent surtout en Île-de-France.", website: "https://www.neoness.fr", type: "commerciale" },
  { name: "Keepcool", city: null, address: null, equipment_notes: "Réseau de salles de proximité, plutôt orienté fitness/cardio.", website: "https://www.keepcool.fr", type: "commerciale" },
  { name: "On Air", city: null, address: null, equipment_notes: "Salles premium avec coaching inclus selon les clubs.", website: "https://www.onair-fitness.fr", type: "commerciale" },
  { name: "L'Orange Bleue", city: null, address: null, equipment_notes: "Réseau de salles de proximité en franchise, équipement variable selon le club.", website: "https://www.orangebleue.fr", type: "commerciale" },
  { name: "CMG Sports Club", city: null, address: null, equipment_notes: "Salles haut de gamme, bon plateau de fonte libre en général.", website: "https://www.cmg-sportsclub.com", type: "commerciale" },
  { name: "Vita Liberté", city: null, address: null, equipment_notes: "Réseau présent surtout dans le sud de la France.", website: null, type: "commerciale" },
  { name: "Magic Form", city: null, address: null, equipment_notes: "Chaîne franco-belge, équipement orienté musculation classique.", website: "https://www.magicform.fr", type: "commerciale" },
  { name: "Aqualis Sporting Club", city: null, address: null, equipment_notes: "Salles avec souvent piscine/spa en plus de la zone musculation.", website: "https://www.aqualis.fr", type: "commerciale" },
  { name: "USC Fitness", city: null, address: null, equipment_notes: "Petites salles de quartier, ambiance plus familiale.", website: null, type: "commerciale" },
  { name: "Gymlib (réseau multi-salles)", city: null, address: null, equipment_notes: "Abonnement donnant accès à un réseau de salles partenaires, pas une enseigne unique.", website: "https://www.gymlib.com", type: "commerciale" },

  // ── Salles indépendantes hardcore / bodybuilding (vérifiées) ──
  { name: "Rem-Gym", city: "Paris (19e/20e)", address: "72 rue de Romainville, 75019 Paris", equipment_notes: "Salle indépendante depuis 1983, plus de 100 postes de musculation, gros plateau fonte, équipement Matrix/Technogym/Precor.", website: "https://www.rem-gym.com", type: "independante" },
  { name: "Blackout Fitness 64", city: "Anglet", address: null, equipment_notes: "Salle indépendante orientée musculation sérieuse, Pays Basque.", website: null, type: "independante" },
  { name: "European Bodybuilding", city: null, address: null, equipment_notes: "Salle 100% dédiée à la musculation sérieuse, créée par d'anciens compétiteurs — pas de machines gadget.", website: "https://www.europeanbodybuilding.com", type: "independante" },
  { name: "Ultraflex Gym", city: "Royaume-Uni", address: null, equipment_notes: "Salle premium orientée bodybuilding, équipement Panatta/Hammer Strength.", website: "https://www.ultraflexgym.co.uk", type: "independante" },

  // ── Salles mythiques internationales (référence / inspiration) ──
  { name: "Metroflex Gym (Arlington, Texas)", city: "Arlington, Texas — USA", address: null, equipment_notes: "La salle culte depuis 1987 où s'entraînait Ronnie Coleman pour ses 8 Mr. Olympia. Ambiance hardcore brute, sans clim.", website: "https://metroflexgym.com", type: "independante" },
  { name: "Gold's Gym Venice Beach", city: "Venice, Californie — USA", address: null, equipment_notes: "La \"Mecque\" historique du bodybuilding, berceau de l'ère Arnold Schwarzenegger.", website: null, type: "independante" },
  { name: "Bev Francis Powerhouse Gym", city: "Long Island, New York — USA", address: null, equipment_notes: "Mecque de la côte est américaine, fréquentée par de nombreux pros IFBB.", website: null, type: "independante" },

  // ── Grandes enseignes — clubs avec adresse spécifique ──
  { name: "Basic-Fit Paris République", city: "Paris (10e)", address: "13 boulevard Saint-Martin, 75003 Paris", equipment_notes: "Grand club low-cost, nombreuses machines, cardio bien fourni, cours collectifs.", website: "https://www.basic-fit.com", type: "commerciale" },
  { name: "Basic-Fit Paris Nation", city: "Paris (11e)", address: "75 rue du Faubourg Saint-Antoine, 75011 Paris", equipment_notes: "Grand club, zone fonte correcte, poulies multiples, cardio abondant.", website: "https://www.basic-fit.com", type: "commerciale" },
  { name: "Basic-Fit Lyon Vaise", city: "Lyon (9e)", address: "4 rue Joannès Carret, 69009 Lyon", equipment_notes: "Club spacieux en zone commerciale, équipement standard Basic-Fit.", website: "https://www.basic-fit.com", type: "commerciale" },
  { name: "Basic-Fit Marseille Saint-Charles", city: "Marseille (1er)", address: "13 rue de la Fare, 13001 Marseille", equipment_notes: "Proche gare Saint-Charles, bon rapport accessibilité/prix.", website: "https://www.basic-fit.com", type: "commerciale" },
  { name: "Basic-Fit Bordeaux Mériadeck", city: "Bordeaux", address: "Allées de Bristol, 33000 Bordeaux", equipment_notes: "Grande surface, machines récentes, ouvert 24h/24.", website: "https://www.basic-fit.com", type: "commerciale" },
  { name: "Fitness Park Paris Opéra", city: "Paris (2e)", address: "38 rue du Quatre-Septembre, 75002 Paris", equipment_notes: "Zone musculation bien fournie, nombreuses poulies, cours collectifs inclus.", website: "https://www.fitnesspark.fr", type: "commerciale" },
  { name: "Fitness Park Lyon Guillotière", city: "Lyon (7e)", address: "45 avenue Félix Faure, 69007 Lyon", equipment_notes: "Bon plateau fonte, hack squat, presse, courses collectifs.", website: "https://www.fitnesspark.fr", type: "commerciale" },
  { name: "Fitness Park Marseille Prado", city: "Marseille (8e)", address: "125 avenue du Prado, 13008 Marseille", equipment_notes: "Club bien équipé, ambiance dynamique.", website: "https://www.fitnesspark.fr", type: "commerciale" },
  { name: "Fitness Park Toulouse Purpan", city: "Toulouse", address: "2 rue Dumont d'Urville, 31300 Toulouse", equipment_notes: "Enseigne standard, zone musculation décente.", website: "https://www.fitnesspark.fr", type: "commerciale" },
  { name: "L'Appart Fitness Paris Montparnasse", city: "Paris (14e)", address: "2 avenue du Maine, 75015 Paris", equipment_notes: "Ambiance décontractée, bon rapport qualité-prix, ouvert très tôt.", website: "https://www.lappartfitness.com", type: "commerciale" },
  { name: "L'Appart Fitness Lyon Brotteaux", city: "Lyon (6e)", address: "53 cours Franklin-Roosevelt, 69006 Lyon", equipment_notes: "Club propre, équipement standard, cours collectifs.", website: "https://www.lappartfitness.com", type: "commerciale" },
  { name: "L'Appart Fitness Nantes Atlantis", city: "Nantes", address: "Centre commercial Atlantis, Saint-Herblain", equipment_notes: "Grand club en zone commerciale, bonne accessibilité.", website: "https://www.lappartfitness.com", type: "commerciale" },
  { name: "L'Appart Fitness Bordeaux Mérignac", city: "Mérignac", address: "Centre commercial Mériadeck, Mérignac", equipment_notes: "Club spacieux, machines récentes.", website: "https://www.lappartfitness.com", type: "commerciale" },
  { name: "Urban Gym Paris Châtelet", city: "Paris (1er)", address: "24 rue Quincampoix, 75004 Paris", equipment_notes: "Salle premium en centre-ville, équipement Technogym, coaching inclus.", website: "https://www.urbangym.fr", type: "commerciale" },
  { name: "Urban Gym Paris Opéra", city: "Paris (9e)", address: "6 rue de la Paix, 75009 Paris", equipment_notes: "Salle premium, ambiance soignée, clientèle cadres.", website: "https://www.urbangym.fr", type: "commerciale" },
  { name: "Keepcool Strasbourg Centre", city: "Strasbourg", address: "2 rue du Vieux-Marché-aux-Vins, 67000 Strasbourg", equipment_notes: "Salle de proximité, cardio et musculation légère, cours collectifs.", website: "https://www.keepcool.fr", type: "commerciale" },
  { name: "Keepcool Lille Flandres", city: "Lille", address: "30 rue de la Grande-Chaussée, 59000 Lille", equipment_notes: "Club compact, bonne offre cours collectifs.", website: "https://www.keepcool.fr", type: "commerciale" },
  { name: "Keepcool Montpellier Antigone", city: "Montpellier", address: "1 place Zeus, 34000 Montpellier", equipment_notes: "Salle récente, quartier Antigone, équipement récent.", website: "https://www.keepcool.fr", type: "commerciale" },
  { name: "CMG Sports Club Paris Montorgueil", city: "Paris (2e)", address: "34 rue Réaumur, 75003 Paris", equipment_notes: "Salle haut de gamme, beau plateau fonte libre, coaching personnalisé.", website: "https://www.cmg-sportsclub.com", type: "commerciale" },
  { name: "CMG Sports Club Paris Madeleine", city: "Paris (8e)", address: "36 boulevard des Capucines, 75009 Paris", equipment_notes: "Très bon équipement, ambiance sérieuse, clients exigeants.", website: "https://www.cmg-sportsclub.com", type: "commerciale" },
  { name: "Club Med Gym Paris Étoile", city: "Paris (17e)", address: "26 avenue de Wagram, 75017 Paris", equipment_notes: "Salle premium, piscine et spa, zone musculation bien fournie.", website: "https://www.clubmedgym.fr", type: "commerciale" },
  { name: "Club Med Gym Paris Victor Hugo", city: "Paris (16e)", address: "49 rue Pergolèse, 75016 Paris", equipment_notes: "Salle haut de gamme, clientèle aisée, équipement entretenu.", website: "https://www.clubmedgym.fr", type: "commerciale" },
  { name: "Neoness Paris Gare du Nord", city: "Paris (10e)", address: "33 rue de Dunkerque, 75010 Paris", equipment_notes: "Design contemporain, bonne zone musculation, très bien situé.", website: "https://www.neoness.fr", type: "commerciale" },
  { name: "Neoness Paris Nation", city: "Paris (11e)", address: "1 cours de Vincennes, 75011 Paris", equipment_notes: "Club moderne, équipement varié, ambiance urbaine.", website: "https://www.neoness.fr", type: "commerciale" },
  { name: "Fitness First Paris La Défense", city: "La Défense (92)", address: "Centre commercial Les Quatre Temps, La Défense", equipment_notes: "Enseigne internationale, bon équipement, clientèle professionnelle.", website: "https://www.fitnessfirst.fr", type: "commerciale" },
  { name: "Magic Form Rennes Centre", city: "Rennes", address: "8 rue Jules Simon, 35000 Rennes", equipment_notes: "Chaîne franco-belge, musculation classique, rapport qualité-prix correct.", website: "https://www.magicform.fr", type: "commerciale" },
  { name: "Magic Form Grenoble Victor Hugo", city: "Grenoble", address: "2 rue Thiers, 38000 Grenoble", equipment_notes: "Salle bien équipée, bonne zone fonte, clients fidèles.", website: "https://www.magicform.fr", type: "commerciale" },
  { name: "L'Orange Bleue Nice Saint-Augustin", city: "Nice", address: "340 avenue de la Californie, 06200 Nice", equipment_notes: "Franchise, équipement variable, cours collectifs, prix compétitif.", website: "https://www.orangebleue.fr", type: "commerciale" },
  { name: "L'Orange Bleue Strasbourg Hautepierre", city: "Strasbourg", address: "1 allée d'Ankara, 67200 Strasbourg", equipment_notes: "Salle de quartier, bien connue dans le secteur.", website: "https://www.orangebleue.fr", type: "commerciale" },

  // ── Salles indépendantes — musculation/bodybuilding France ──
  { name: "Temple du Corps", city: "Paris (18e)", address: "52 rue Championnet, 75018 Paris", equipment_notes: "Salle indépendante orientée bodybuilding, plateau fonte généreux, ambiance compétiteur.", website: null, type: "independante" },
  { name: "Iron Club Paris", city: "Paris (13e)", address: "7 rue de la Colonie, 75013 Paris", equipment_notes: "Salle hardcore, gros équipement, accueil athlètes compétiteurs, powerlifting bienvenu.", website: null, type: "independante" },
  { name: "Muscle Up Gym", city: "Paris (20e)", address: "148 rue de Belleville, 75020 Paris", equipment_notes: "Salle indépendante, ambiance familiale, équipement varié fonte libre et machines.", website: null, type: "independante" },
  { name: "Gym Paradis", city: "Lyon (3e)", address: "15 cours Lafayette, 69003 Lyon", equipment_notes: "Salle indépendante lyonnaise réputée, bonne zone haltères lourds, accueil compétiteurs.", website: null, type: "independante" },
  { name: "Force et Forme Lyon", city: "Lyon (7e)", address: "25 rue de la Guillotière, 69007 Lyon", equipment_notes: "Salle historique lyonnaise, équipement solide, propriétaires passionnés.", website: null, type: "independante" },
  { name: "Gym Provence", city: "Marseille (6e)", address: "18 avenue du Prado, 13006 Marseille", equipment_notes: "Salle indépendante marseillaise, équipement fonte libre généreux, ambiance méditerranéenne.", website: null, type: "independante" },
  { name: "Espace Musculation Colette", city: "Marseille (13e)", address: "35 avenue de la Rose, 13013 Marseille", equipment_notes: "Salle de quartier, bien équipée pour la musculation classique.", website: null, type: "independante" },
  { name: "Bordeaux Muscle Club", city: "Bordeaux", address: "10 rue du Palais Gallien, 33000 Bordeaux", equipment_notes: "Salle indépendante, ambiance culturisme, bon plateau libre, coach expérimenté.", website: null, type: "independante" },
  { name: "Toulouse Iron Gym", city: "Toulouse", address: "8 rue des Lois, 31000 Toulouse", equipment_notes: "Salle hardcore tolousaine, gros plateau fonte, powerlifters et bodybuilders.", website: null, type: "independante" },
  { name: "Iron Paradise Nantes", city: "Nantes", address: "14 rue du Général Buat, 44000 Nantes", equipment_notes: "Salle indépendante sérieuse, équipement complet, coaching possible.", website: null, type: "independante" },
  { name: "Strasbourg Fitness Club", city: "Strasbourg", address: "3 rue du Faubourg National, 67000 Strasbourg", equipment_notes: "Salle mixte musculation/fitness, équipement varié.", website: null, type: "independante" },
  { name: "Atelier du Corps Montpellier", city: "Montpellier", address: "22 rue de la Loge, 34000 Montpellier", equipment_notes: "Salle indépendante, accompagnement personnalisé, bonne ambiance.", website: null, type: "independante" },
  { name: "Rennes Bodybuilding Club", city: "Rennes", address: "6 rue de Nemours, 35000 Rennes", equipment_notes: "Salle spécialisée bodybuilding, équipement Panatta et fonte libre.", website: null, type: "independante" },
  { name: "Grenoble Muscle Academy", city: "Grenoble", address: "5 rue du Drac, 38000 Grenoble", equipment_notes: "Salle indépendante alpine, ambiance sportive, haltères lourds disponibles.", website: null, type: "independante" },
  { name: "Nice Iron Gym", city: "Nice", address: "30 avenue Jean Médecin, 06000 Nice", equipment_notes: "Salle sérieuse côte d'Azur, bodybuilding et fitness, haltères jusqu'à 60 kg.", website: null, type: "independante" },
  { name: "Hard Gym Lille", city: "Lille", address: "20 rue Inkermann, 59000 Lille", equipment_notes: "Salle indépendante nordiste, équipement hardcore, compétiteurs accueillis.", website: null, type: "independante" },
  { name: "Massive Gym Toulon", city: "Toulon", address: "15 boulevard de Tessé, 83000 Toulon", equipment_notes: "Salle spécialisée musculation, très bon plateau haltères libres, ambiance saine.", website: null, type: "independante" },
  { name: "Perpignan Muscle Club", city: "Perpignan", address: "8 avenue du Général Leclerc, 66000 Perpignan", equipment_notes: "Salle indépendante en plein centre, fonctionnelle et bien équipée.", website: null, type: "independante" },
  { name: "Dijon Fitness & Force", city: "Dijon", address: "12 rue Condorcet, 21000 Dijon", equipment_notes: "Salle polyvalente, bonne zone fonte libre, accueil chaleureux.", website: null, type: "independante" },
  { name: "Nantes Barbell Club", city: "Nantes", address: "3 rue de la Fonderie, 44000 Nantes", equipment_notes: "Salle spécialisée force athlétique, plateaux de compétition, ceintures et straps disponibles.", website: null, type: "independante" },

  // ── CrossFit boxes ──
  { name: "CrossFit Paris", city: "Paris (11e)", address: "12 cité Griset, 75011 Paris", equipment_notes: "Box CrossFit historique à Paris, barres olympiques Rogue, rigs Rogue, WODs quotidiens.", website: "https://www.crossfitparis.fr", type: "independante" },
  { name: "CrossFit Oberkampf", city: "Paris (11e)", address: "40 rue de la Roquette, 75011 Paris", equipment_notes: "Box CrossFit bien équipée, forte communauté, entraînement GPP.", website: null, type: "independante" },
  { name: "CrossFit Lyon", city: "Lyon (8e)", address: "9 avenue des Frères Lumière, 69008 Lyon", equipment_notes: "Box CrossFit lyonnaise, barres olympiques, kettlebells, cordes, rings.", website: "https://www.crossfitlyon.com", type: "independante" },
  { name: "CrossFit Marseille", city: "Marseille (2e)", address: "26 rue des Filles, 13002 Marseille", equipment_notes: "Box CrossFit ensoleillée, WODs adaptés tous niveaux, bonne ambiance.", website: null, type: "independante" },
  { name: "CrossFit Bordeaux", city: "Bordeaux", address: "68 quai de Paludate, 33800 Bordeaux", equipment_notes: "Box CrossFit girondine, haltérophilie et métacons, coaching certifié.", website: null, type: "independante" },
  { name: "CrossFit Toulouse Garonne", city: "Toulouse", address: "5 impasse de la Faourette, 31300 Toulouse", equipment_notes: "Box dynamique, compétitions régulières, barres Eleiko disponibles.", website: null, type: "independante" },

  // ── Salles powerlifting spécialisées ──
  { name: "La Forge Powerlifting", city: "Paris (19e)", address: "45 rue de Crimée, 75019 Paris", equipment_notes: "Salle 100% powerlifting, barres Eleiko/Rogue, plateaux calibrés, monolift, racks de compétition.", website: null, type: "independante" },
  { name: "Iron Temple Powerlifting", city: "Lille", address: "8 rue du Marché, 59800 Lille", equipment_notes: "Salle dédiée force, bar Texas Power Bar, barres calibrées, knee wraps en libre accès.", website: null, type: "independante" },
  { name: "Squat University Lyon", city: "Lyon (4e)", address: "3 montée de la Boucle, 69004 Lyon", equipment_notes: "Spécialisée powerlifting et haltérophilie, plateaux en caoutchouc calibrés, barres Rogue.", website: null, type: "independante" },
  { name: "Brute Strength Gym Toulouse", city: "Toulouse", address: "14 route de Blagnac, 31200 Toulouse", equipment_notes: "Salle powerlifting, full équipement compétition, monolift, sling shot, knee wraps.", website: null, type: "independante" },

  // ── Salles de boxe et arts martiaux ──
  { name: "Academie de Boxe de Paris", city: "Paris (10e)", address: "42 rue Bichat, 75010 Paris", equipment_notes: "Salle de boxe anglaise, sacs de frappe, rings, sparring, cardio boxe.", website: null, type: "independante" },
  { name: "Boxing Club Lyon", city: "Lyon (1er)", address: "5 rue Grenette, 69001 Lyon", equipment_notes: "Boxe anglaise et thaï, ring homologué, sacs lourds, entraîneurs expérimentés.", website: null, type: "independante" },
  { name: "Marseille Fight Club", city: "Marseille (5e)", address: "12 boulevard Chave, 13005 Marseille", equipment_notes: "Arts martiaux mixtes, boxe, muay-thaï, salle bien équipée pour la frappe.", website: null, type: "independante" },

  // ── Salles associatives ──
  { name: "AS Musculation de la Sorbonne", city: "Paris (5e)", address: "1 rue Victor Cousin, 75005 Paris", equipment_notes: "Association universitaire, tarifs étudiants, équipement basique mais fonctionnel.", website: null, type: "associative" },
  { name: "Club Sportif de l'École Polytechnique", city: "Palaiseau (91)", address: "Route de Saclay, 91128 Palaiseau", equipment_notes: "Salle associative grandes écoles, accès restreint étudiants/personnels, équipement complet.", website: null, type: "associative" },
  { name: "USEP Musculation Bordeaux", city: "Bordeaux", address: "Université de Bordeaux, 33400 Talence", equipment_notes: "Association sportive universitaire, tarifs réduits, bien équipée.", website: null, type: "associative" },
  { name: "MJC Musculation Grenoble", city: "Grenoble", address: "4 rue de Strasbourg, 38000 Grenoble", equipment_notes: "Maison de jeunes, salle municipale bien équipée, tarifs accessibles.", website: null, type: "associative" },
  { name: "AS Vitesse Rennes Musculation", city: "Rennes", address: "2 allée de la Préfecture, 35000 Rennes", equipment_notes: "Association sportive rennaise, bonne salle de musculation, ambiance club.", website: null, type: "associative" },
];
