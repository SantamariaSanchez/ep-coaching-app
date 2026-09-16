import type { MetadataRoute } from "next";
import { getAllLeadMagnets } from "@/lib/lead-magnets";

// Audit SEO 2026-09-16 (retour direct : "améliore encore le SEO du site
// vitrine et de l'appli") : aucun sitemap n'existait pour cette appli,
// contrairement au site vitrine (repo séparé) qui en a déjà un. Sans
// sitemap, les moteurs de recherche découvrent les pages publiques
// uniquement par leurs liens internes, ce qui rate en pratique la quasi
// totalité des ~700+ pages /ressources/[slug] (peu de liens entrants
// internes vers chacune individuellement, voir LEADMAGNETS.md).
const BASE_URL = "https://ep-coaching.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE_URL}/ressources`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/reussites`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/carrieres`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/coachs`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/outils`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/support`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/legal/cgu`, changeFrequency: "yearly", priority: 0.1 },
    { url: `${BASE_URL}/legal/cgv`, changeFrequency: "yearly", priority: 0.1 },
    { url: `${BASE_URL}/legal/confidentialite`, changeFrequency: "yearly", priority: 0.1 },
  ];

  // Le vrai volume de contenu indexable : chaque lead magnet publié a sa
  // propre page /ressources/[slug], jamais listée nulle part explicitement
  // avant ce sitemap.
  const leadMagnets = await getAllLeadMagnets();
  const leadMagnetRoutes: MetadataRoute.Sitemap = leadMagnets.map((m) => ({
    url: `${BASE_URL}/ressources/${m.slug}`,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...leadMagnetRoutes];
}
