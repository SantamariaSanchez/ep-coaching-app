import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { getExerciseLibrary } from "@/utils/exercise-library";
import ExerciseLibraryView from "@/components/ui/ExerciseLibraryView";
import { createExercise, updateExercise, deleteExercise } from "@/app/dashboard/client/exercises/actions";
import { Dumbbell } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CoachExercisesPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "client") redirect("/dashboard/client/exercises");

  const exercises = await getExerciseLibrary();

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto pb-24 md:pb-8 page-transition">
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Training
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight flex items-center gap-3">
          <Dumbbell size={26} className="text-[#E01E1E]" strokeWidth={1.8} />
          Bibliothèque d&apos;exercices
        </h1>
        <p className="mt-1 text-sm text-[#F5EDED]/40">
          Modifie une entrée ou ajoute le lien vidéo d&apos;exécution — tes membres peuvent aussi enrichir la liste.
        </p>
      </div>

      <ExerciseLibraryView
        exercises={exercises}
        isCoach
        createExercise={createExercise}
        updateExercise={updateExercise}
        deleteExercise={deleteExercise}
      />
    </div>
  );
}
