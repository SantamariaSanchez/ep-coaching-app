"use client";

import { createClientSupabase } from "@/lib/supabase-client";

// Envoi de la vidéo d'une série vers le bucket privé set-videos, avec la
// progression (une vidéo de série pèse vite 20 à 80 Mo sur le wifi de la
// salle : sans pourcentage, on croit que l'appli a planté).
//
// Le chemin DOIT commencer par l'id de la personne : la policy de stockage
// (20260806c_fix_storage_public_exposure.sql) n'autorise l'envoi que dans
// son propre dossier. L'ancien chemin « {séance}/{série}… » était refusé, et
// filmer une série échouait à chaque fois.

const ALLOWED = ["video/mp4", "video/quicktime", "video/webm"];

/** Type accepté par le bucket (mp4, mov, webm), déduit de l'extension au besoin. */
export function normalizeVideoType(file: File): string {
  if (ALLOWED.includes(file.type)) return file.type;
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  if (ext === "mov" || ext === "qt") return "video/quicktime";
  if (ext === "webm") return "video/webm";
  return "video/mp4";
}

export function videoExtension(type: string): string {
  if (type === "video/quicktime") return "mov";
  if (type === "video/webm") return "webm";
  return "mp4";
}

export function isProbablyVideo(file: File): boolean {
  return file.type.startsWith("video/") || /\.(mp4|m4v|mov|qt|webm|3gp)$/i.test(file.name);
}

export async function uploadSetVideo(
  path: string,
  file: File,
  onProgress: (fraction: number) => void
): Promise<void> {
  const supabase = createClientSupabase();
  const type = normalizeVideoType(file);
  const body = type === file.type ? file : new File([file], file.name || `video.${videoExtension(type)}`, { type });

  const { data, error } = await supabase.storage.from("set-videos").createSignedUploadUrl(path);
  if (error || !data?.signedUrl) {
    // Repli : envoi classique, sans pourcentage.
    const { error: upError } = await supabase.storage
      .from("set-videos")
      .upload(path, body, { contentType: type, upsert: false });
    if (upError) throw upError;
    onProgress(1);
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", data.signedUrl);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && e.total > 0) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(xhr.status === 413 ? "Vidéo trop lourde." : `Envoi refusé (${xhr.status}).`));
    };
    xhr.onerror = () => reject(new Error("Connexion perdue pendant l'envoi."));
    xhr.ontimeout = () => reject(new Error("Envoi trop long, réessaie."));
    const form = new FormData();
    form.append("cacheControl", "3600");
    form.append("", body);
    xhr.send(form);
  });
  onProgress(1);
}
