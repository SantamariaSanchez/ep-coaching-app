import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { getExerciseLibrary, getTopExercisesMissingVideo } from "@/utils/exercise-library";
import { getGymsWithReviews } from "@/utils/gyms";
import { getEquipmentType, type EquipmentType } from "@/lib/exercise-library-content";
import ExerciseLibraryView from "@/components/ui/ExerciseLibraryView";
import GymsDirectoryView from "@/components/ui/GymsDirectoryView";
import LibraryHub from "@/components/ui/LibraryHub";
import SeedLibraryButton from "@/components/ui/SeedLibraryButton";
import {
  createExercise,
  updateExercise,
  deleteExercise,
  seedOfficialExercises,
} from "@/app/dashboard/client/exercises/actions";
import {
  createGym,
  updateGym,
  deleteGym,
  upsertGymReview,
  deleteGymReview,
  seedOfficialGyms,
} from "@/app/dashboard/client/gyms/actions";
import { Dumbbell } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CoachExercisesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "client") redirect("/dashboard/client/exercises");

  const { tab } = await searchParams;

  const [exercises, gyms, missingVideoTop] = await Promise.all([
    getExerciseLibrary(),
    getGymsWithReviews(),
    getTopExercisesMissingVideo(),
  ]);

  const exerciseTypeCounts = exercises.reduce<Record<EquipmentType, number>>((acc, ex) => {
    const t = getEquipmentType(ex.equipment);
    acc[t] = (acc[t] ?? 0) + 1;
    return acc;
  }, {} as Record<EquipmentType, number>);

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto pb-24 md:pb-8 page-transition">
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Training
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight flex items-center gap-3">
          <Dumbbell size={26} className="text-[#E01E1E]" strokeWidth={1.8} />
          Bibliothèque
        </h1>
        <p className="mt-1 text-sm text-[#F5EDED]/40 mb-3">
          Exercices et salles de musculation, dans un seul endroit. Le matériel d&apos;une salle détermine ce
          qui y est réalisable. Tes membres peuvent aussi enrichir les deux listes.
        </p>
        <div className="flex flex-wrap gap-2">
          <SeedLibraryButton label="Importer la bibliothèque officielle" action={seedOfficialExercises} />
          <SeedLibraryButton label="Importer les enseignes officielles" action={seedOfficialGyms} />
        </div>
      </div>

      <LibraryHub
        initialTab={tab === "gyms" ? "gyms" : "exercises"}
        exerciseCount={exercises.length}
        gymCount={gyms.length}
        exerciseView={
          <ExerciseLibraryView
            exercises={exercises}
            isCoach
            createExercise={createExercise}
            updateExercise={updateExercise}
            deleteExercise={deleteExercise}
            missingVideoTop={missingVideoTop}
          />
        }
        gymView={
          <GymsDirectoryView
            gyms={gyms}
            isCoach
            currentUserId={user.id}
            createGym={createGym}
            updateGym={updateGym}
            deleteGym={deleteGym}
            upsertGymReview={upsertGymReview}
            deleteGymReview={deleteGymReview}
            exerciseTypeCounts={exerciseTypeCounts}
          />
        }
      />
    </div>
  );
}
