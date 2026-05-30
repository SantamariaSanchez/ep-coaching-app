import { NextResponse } from "next/server";
import { getPendingBilansCount } from "@/utils/checkins";
import { getPendingCorrectionsCount } from "@/utils/corrections";
import { getPendingPhotoUpdatesCount } from "@/utils/photos";

export async function GET() {
  const [bilans, corrections, photos] = await Promise.all([
    getPendingBilansCount(),
    getPendingCorrectionsCount(),
    getPendingPhotoUpdatesCount(),
  ]);
  return NextResponse.json({ count: bilans + corrections + photos });
}
