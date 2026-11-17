// Retire d'un objet venu du navigateur les colonnes qui désignent le
// propriétaire ou l'identité d'une ligne. Une server action reçoit ce que la
// requête envoie, pas ce que dit le type TypeScript : étaler l'objet brut
// dans un insert/update laissait une requête forgée choisir son client_id
// (écrire dans le compte de quelqu'un d'autre) ou son id.

const PROTECTED_KEYS = new Set([
  "id",
  "client_id",
  "coach_id",
  "owner_id",
  "user_id",
  "author_id",
  "created_by",
  "created_at",
]);

export function stripProtected<T extends object>(input: T): Omit<T, "id" | "client_id" | "coach_id" | "owner_id" | "user_id" | "author_id" | "created_by" | "created_at"> {
  const out: Record<string, unknown> = {};
  if (!input || typeof input !== "object") return out as never;
  for (const [k, v] of Object.entries(input)) {
    if (!PROTECTED_KEYS.has(k)) out[k] = v;
  }
  return out as never;
}
