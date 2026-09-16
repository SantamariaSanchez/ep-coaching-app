import type { MetadataRoute } from "next";

// Audit SEO 2026-09-16, voir app/sitemap.ts pour le contexte complet.
// Aucun robots.txt n'existait avant, contrairement au site vitrine.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Rien d'utile à indexer derrière l'authentification, et certaines
      // routes (dashboard, api) exposent des paramètres qui n'ont aucun
      // sens à apparaître dans des résultats de recherche.
      disallow: ["/dashboard", "/api", "/auth", "/onboarding", "/launch"],
    },
    sitemap: "https://ep-coaching.vercel.app/sitemap.xml",
  };
}
