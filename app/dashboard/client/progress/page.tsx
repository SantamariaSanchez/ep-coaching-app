import { redirect } from "next/navigation";

// L'ancienne page "Progression" (bilans/check-ins bruts, peu utile côté
// client) a été fusionnée dans Logbook — poids/nutrition + performances par
// exercice y vivent maintenant ensemble, voir components/client/LogbookClient.
export default function ClientProgressRedirect() {
  redirect("/dashboard/client/logbook");
}
