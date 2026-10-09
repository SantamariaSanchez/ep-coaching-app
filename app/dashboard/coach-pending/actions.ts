"use server";

import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { notifyAdmin } from "@/lib/admin-notify";
import { escapeHtml } from "@/lib/sanitize";

// Passe un coach en attente de paiement sur le programme « Coach testeur »
// (gratuit, clients illimités, en échange de retours). Voir COACH_TESTER_PLAN.
export async function activateTesterPlan() {
  const user = await getUser();
  if (!user) redirect("/auth/coach");
  const profile = await getProfile(user.id);
  if (!profile || profile.role !== "coach") redirect("/auth/coach");

  const admin = createAdminClient();
  await admin.from("profiles").update({ platform_subscription_status: "active" }).eq("id", user.id);
  notifyAdmin("Nouveau coach testeur (gratuit)", [
    `<strong>${escapeHtml(profile.full_name ?? "")}</strong> (${escapeHtml(profile.email ?? "")})`,
  ]).catch(() => {});
  redirect("/dashboard/coach");
}
