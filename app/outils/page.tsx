import type { Metadata } from "next";
import OutilsView from "@/components/outils/OutilsView";

export const metadata: Metadata = {
  title: "Calculateur TDEE et macros gratuit | EP Coaching",
  description:
    "Calcule ton métabolisme, tes calories de maintenance et tes macros gratuitement, sans compte. Plus un calculateur de charge maximale (1RM).",
};

export default function OutilsPage() {
  return <OutilsView />;
}
