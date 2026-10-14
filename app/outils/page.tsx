import type { Metadata } from "next";
import OutilsView from "@/components/outils/OutilsView";
import { entityGraph, breadcrumbNode, SITE_URL } from "@/lib/seo-entity";

const TITLE = "Calculateur TDEE et macros gratuit | EP Coaching";
const DESCRIPTION =
  "Calcule ton métabolisme, tes calories de maintenance et tes macros gratuitement, sans compte. Plus un calculateur de charge maximale (1RM).";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/outils" },
  openGraph: { url: "/outils", title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const JSON_LD = entityGraph([
  {
    "@type": "WebApplication",
    name: "Calculateurs gratuits EP Coaching : TDEE, macros et 1RM",
    url: `${SITE_URL}/outils`,
    applicationCategory: "HealthApplication",
    operatingSystem: "Web",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
    publisher: { "@id": `${SITE_URL}/#entreprise` },
  },
  breadcrumbNode([
    { name: "Accueil", path: "/" },
    { name: "Calculateurs gratuits", path: "/outils" },
  ]),
]);

export default function OutilsPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <OutilsView />
    </>
  );
}
