import { redirect } from "next/navigation";

// Fusionné dans Bilan (mêmes données daily_logs, présentées séparément
// sans raison) — voir components/ui/BilanProgressView. Même logique que
// l'ancienne redirection client (/dashboard/client/progress → logbook).
export default function CoachMoiProgressionRedirect() {
  redirect("/dashboard/coach/moi/bilan");
}
