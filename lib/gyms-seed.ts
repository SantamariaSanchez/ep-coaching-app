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
];
