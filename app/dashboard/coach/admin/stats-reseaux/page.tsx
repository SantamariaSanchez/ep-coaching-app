import { redirect } from "next/navigation";

// Vue Administration des stats réseaux (synchro Windsor) retirée le
// 03/11/2026 : décision d'Emmanuel, les stats brutes restent sur chaque
// réseau et l'appli sert à savoir ce qui marche (page Ce qui marche).
export default function AdminSocialStatsPage() {
  redirect("/dashboard/coach/stats-reseaux");
}
