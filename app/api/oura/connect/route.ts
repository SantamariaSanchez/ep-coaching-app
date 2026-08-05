import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guards";
import { getProfile, isSubscribed } from "@/utils/auth";
import { getOuraAuthUrl, isOuraConfigured } from "@/lib/oura";

export async function GET() {
  const guard = await requireAuth();
  if (!guard.ok) return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_APP_URL ?? "https://ep-coaching.vercel.app"));

  const profile = await getProfile(guard.userId);
  const homePath = profile?.role === "coach" ? "/dashboard/coach/moi/tracking" : "/dashboard/client/tracking";
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://ep-coaching.vercel.app";

  // Un membre gratuit ne peut pas connecter sa bague — elle ne lui a pas été
  // offerte. On ne bloque que côté client : le coach a toujours le droit
  // de connecter la sienne pour son propre suivi (voir moi/tracking).
  if (profile?.role === "client" && !isSubscribed(profile)) {
    return NextResponse.redirect(`${base}${homePath}?oura=locked`);
  }

  if (!isOuraConfigured()) {
    return NextResponse.redirect(`${base}${homePath}?oura=not_configured`);
  }

  const state = crypto.randomUUID();
  const res = NextResponse.redirect(getOuraAuthUrl(state));
  res.cookies.set("oura_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return res;
}
