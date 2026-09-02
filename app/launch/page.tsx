import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";

export const dynamic = "force-dynamic";

// Point d'entrée dédié à l'appli PWA installée (voir public/manifest.json,
// start_url). Retour direct 2026-09-02 : "l'écran de chargement avec mon
// logo au tout début, ça dure 10s, corrige, c'est hyper important que ce
// soit extrêmement fluide". Avant cette page, le PWA s'ouvrait sur "/" —
// la page marketing publique complète (hero, grille de features, formulaire
// newsletter, animations) — MÊME pour un membre déjà connecté qui rouvre
// l'app depuis son icône d'accueil : tout ce poids devait se charger et se
// peindre avant qu'un lien vers le dashboard soit ne serait-ce que visible,
// pendant que le splash natif du téléphone (logo, généré depuis le
// manifest) restait affiché. Cette page ne rend jamais rien elle-même,
// juste une redirection immédiate côté serveur dès que la session est lue :
// le splash disparaît dès que ce redirect part, au lieu d'attendre le rendu
// complet de la page marketing.
//
// "/" (la page marketing publique) reste strictement inchangée : un
// visiteur qui clique un lien externe ou tape l'URL directement continue
// d'y arriver normalement, avec tout son SEO/cache intact. Seul le lancement
// depuis l'icône PWA installée passe par ici.
export default async function LaunchPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  redirect(profile?.role === "coach" ? "/dashboard/coach" : "/dashboard/client");
}
