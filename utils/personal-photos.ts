import { createServerSupabase } from "@/lib/supabase-server";

export interface PersonalPhoto {
  id: string;
  client_id: string;
  taken_at: string;
  storage_path: string;
  notes: string | null;
  created_at: string;
  url: string | null;
}

export async function getPersonalPhotos(clientId: string): Promise<PersonalPhoto[]> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("personal_photos")
      .select("*")
      .eq("client_id", clientId)
      .order("taken_at", { ascending: false })
      .order("created_at", { ascending: false });

    const rows = (data as Omit<PersonalPhoto, "url">[]) ?? [];
    if (rows.length === 0) return [];

    const signed = await Promise.all(
      rows.map((r) =>
        supabase.storage.from("progress-photos").createSignedUrl(r.storage_path, 3600)
      )
    );

    return rows.map((r, i) => ({ ...r, url: signed[i].data?.signedUrl ?? null }));
  } catch {
    return [];
  }
}
