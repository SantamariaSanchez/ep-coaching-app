import { equipmentFilterFor, templateFor, type GymKind } from "@/lib/gym-equipment";

// « Je ne suis pas dans ma salle aujourd'hui » (chantier C52, 0RIR EP21) :
// en séance, le remplacement d'un exercice peut se limiter au matériel de
// l'endroit où la cliente se trouve (une autre de ses salles, la maison ou
// l'hôtel, ou rien du tout). Le choix ne vaut que pour la séance : on ne
// change ni le programme ni la salle enregistrée.

export const SWAP_PLACE_STORAGE_KEY = "ep-swap-place";

export type SwapPlace = "habituelle" | "maison" | "sans_materiel" | `gym:${string}`;

export const FIXED_SWAP_PLACES: { key: SwapPlace; label: string; hint: string }[] = [
  { key: "habituelle", label: "Ma salle habituelle", hint: "Tout le matériel de la bibliothèque" },
  { key: "maison", label: "Maison ou hôtel", hint: "Haltères, banc, élastiques, barre de traction" },
  { key: "sans_materiel", label: "Sans matériel", hint: "Poids du corps seulement" },
];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Lit un lieu reçu du navigateur ; tout ce qui n'est pas reconnu redevient « habituelle ». */
export function parseSwapPlace(raw: string | null | undefined): SwapPlace {
  const v = (raw ?? "").trim();
  if (v === "maison" || v === "sans_materiel" || v === "habituelle") return v;
  if (v.startsWith("gym:") && UUID_RE.test(v.slice(4))) return v as SwapPlace;
  return "habituelle";
}

export function swapPlaceGymId(place: SwapPlace): string | null {
  return place.startsWith("gym:") ? place.slice(4) : null;
}

/**
 * Matériel à utiliser comme filtre pour ce lieu, ou null s'il ne faut rien
 * filtrer (salle habituelle, ou salle enregistrée sans matériel renseigné).
 */
export function equipmentForSwapPlace(
  place: SwapPlace,
  gym?: { kind?: GymKind | string | null; equipment?: readonly string[] | null } | null
): string[] | null {
  if (place === "habituelle") return null;
  if (place === "maison") return [...(templateFor("home_gym")?.equipment ?? [])];
  if (place === "sans_materiel") return [];
  return equipmentFilterFor(gym ?? null);
}
