import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { getCoachPersonalFiles } from "@/lib/coach-personal-files";
import { getCoachPersonalNotes } from "@/lib/coach-personal-notes";
import CoachDocumentsSpace from "@/components/coach/CoachDocumentsSpace";

// Axe 2 (VISION.md) : espace documents/productivité du coach — cadré le
// 2026-08-20 en 3 volets (modèles/contrats types, fichiers perso, notes),
// jamais précisé depuis le message d'origine du 2026-08-14.
export default async function CoachDocumentsPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (!profile || profile.role === "client") redirect("/dashboard/client");

  const [files, notes] = await Promise.all([
    getCoachPersonalFiles(user.id),
    getCoachPersonalNotes(user.id),
  ]);

  return (
    <div className="px-4 py-4 max-w-3xl mx-auto pb-24 md:pb-8 page-transition">
      <CoachDocumentsSpace initialFiles={files} initialNotes={notes} />
    </div>
  );
}
