import type { MetadataRoute } from "next";
import { getAllLeadMagnets } from "@/lib/lead-magnets";
import { SITE_URL } from "@/lib/seo-entity";

// Sitemap des pages publiques (audit SEO 2026-09-16, repris le 2026-10-14) :
// toutes les pages lisibles sans compte, plus chaque guide /ressources/<slug>
// avec sa vraie date de mise à jour. Pages légales exclues (noindex depuis
// le 2026-10-13), comme tout ce qui est derrière la connexion.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/a-propos`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/coach-sportif-annecy`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/ressources`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/outils`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/coachs`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/carrieres`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/reussites`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
    { url: `${SITE_URL}/bio`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/support`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  // Le vrai volume de contenu indexable : chaque guide publié a sa page.
  const leadMagnets = await getAllLeadMagnets();
  const leadMagnetRoutes: MetadataRoute.Sitemap = leadMagnets.map((m) => ({
    url: `${SITE_URL}/ressources/${m.slug}`,
    ...(m.updatedAt ? { lastModified: new Date(m.updatedAt) } : {}),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...leadMagnetRoutes];
}
