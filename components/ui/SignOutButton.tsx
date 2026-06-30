"use client";

import { createClientSupabase } from "@/lib/supabase-client";
import { useRouter } from "next/navigation";

export default function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClientSupabase();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      className="text-xs font-semibold uppercase tracking-widest text-[#F5EDED]/60 hover:text-[#E01E1E] transition-colors cursor-pointer"
    >
      Déconnexion
    </button>
  );
}
