import { ALLERGEN_LABELS, DIET_LABELS } from "@/lib/recipes-data";
import { TRAINING_ACCESS_LABELS } from "@/lib/plan-generator";
import type { ClientIntake } from "@/utils/client-intake";
import { ClipboardList } from "lucide-react";

// Résumé compact de la fiche client — affiché en haut des écrans de
// création/édition de programme et de plan nutritionnel pour que le coach
// ait sous les yeux objectifs, régime, allergies, blessures et préférences
// pendant qu'il construit, sans devoir rouvrir un autre onglet.
export default function ClientReferenceCard({ intake }: { intake: ClientIntake | null }) {
  if (!intake) return null;

  const rows: { label: string; value: string }[] = [];
  if (intake.goal_3_months) rows.push({ label: "Objectif 3 mois", value: intake.goal_3_months });
  rows.push({
    label: "Lieu d'entraînement",
    value: intake.training_access ? TRAINING_ACCESS_LABELS[intake.training_access] : "Non renseigné — ne suggère pas de matériel de salle sans vérifier",
  });
  if (intake.gym_name) rows.push({ label: "Salle", value: intake.gym_name });
  if (intake.diet_type) rows.push({ label: "Régime", value: DIET_LABELS[intake.diet_type] });
  if (intake.allergens.length > 0) {
    rows.push({ label: "Allergies", value: intake.allergens.map((a) => ALLERGEN_LABELS[a]).join(", ") });
  }
  if (intake.disliked_foods) rows.push({ label: "Aliments détestés", value: intake.disliked_foods });
  if (intake.liked_foods) rows.push({ label: "Aliments adorés", value: intake.liked_foods });
  if (intake.injuries) rows.push({ label: "Blessures", value: intake.injuries });
  if (intake.exercises_problematic) rows.push({ label: "Exercices à éviter", value: intake.exercises_problematic });
  if (intake.disliked_equipment) rows.push({ label: "Machines détestées", value: intake.disliked_equipment });
  if (intake.preferred_split) rows.push({ label: "Split préféré", value: intake.preferred_split });
  if (intake.availability) rows.push({ label: "Disponibilités", value: intake.availability });
  if (intake.plan_preference) rows.push({ label: "Préférence plan", value: intake.plan_preference === "fixe" ? "Plan fixe" : "Macros flexibles" });
  if (intake.calorie_preference) rows.push({ label: "Apport calorique", value: intake.calorie_preference === "lineaire" ? "Linéaire" : "Variable selon les jours" });

  if (rows.length === 0) return null;

  return (
    <div className="bg-[#1f0101] border border-[#890404]/25 rounded-xl p-4 mb-6">
      <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-[#E01E1E] mb-3">
        <ClipboardList size={11} /> Fiche client : à garder en tête
      </p>
      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
        {rows.map(({ label, value }) => (
          <div key={label} className="flex flex-col gap-0.5">
            <span className="text-[9px] font-semibold uppercase tracking-widest text-[#F5EDED]/30">{label}</span>
            <span className="text-xs text-[#F5EDED]/75 leading-relaxed">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
