import { NextRequest, NextResponse } from "next/server";
import { getUser, getProfile } from "@/utils/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { exchangeOuraCode } from "@/lib/oura";

export async function GET(req: NextRequest) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://ep-coaching.vercel.app";
  const user = await getUser();
  if (!user) return NextResponse.redirect(`${base}/`);

  const profile = await getProfile(user.id);
  const homePath = profile?.role === "coach" ? "/dashboard/coach/moi/tracking" : "/dashboard/client/tracking";

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const savedState = req.cookies.get("oura_oauth_state")?.value;

  if (!code || !state || !savedState || state !== savedState) {
    return NextResponse.redirect(`${base}${homePath}?oura=error`);
  }

  const tokens = await exchangeOuraCode(code);
  if (!tokens) {
    return NextResponse.redirect(`${base}${homePath}?oura=error`);
  }

  const admin = createAdminClient();
  const { error } = await admin.from("oura_connections").upsert({
    client_id: user.id,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
  });

  const res = NextResponse.redirect(`${base}${homePath}?oura=${error ? "error" : "connected"}`);
  res.cookies.delete("oura_oauth_state");
  return res;
}
