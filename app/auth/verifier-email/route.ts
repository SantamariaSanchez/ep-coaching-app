import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

// Atterrissage du lien de confirmation envoyé par email (voir
// lib/email-verification.ts). Le jeton est à usage unique et expire côté
// Supabase : le consommer prouve que la personne a bien accès à la boîte mail.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");

  if (!tokenHash) {
    return NextResponse.redirect(`${origin}/dashboard/client?email=invalide`);
  }

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: tokenHash,
  });

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/auth/client?mode=login&email=expire`);
  }

  // email_verified_at fait partie des colonnes protégées par le trigger
  // protect_profile_privileged_columns : seule la service_role peut l'écrire.
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .update({ email_verified_at: new Date().toISOString() })
    .eq("id", data.user.id)
    .select("role")
    .maybeSingle();

  // Une recrue peut aussi avoir un compte membre existant (role "client") :
  // c'est l'existence d'un accès équipe qui décide de la destination.
  const { data: staff } = await admin
    .from("staff_members")
    .select("user_id")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (staff || profile?.role === "staff") {
    return NextResponse.redirect(`${origin}/equipe/contrat`);
  }

  const dest = profile?.role === "coach" ? "/dashboard/coach" : "/dashboard/client";
  return NextResponse.redirect(`${origin}${dest}?email=confirme`);
}
