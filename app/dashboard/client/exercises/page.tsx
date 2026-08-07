import { redirect } from "next/navigation";
import { getUser, getProfile, isSubscribed } from "@/utils/auth";
import { getExerciseLibrary } from "@/utils/exercise-library";
import { getGymsWithReviews } from "@/utils/gyms";
import { getClientIntake } from "@/utils/client-intake";
import { getTotalPoints } from "@/lib/gamification";
import { getEquipmentType, type EquipmentType } from "@/lib/exercise-library-content";
import ExerciseLibraryView from "@/components/ui/ExerciseLibraryView";
import GymsDirectoryView from "@/components/ui/GymsDirectoryView";
import LibraryHub from "@/components/ui/LibraryHub";
import { createExercise, updateExercise, deleteExercise } from "./actions";
import { createGym, updateGym, deleteGym, upsertGymReview, deleteGymReview, setMyGym } from "../gyms/actions";
import { Dumbbell } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ClientExercisesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "coach") redirect("/dashboard/coach/exercises");

  const { tab } = await searchParams;

  const [exercises, points, gyms, intake] = await Promise.all([
    getExerciseLibrary(),
    getTotalPoints(user.id),
    getGymsWithReviews(),
    getClientIntake(user.id),
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
        <p className="mt-1 text-sm text-[#F5EDED]/40">
          Exercices et salles de musculation, dans un seul endroit — le matériel d&apos;une salle détermine ce
          qui y est réalisable.
        </p>
      </div>

      <LibraryHub
        initialTab={tab === "gyms" ? "gyms" : "exercises"}
        exerciseCount={exercises.length}
        gymCount={gyms.length}
        exerciseView={
          <ExerciseLibraryView
            exercises={exercises}
            isCoach={false}
            points={points}
            isSubscribed={isSubscribed(profile)}
            createExercise={createExercise}
            updateExercise={updateExercise}
            deleteExercise={deleteExercise}
          />
        }
        gymView={
          <GymsDirectoryView
            gyms={gyms}
            isCoach={false}
            currentUserId={user.id}
            createGym={createGym}
            updateGym={updateGym}
            deleteGym={deleteGym}
            upsertGymReview={upsertGymReview}
            deleteGymReview={deleteGymReview}
            exerciseTypeCounts={exerciseTypeCounts}
            myGymName={intake?.gym_name}
            onSetMyGym={async (gymName, gymWebsite) => { await setMyGym(user.id, gymName, gymWebsite); }}
          />
        }
      />
    </div>
  );
}
