"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Trash2, Lock, Loader2 } from "lucide-react";
import type { PersonalPhoto } from "@/utils/personal-photos";
import PhotoCompareSlider from "@/components/ui/PhotoCompareSlider";

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(dateStr + "T12:00:00"));
}

function formatDateShort(dateStr: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(
    new Date(dateStr + "T12:00:00")
  );
}

interface Props {
  photos: PersonalPhoto[];
  uploadPersonalPhoto: (formData: FormData) => Promise<{ error?: string }>;
  deletePersonalPhoto: (id: string, storagePath: string) => Promise<{ error?: string }>;
}

export default function PersonalPhotosView({
  photos: initialPhotos,
  uploadPersonalPhoto,
  deletePersonalPhoto,
}: Props) {
  const router = useRouter();
  const [photos, setPhotos] = useState(initialPhotos);
  const [notes, setNotes] = useState("");
  // MASTERCLASS.md Axe E : resynchronise depuis le serveur quand initialPhotos
  // change (même piège que todayLogs dans ClientNutritionView — useState ne
  // reprend jamais un nouveau prop après le premier rendu). Déjà en place
  // avant cet axe pour couvrir le router.refresh() après upload ; gardé tel
  // quel, un seul effet suffit.
  useEffect(() => setPhotos(initialPhotos), [initialPhotos]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Comparaison avant/après (même composant que ClientPhotosView, item 35) —
  // demande explicite du 2026-08-15 : "les photos ça sert à rien, y'aura
  // pas de retour" pour qui n'a personne à qui les envoyer (membres
  // gratuits, mais aussi un coach qui suit ses propres photos sans avoir
  // lui-même de coach). La vraie valeur d'un suivi photo solo n'est pas
  // l'envoi, c'est de pouvoir comparer sa propre progression dans le temps.
  const sortedByDate = [...photos].sort((a, b) => a.taken_at.localeCompare(b.taken_at));
  const oldestWithUrl = sortedByDate.find((p) => p.url);
  const newestWithUrl = [...sortedByDate].reverse().find((p) => p.url);
  const showCompare =
    !!oldestWithUrl && !!newestWithUrl && oldestWithUrl.id !== newestWithUrl.id;

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    const fd = new FormData();
    fd.set("photo", file);
    fd.set("notes", notes.trim());
    const result = await uploadPersonalPhoto(fd);
    setUploading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setNotes("");
    // Optimistic update isn't practical without the signed URL, donc on
    // rafraîchit les données serveur pour récupérer la nouvelle photo avec
    // son URL signée, sans le flash blanc d'un rechargement complet.
    router.refresh();
  }

  async function handleDelete(photo: PersonalPhoto) {
    if (!confirm("Supprimer cette photo ?")) return;
    setDeletingId(photo.id);
    const result = await deletePersonalPhoto(photo.id, photo.storage_path);
    setDeletingId(null);
    if (!result.error) {
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    }
  }

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto pb-24 md:pb-8 page-transition">
      {/* Header */}
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Suivi
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">Photos</h1>
      </div>

      <div className="flex items-start gap-2.5 bg-[#1f0101] border border-[#890404]/20 rounded-xl px-4 py-3 mb-6">
        <Lock size={14} className="text-[#F5EDED]/30 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-[#F5EDED]/40 leading-relaxed">
          Ces photos restent privées. Elles ne servent qu&apos;à toi, pour
          suivre ta progression physique dans le temps.
        </p>
      </div>

      {/* Upload */}
      <div className="bg-[#1f0101] border border-[#890404]/40 rounded-xl p-5 mb-8 space-y-3">
        <p className="text-sm font-black uppercase tracking-tight">
          Ajouter une photo
        </p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Note (facultatif) : poids du jour, ressenti..." aria-label="Note (facultatif) : poids du jour, ressenti..."
          rows={2}
          className="w-full bg-[#150000] border border-[#890404]/30 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-[#F5EDED]/25 focus:outline-none focus:border-[#E01E1E]/50 resize-none"
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full flex items-center justify-center gap-2 py-3 text-xs font-black uppercase tracking-widest bg-[#E01E1E] hover:bg-[#B00202] disabled:opacity-50 text-white rounded-xl transition-colors"
        >
          {uploading ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Envoi...
            </>
          ) : (
            <>
              <Camera size={14} /> Prendre ou choisir une photo
            </>
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          aria-label="Prendre ou choisir une photo"
          className="hidden"
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
      </div>

      {/* Comparaison avant/après */}
      {showCompare && oldestWithUrl && newestWithUrl && (
        <section className="mb-8">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
            Progression
          </p>
          <h2 className="text-xl font-black uppercase tracking-tight mb-3">
            Avant / Après
          </h2>
          <PhotoCompareSlider
            beforeUrl={oldestWithUrl.url as string}
            afterUrl={newestWithUrl.url as string}
            beforeLabel={formatDateShort(oldestWithUrl.taken_at)}
            afterLabel={formatDateShort(newestWithUrl.taken_at)}
          />
        </section>
      )}

      {/* Gallery */}
      {photos.length > 0 ? (
        <section>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-3">
            Historique
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="relative bg-[#1f0101] border border-[#890404]/20 rounded-xl overflow-hidden group"
              >
                {photo.url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photo.url}
                    alt={formatDate(photo.taken_at)}
                    className="w-full aspect-[3/4] object-cover"
                  />
                )}
                <div className="p-2">
                  <p className="text-[9px] font-bold text-[#F5EDED]/50">
                    {formatDate(photo.taken_at)}
                  </p>
                  {photo.notes && (
                    <p className="text-[9px] text-[#F5EDED]/30 truncate mt-0.5">{photo.notes}</p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(photo)}
                  disabled={deletingId === photo.id}
                  className="absolute top-1.5 right-1.5 p-1.5 rounded-lg bg-black/60 text-white/70 hover:text-red-400 transition-colors"
                  title="Supprimer" aria-label="Supprimer"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <p className="text-xs text-[#F5EDED]/25 italic text-center py-10">
          Aucune photo pour le moment. Ajoute la première ci-dessus.
        </p>
      )}
    </div>
  );
}
