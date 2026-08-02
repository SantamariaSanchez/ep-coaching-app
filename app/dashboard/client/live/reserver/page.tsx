import { redirect } from "next/navigation";

// Ancienne URL — conservée en redirection pour ne pas casser d'éventuels
// favoris/liens existants. La réservation vit désormais sur la page dédiée
// au format 1:1, avec sa présentation complète.
export default function LegacyReserverPage() {
  redirect("/dashboard/client/live/format/1to1");
}
