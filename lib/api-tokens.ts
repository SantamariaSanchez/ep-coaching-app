import { createHash, randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase-admin";

// Clés personnelles (connecteur Claude MCP, automatisations).
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function newToken(): string {
  return `epk_${randomBytes(24).toString("hex")}`;
}

/** Propriétaire d'une clé valide, et mise à jour de sa dernière utilisation. */
export async function ownerOfToken(token: string | null | undefined): Promise<string | null> {
  if (!token || !/^epk_[0-9a-f]{48}$/.test(token)) return null;
  const admin = createAdminClient();
  const { data } = await admin.from("api_tokens").select("id, owner_id").eq("token_hash", hashToken(token)).maybeSingle();
  if (!data) return null;
  await admin.from("api_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", data.id);
  return data.owner_id as string;
}
