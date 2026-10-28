import { createAdminClient } from "@/lib/supabase-admin";
import { sanitizeEquipment, type GymKind } from "@/lib/gym-equipment";

// Salles d'entraînement d'un client (migration 20261029_training_gyms). Tout
// dégrade proprement tant que la migration n'est pas passée : liste vide.

export interface GymPhoto {
  id: string;
  url: string;
  equipment: string[];
}

export interface TrainingGym {
  id: string;
  owner_id: string;
  name: string;
  city: string | null;
  address: string | null;
  kind: GymKind;
  equipment: string[];
  notes: string | null;
  photos: GymPhoto[];
}

interface GymRow {
  id: string;
  owner_id: string;
  name: string;
  city: string | null;
  address: string | null;
  kind: GymKind | null;
  equipment: string[] | null;
  notes: string | null;
}

export async function getTrainingGyms(ownerId: string): Promise<TrainingGym[]> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.from("training_gyms").select("id, owner_id, name, city, address, kind, equipment, notes").eq("owner_id", ownerId).order("created_at");
    if (error || !data) return [];
    const rows = data as GymRow[];
    if (rows.length === 0) return [];
    const { data: photos } = await admin.from("training_gym_photos").select("id, gym_id, url, equipment").in("gym_id", rows.map((r) => r.id)).order("created_at");
    const byGym = new Map<string, GymPhoto[]>();
    for (const p of (photos as { id: string; gym_id: string; url: string; equipment: string[] | null }[]) ?? []) {
      byGym.set(p.gym_id, [...(byGym.get(p.gym_id) ?? []), { id: p.id, url: p.url, equipment: sanitizeEquipment(p.equipment) }]);
    }
    return rows.map((r) => ({
      id: r.id,
      owner_id: r.owner_id,
      name: r.name,
      city: r.city,
      address: r.address,
      kind: r.kind ?? "custom",
      equipment: sanitizeEquipment(r.equipment),
      notes: r.notes,
      photos: byGym.get(r.id) ?? [],
    }));
  } catch {
    return [];
  }
}
