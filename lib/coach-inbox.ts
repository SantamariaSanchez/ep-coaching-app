import { createAdminClient } from "@/lib/supabase-admin";

export type InboxItemType = "checkin" | "correction" | "photo";

export interface InboxItem {
  id: string;
  type: InboxItemType;
  clientId: string;
  clientName: string;
  createdAt: string;
  detail: string;
  href: string;
}

interface RowWithProfile {
  id: string;
  client_id: string;
  created_at: string;
  profiles: { full_name: string | null; coach_id: string | null } | null;
}

// Boîte de réception coach unique (item 8) : tout ce qui attend une réponse
// (bilans, corrections technique, photos de suivi), tous types confondus,
// trié du plus ancien en attente au plus récent.
//
// Reconstruit ses propres requêtes plutôt que de réutiliser telles quelles
// getPendingReplies/getPendingCorrectionsWithClient/getPendingPhotoUpdates
// (utils/checkins.ts, utils/corrections.ts, utils/photos.ts) : ces
// fonctions s'appuient sur le client de session + la RLS pour scoper "mes
// clients", sans filtre explicite sur coach_id dans la requête elle-même.
// Pas un problème avec un seul coach en prod aujourd'hui, mais ça
// deviendrait une fuite inter-coachs dès qu'un deuxième coach existerait
// (voir PROGRESS.md > Signalements). Ici, le filtre coach_id est explicite
// et fait côté application, pas délégué à la RLS.
export async function getCoachInbox(coachId: string): Promise<InboxItem[]> {
  const admin = createAdminClient();

  const [{ data: checkins }, { data: corrections }, { data: photos }] = await Promise.all([
    admin
      .from("check_ins")
      .select("id, client_id, created_at, profiles:client_id(full_name, coach_id)")
      .is("coach_replied_at", null)
      .order("created_at", { ascending: false })
      .limit(30),
    admin
      .from("exercise_corrections")
      .select("id, client_id, created_at, exercise_name, profiles:client_id(full_name, coach_id)")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(30),
    admin
      .from("photo_updates")
      .select("id, client_id, created_at, profiles:client_id(full_name, coach_id)")
      .is("coach_replied_at", null)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const mine = (row: RowWithProfile) => row.profiles?.coach_id === coachId;

  const items: InboxItem[] = [
    ...(((checkins ?? []) as unknown as RowWithProfile[]).filter(mine).map((c) => ({
      id: c.id,
      type: "checkin" as const,
      clientId: c.client_id,
      clientName: c.profiles?.full_name ?? "Client",
      createdAt: c.created_at,
      detail: "Bilan hebdomadaire",
      href: `/dashboard/coach/clients/${c.client_id}`,
    }))),
    ...(((corrections ?? []) as unknown as (RowWithProfile & { exercise_name: string })[]).filter(mine).map((c) => ({
      id: c.id,
      type: "correction" as const,
      clientId: c.client_id,
      clientName: c.profiles?.full_name ?? "Client",
      createdAt: c.created_at,
      detail: `Correction : ${c.exercise_name}`,
      href: `/dashboard/coach/clients/${c.client_id}`,
    }))),
    ...(((photos ?? []) as unknown as RowWithProfile[]).filter(mine).map((p) => ({
      id: p.id,
      type: "photo" as const,
      clientId: p.client_id,
      clientName: p.profiles?.full_name ?? "Client",
      createdAt: p.created_at,
      detail: "Photo de suivi",
      href: `/dashboard/coach/clients/${p.client_id}`,
    }))),
  ];

  // Le plus ancien en attente en premier — c'est celui qui traîne depuis
  // le plus longtemps qui mérite l'attention en priorité, pas le dernier arrivé.
  return items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
