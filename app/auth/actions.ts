"use server"

import { createServerSupabase } from "@/lib/supabase-server"
import { createAdminClient } from "@/lib/supabase-admin"
import { redirect } from "next/navigation"

export async function loginAction(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  const supabase = await createServerSupabase()

  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    console.error("Login error:", error.message)
    redirect("/")
  }

  const userId = authData.user?.id
  if (!userId) {
    redirect("/")
  }

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
