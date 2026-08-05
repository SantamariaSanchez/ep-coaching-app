import { createAdminClient } from "@/lib/supabase-admin";

// Throttling des tentatives de connexion (voir la migration
// 20260805f_login_attempt_throttling.sql). Le compteur vit en base, pas en
// mémoire : Vercel exécute chaque requête dans une instance potentiellement
// différente, un compteur en RAM ne bloquerait rien.
//
// Le message renvoyé est toujours le même, qu'un compte existe ou non derrière
// l'email : impossible d'en déduire quoi que ce soit sur l'existence du compte.

function lockMessage(lockedUntil: string | null): string {
  const minutes = lockedUntil
    ? Math.max(1, Math.ceil((new Date(lockedUntil).getTime() - Date.now()) / 60000))
    : 15;
  return `Trop de tentatives de connexion. Réessaie dans ${minutes} minute${minutes > 1 ? "s" : ""}.`;
}

// À appeler AVANT de tenter la connexion. Renvoie le message à afficher si
// l'email est temporairement verrouillé, null sinon.
export async function getLoginLock(email: string): Promise<string | null> {
  if (!email?.trim()) return null;
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("check_login_lock", { p_email: email });
    if (error) return null; // en cas de souci en base, on ne bloque pas la connexion
    return data ? lockMessage(data as string) : null;
  } catch {
    return null;
  }
}

// À appeler après un échec d'identifiants. Renvoie le message de verrouillage
// si ce dernier échec a déclenché le blocage, null sinon.
export async function registerFailedLogin(email: string): Promise<string | null> {
  if (!email?.trim()) return null;
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("register_failed_login", { p_email: email });
    if (error) return null;
    return data ? lockMessage(data as string) : null;
  } catch {
    return null;
  }
}

// À appeler après une connexion réussie : remet le compteur à zéro.
export async function clearLoginAttempts(email: string): Promise<void> {
  if (!email?.trim()) return;
  try {
    const admin = createAdminClient();
    await admin.rpc("clear_login_attempts", { p_email: email });
  } catch {
    /* non bloquant */
  }
}
