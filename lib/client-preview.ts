import "server-only";
import { getUser, getProfile, PROFILE_FIELDS, type Profile } from "@/utils/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import type { Db } from "@/lib/db-types";

// Aperçu « Voir comme mon client » (demande d'une coach, 2026-10-20) :
// montrer au coach l'appli telle que SON client la voit, en lecture seule.
//
// Pas d'usurpation de session : le coach reste connecté en tant que lui-même,
// la page lit les données du client côté serveur et les affiche avec les
// mêmes composants que l'espace client, rendus inertes. Contrôle d'accès
// strict, vérifié à chaque affichage : seul le coach attitré du client
// (profiles.coach_id) ou le fondateur (is_platform_owner) y a accès. Tout le
// reste (autre coach, client, visiteur, identifiant invalide) reçoit null et
// la page répond 404, sans rien révéler de l'existence du compte.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ClientPreviewAccess {
  viewer: Profile;
  client: Profile;
  /** Client admin, réservé aux lectures des données de CE client. */
  db: Db;
}

export async function getClientPreviewAccess(clientId: string): Promise<ClientPreviewAccess | null> {
  if (!UUID_RE.test(clientId)) return null;
  const user = await getUser();
  if (!user) return null;
  const viewer = await getProfile(user.id);
  if (!viewer || viewer.role !== "coach") return null;
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("profiles").select(PROFILE_FIELDS).eq("id", clientId).maybeSingle();
    const client = (data as Profile | null) ?? null;
    if (!client || client.role !== "client") return null;
    const allowed = client.coach_id === user.id || viewer.is_platform_owner === true;
    if (!allowed) return null;
    return { viewer, client, db: admin };
  } catch {
    return null;
  }
}
