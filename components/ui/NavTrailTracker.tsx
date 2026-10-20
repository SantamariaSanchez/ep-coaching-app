"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { recordVisit } from "@/lib/nav-trail";

// Note chaque page vue dans l'onglet (voir lib/nav-trail.ts), pour que les
// boutons « Retour » sachent d'où l'on vient. Monté une seule fois dans le
// layout racine, ne rend rien.
export default function NavTrailTracker() {
  const pathname = usePathname();
  useEffect(() => {
    recordVisit(`${pathname}${window.location.search}`);
  }, [pathname]);
  return null;
}
