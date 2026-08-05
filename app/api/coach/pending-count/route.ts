import { NextResponse } from "next/server";
import { requireCoach } from "@/lib/auth-guards";
import { getPendingBilansCount } from "@/utils/checkins";
import { getPendingCorrectionsCount } from "@/utils/corrections";
import { getPendingPhotoUpdatesCount } from "@/utils/photos";

export async function GET() {
  const guard = await requireCoach();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: 403 });

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
