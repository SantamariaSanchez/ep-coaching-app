import { redirect, notFound } from "next/navigation";
import { getUser, getProfile, getClientById } from "@/utils/auth";
import { getClientCheckins } from "@/utils/checkins";
import { getActiveProgram } from "@/utils/programs";
import { getActiveDietPlan } from "@/utils/nutrition";
import CheckinReview, { type ReviewProgram, type ReviewDiet } from "@/components/coach/CheckinReview";

// Check-in guidé : le coach lance son enregistrement (Loom, ScreenPal ou
// vocal), puis l'appli l'emmène écran par écran : vidéos d'exécution,
// photos comparées à la semaine d'avant, réponses, programme, diète, envoi.
export default async function CheckinReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; checkinId: string }>;
  searchParams: Promise<{ etape?: string }>;
}) {
  const [{ id, checkinId }, { etape }, user] = await Promise.all([params, searchParams, getUser()]);
  if (!user) redirect("/");

  const [profile, client, checkins, program, diet] = await Promise.all([
    getProfile(user.id),
    getClientById(id, user.id),
    getClientCheckins(id),
    getActiveProgram(id),
    getActiveDietPlan(id),
  ]);
  if (profile?.role === "client") redirect("/dashboard/client");
  if (!client) notFound();

  const index = checkins.findIndex((c) => c.id === checkinId);
  if (index === -1) notFound();
  const checkin = checkins[index];
  // Check-in précédent qui a des photos, pour la comparaison.
  const previous = checkins.slice(index + 1).find((c) => c.photo_urls.length > 0) ?? null;

  const reviewProgram: ReviewProgram | null = program
    ? {
        name: program.name,
        objective: program.objective ?? null,
        days: program.days.map((d) => ({
          label: d.day_label,
          exercises: d.exercises.map((e) => ({
            name: e.name,
            sets: e.sets,
            reps: e.reps,
            rir: e.rir,
            technique: e.technique ?? null,
          })),
        })),
      }
    : null;

  const reviewDiet: ReviewDiet | null = diet
    ? (() => {
        const main = diet.diet_plan_meals.filter((m) => (m.variant_group ?? 1) <= 1 && m.day_of_week == null);
        const meals = main.length ? main : diet.diet_plan_meals.filter((m) => (m.variant_group ?? 1) <= 1);
        const bySlot = new Map<string, { name: string; grams: number }[]>();
        let kcal = 0, p = 0, c = 0, f = 0;
        for (const m of meals) {
          const food = m.foods;
          if (!food) continue;
          const k = m.quantity_g / 100;
          kcal += food.calories_per_100 * k;
          p += food.proteins_per_100 * k;
          c += food.carbs_per_100 * k;
          f += food.fats_per_100 * k;
          const list = bySlot.get(m.meal_slot) ?? [];
          list.push({ name: food.name, grams: Math.round(m.quantity_g) });
          bySlot.set(m.meal_slot, list);
        }
        return {
          name: diet.name,
          totals: main.length ? { kcal: Math.round(kcal), p: Math.round(p), c: Math.round(c), f: Math.round(f) } : null,
          meals: Array.from(bySlot.entries()).map(([slot, foods]) => ({ slot, foods })),
        };
      })()
    : null;

  const initialStep = Math.max(0, Math.min(6, Number(etape) || 0));

  return (
    <CheckinReview
      clientId={id}
      clientName={client.full_name ?? "Client"}
      checkin={checkin}
      previous={previous}
      program={reviewProgram}
      diet={reviewDiet}
      initialStep={initialStep}
    />
  );
}
