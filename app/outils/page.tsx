import type { Metadata } from "next";
import OutilsView from "@/components/outils/OutilsView";

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

export default function OutilsPage() {
  return <OutilsView />;
}
