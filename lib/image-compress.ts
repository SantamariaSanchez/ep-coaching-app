"use client";

// Compresse une photo côté client avant upload — une photo de téléphone
// pèse souvent 3 à 10 Mo en sortie d'appareil, largement au-dessus de ce
// qui est raisonnable pour un formulaire (voir next.config.ts pour le
// contexte du bug d'onboarding que ça a causé). Redimensionne au passage
// (les photos de suivi n'ont jamais besoin de la pleine résolution capteur),
// ce qui réduit aussi le stockage Supabase et accélère l'upload sur
// connexion mobile.
//
// Best-effort : si la compression échoue pour une raison quelconque (format
// non supporté par createImageBitmap, navigateur ancien...), on renvoie le
// fichier original tel quel plutôt que de bloquer l'utilisateur.

const DEFAULT_MAX_DIMENSION = 1600;
const DEFAULT_QUALITY = 0.82;
// En dessous de ce seuil, la photo est déjà raisonnable : pas la peine de la
// ré-encoder (perte de qualité inutile pour un gain de poids négligeable).
const SKIP_BELOW_BYTES = 400 * 1024;

export async function compressImage(
  file: File,
  options?: { maxDimension?: number; quality?: number }
): Promise<File> {
  if (!file.type.startsWith("image/") || file.size <= SKIP_BELOW_BYTES) return file;
  if (typeof createImageBitmap !== "function") return file;

  const maxDimension = options?.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const quality = options?.quality ?? DEFAULT_QUALITY;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob || blob.size >= file.size) return file; // le compressé est plus gros, autant garder l'original

    const newName = file.name.replace(/\.\w+$/, "") + ".jpg";
    return new File([blob], newName, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file;
  }
}
