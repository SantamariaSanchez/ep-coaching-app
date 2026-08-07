import { redirect } from "next/navigation";

// Exercices et salles sont maintenant un seul onglet "Bibliothèque" (voir
// app/dashboard/client/exercises/page.tsx) — cette route reste comme lien
// direct vers l'onglet salles pour ne casser aucun favori/lien existant.
export default function ClientGymsRedirect() {
  redirect("/dashboard/client/exercises?tab=gyms");
}
