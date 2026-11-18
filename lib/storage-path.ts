// Chemin de stockage envoyé par un formulaire (photos, vidéos) : accepté
// seulement s'il est dans le dossier de la personne (« <son id>/… »). Les
// enregistrements passent par le client admin (sans RLS) : sans ce contrôle,
// un chemin vers le dossier d'une autre cliente du même coach faisait
// afficher ses photos privées au coach.
export function ownStoragePath(v: unknown, userId: string): string | null {
  const p = typeof v === "string" ? v.trim() : "";
  if (!p || p.length > 300 || p.includes("..") || !userId) return null;
  return p.startsWith(`${userId}/`) ? p : null;
}
