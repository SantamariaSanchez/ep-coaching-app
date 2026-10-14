import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo-entity";

// Pages publiques ouvertes à tous les robots (moteurs de recherche et
// moteurs IA). Fermé : ce qui est derrière la connexion ou n'a aucun sens
// dans un résultat de recherche (API, liens de redirection, aperçus de dev).
// "/" et "/launch" ne redirigent qu'un visiteur DÉJÀ connecté (proxy.ts) :
// un robot, sans session, voit toujours la vraie page d'accueil.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/api", "/auth", "/onboarding", "/launch", "/equipe", "/go/", "/guides/", "/preview-dev"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
