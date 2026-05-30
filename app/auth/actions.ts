"use server"

import { createServerSupabase } from "@/lib/supabase-server"
import { redirect } from "next/navigation"

export async function loginAction(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  const supabase = await createServerSupabase()

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    redirect("/auth/login?error=invalid_credentials")
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login?error=no_user")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role === "coach") {
    redirect("/dashboard/coach")
  } else {
    redirect("/dashboard/client")
  }
}
