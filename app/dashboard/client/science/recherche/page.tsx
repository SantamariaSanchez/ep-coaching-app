import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";

export const dynamic = "force-dynamic";

// La recherche directe sur PubMed montre des sources brutes : aucune source
// n'est jamais affichée à un client, elle reste réservée au coach. Le client
// retrouve les énoncés simples dans la bibliothèque.
export default async function ClientScienceRecherchePage() {
  const user = await getUser();
  if (!user) redirect("/");
  const profile = await getProfile(user.id);
  if (profile?.role === "coach") redirect("/dashboard/coach/science/recherche");
  redirect("/dashboard/client/science/bibliotheque");
}
