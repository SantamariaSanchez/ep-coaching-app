import { NextResponse } from "next/server";
import { getUser, getProfile } from "@/utils/auth";
import { getPendingBilansCount } from "@/utils/checkins";
import { getPendingCorrectionsCount } from "@/utils/corrections";
import { getPendingPhotoUpdatesCount } from "@/utils/photos";

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await getProfile(user.id);
  if (profile?.role !== "coach") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Ces 3 fonctions passent par le client de session (pas admin) : la RLS
  // de chaque table filtre déjà par client_id = auth.uid() ou
  // is_own_coach(client_id), donc les compteurs sont automatiquement
  // cloisonnés au coach connecté.
  const [bilans, corrections, photos] = await Promise.all([
    getPendingBilansCount(),
    getPendingCorrectionsCount(),
    getPendingPhotoUpdatesCount(),
  ]);
  return NextResponse.json({ count: bilans + corrections + photos });
}
