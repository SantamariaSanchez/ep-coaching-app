import { redirect } from "next/navigation";

export default async function CoachClientMeasurementsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/dashboard/coach/clients/${id}`);
}
