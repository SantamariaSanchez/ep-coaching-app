import { createBrowserClient } from "@supabase/ssr";
import { AUTH_COOKIE_OPTIONS } from "@/lib/auth-cookies";

// Le client navigateur écrit lui aussi le cookie de session (rafraîchissement
// automatique du jeton). On lui impose les mêmes options que côté serveur :
// `secure` en production et `sameSite: lax`, au lieu des défauts de
// @supabase/ssr qui n'ont ni l'un ni l'autre. Voir lib/auth-cookies.ts pour le
// détail du compromis sur httpOnly.
export function createClientSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookieOptions: AUTH_COOKIE_OPTIONS }
  );
}
