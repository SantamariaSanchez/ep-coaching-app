"use server"

import { createServerSupabase } from "@/lib/supabase-server"
import { createAdminClient } from "@/lib/supabase-admin"
import { getLoginLock, registerFailedLogin, clearLoginAttempts } from "@/lib/login-throttle"
import { redirect } from "next/navigation"

// Server action de connexion héritée, conservée pour compatibilité. Les écrans
// réels utilisent loginClient / loginCoach. Elle reste un point d'entrée
// d'authentification exposé : elle applique donc le même throttling.
export async function loginAction(formData: FormData) {
  const email = (formData.get("email") as string)?.trim() ?? ""
  const password = formData.get("password") as string

  if (await getLoginLock(email)) {
    redirect("/")
  }

  const supabase = await createServerSupabase()

  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    await registerFailedLogin(email)
    redirect("/")
  }

  const userId = authData.user?.id
  if (!userId) {
    await registerFailedLogin(email)
    redirect("/")
  }

  await clearLoginAttempts(email)

  // Use admin client to read role — bypasses RLS so it always works
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single()

  if (profile?.role === "coach") {
    redirect("/dashboard/coach")
  } else {
    redirect("/dashboard/client")
  }
}
