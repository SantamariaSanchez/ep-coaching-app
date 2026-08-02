"use client";

import { useActionState, useRef, useState } from "react";
import { Camera, Video, CheckCircle2, Clock, ExternalLink, AlertCircle, X, Loader2, Sparkles } from "lucide-react";
import { POSING_CATEGORIES, CATEGORIES_BY_GENDER, TYPE_LABELS, type SubmissionType } from "@/lib/posing-data";
import { createClientSupabase } from "@/lib/supabase-client";
import type { Profile } from "@/utils/auth";
import type { PhotoUpdate } from "@/utils/photos";

const MAX_PHOTOS = 4;

interface MediaItem {
  localId: string;
  previewUrl: string;
  path: string | null;
  uploading: boolean;
  error: boolean;
}

// Upload immédiat vers Supabase Storage dès la sélection — même logique que
// CheckinForm : le formulaire n'envoie ensuite que les chemins déjà
// uploadés, jamais les fichiers eux-mêmes (payload trop lourd pour une
// action serveur Next.js).
async function uploadFile(file: File): Promise<string | null> {
  try {
    const supabase = createClientSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const ext = file.name.split(".").pop() || (file.type.startsWith("video") ? "mp4" : "jpg");
    // Préfixé par l'id du client : la policy RLS du bucket restreint la
    // lecture à ce dossier (client + son coach), jamais à tout le monde.
    const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage
      .from("photo-updates-media")
      .upload(path, file, { contentType: file.type || undefined, upsert: false });
    if (error) return null;
    return path;
  } catch {
    return null;
  }
}

const inputCls =
  "w-full bg-[#150000] border border-[#890404]/30 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#F5EDED]/25 focus:outline-none focus:border-[#E01E1E]/60 transition-colors";

// "video_perf" (vidéo d'exercice/perf) retiré — hors-sujet ici, un exercice
// filmé n'a rien à faire dans le suivi physique/posing ; le retour vidéo
// d'exécution se fait déjà côté messagerie coach (retour type Loom).
const TYPES: { key: SubmissionType; label: string; icon: React.ElementType; desc: string }[] = [
  { key: "mandatory_poses", label: "Poses Obligatoires", icon: Camera, desc: "Photos des poses imposées par ta catégorie" },
  { key: "posing_routine", label: "Routine Posing", icon: Video, desc: "Vidéo de ta routine complète" },
];

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(dateStr + "T12:00:00"));
}

// ── Self-service category picker (coach only) ─────────────────────────────────
// Pour un vrai client, la catégorie est configurée par le coach ailleurs
// (fiche client). Le coach n'a personne au-dessus de lui pour la configurer
// à sa place quand il utilise cette même vue pour son propre suivi — il doit
// pouvoir la choisir lui-même directement ici.

function SelfCategoryPicker({
  coachId,
  save,
}: {
  coachId: string;
  save: (clientId: string, _prev: { error?: string; success?: boolean } | null, formData: FormData) => Promise<{ error?: string; success?: boolean } | null>;
}) {
  const bound = save.bind(null, coachId);
  const [state, action, isPending] = useActionState(bound, null);

  return (
    <form action={action} className="flex items-center gap-2 mt-2">
      <select
        name="competition_category"
        defaultValue=""
        className="flex-1 bg-[#150000] border border-amber-500/30 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/60"
      >
        <option value="">Choisis ta catégorie</option>
        <optgroup label="Femmes">
          {CATEGORIES_BY_GENDER.femme.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </optgroup>
        <optgroup label="Hommes">
          {CATEGORIES_BY_GENDER.homme.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </optgroup>
      </select>
      <button
        type="submit"
        disabled={isPending}
        className="bg-amber-500/15 hover:bg-amber-500/25 disabled:opacity-50 border border-amber-500/40 text-amber-400 text-[10px] font-bold uppercase tracking-widest px-3 py-2 rounded-lg transition-colors flex-shrink-0"
      >
        {isPending ? "…" : state?.success ? "✓ Validé" : "Valider"}
      </button>
      {state?.error && <p className="text-[10px] text-red-400">{state.error}</p>}
      {state?.success && <p className="text-[10px] text-green-400">Catégorie enregistrée.</p>}
    </form>
  );
}

// ── Submission form ──────────────────────────────────────────────────────────

function SubmissionForm({
  profile,
  onSubmit,
  isSelfTracking,
  saveCompetitionSettings,
}: {
  profile: Profile;
  onSubmit: (formData: FormData) => Promise<{ error?: string; success?: boolean }>;
  isSelfTracking: boolean;
  saveCompetitionSettings?: (clientId: string, _prev: { error?: string; success?: boolean } | null, formData: FormData) => Promise<{ error?: string; success?: boolean } | null>;
}) {
  const [type, setType] = useState<SubmissionType>("mandatory_poses");
  const [photos, setPhotos] = useState<MediaItem[]>([]);
  const [video, setVideo] = useState<MediaItem | null>(null);
  const [notes, setNotes] = useState("");
  const [duration, setDuration] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Ne JAMAIS retomber silencieusement sur une catégorie par défaut (c'était
  // le cas avant : "Classic Physique", une catégorie homme, s'affichait à
  // n'importe quel client sans catégorie configurée — y compris les
  // femmes). Sans catégorie reconnue, on affiche clairement qu'il faut la
  // configurer plutôt que d'inventer une réponse.
  const category = profile?.competition_category ?? null;
  const posingData = category ? POSING_CATEGORIES[category] ?? null : null;

  const mediaUploading = photos.some((p) => p.uploading) || !!video?.uploading;

  async function handlePhotosSelected(files: FileList) {
    const room = MAX_PHOTOS - photos.length;
    const toAdd = Array.from(files).slice(0, Math.max(room, 0));
    const items: MediaItem[] = toAdd.map((file) => ({
      localId: Math.random().toString(36).slice(2),
      previewUrl: URL.createObjectURL(file),
      path: null,
      uploading: true,
      error: false,
    }));
    setPhotos((prev) => [...prev, ...items]);
    toAdd.forEach(async (file, i) => {
      const path = await uploadFile(file);
      setPhotos((prev) =>
        prev.map((p) => (p.localId === items[i].localId ? { ...p, path, uploading: false, error: !path } : p))
      );
    });
  }

  async function handleVideoSelected(file: File) {
    const item: MediaItem = {
      localId: Math.random().toString(36).slice(2),
      previewUrl: URL.createObjectURL(file),
      path: null,
      uploading: true,
      error: false,
    };
    setVideo(item);
    const path = await uploadFile(file);
    setVideo((prev) => (prev && prev.localId === item.localId ? { ...prev, path, uploading: false, error: !path } : prev));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (type === "mandatory_poses" && photos.filter((p) => p.path).length === 0) {
      setError("Au moins une photo requise.");
      return;
    }
    if (type !== "mandatory_poses" && !video?.path) {
      setError("Vidéo requise.");
      return;
    }
    setSubmitting(true);
    setError(null);

    const fd = new FormData();
    fd.set("type", type);
    photos.forEach((p) => { if (p.path) fd.append("photo_paths", p.path); });
    if (video?.path) fd.set("video_path", video.path);
    fd.set("notes", notes.trim());

    const result = await onSubmit(fd);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <CheckCircle2 size={40} className="text-green-400" strokeWidth={1.5} />
        <p className="text-sm font-black text-white uppercase tracking-wider">
          {isSelfTracking ? "Ajoutée à ton historique !" : "Mise à jour envoyée !"}
        </p>
        <p className="text-xs text-[#F5EDED]/35">
          {isSelfTracking ? "Retrouve-la dans ton suivi ci-dessous." : "Ton coach recevra une notification."}
        </p>
        <button
          onClick={() => { setSuccess(false); setPhotos([]); setVideo(null); setNotes(""); }}
          className="text-xs text-[#E01E1E] hover:underline mt-2"
        >
          Envoyer une autre update
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Type selector */}
      <div className="grid grid-cols-2 gap-2">
        {TYPES.map(({ key, label, icon: Icon, desc }) => (
          <button
            key={key}
            type="button"
            onClick={() => setType(key)}
            className={`flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border transition-all text-center ${
              type === key
                ? "bg-[#E01E1E]/12 border-[#E01E1E]/40 text-[#E01E1E]"
                : "bg-[#1f0101] border-[#890404]/20 text-[#F5EDED]/35 hover:border-[#890404]/50"
            }`}
          >
            <Icon size={18} strokeWidth={type === key ? 2.5 : 1.8} />
            <span className="text-[9px] font-black uppercase tracking-widest leading-tight">{label}</span>
            <span className="text-[8px] text-[#F5EDED]/30 leading-tight hidden sm:block">{desc}</span>
          </button>
        ))}
      </div>

      {/* Type-specific content */}
      {type === "mandatory_poses" && posingData && (
        <div className="bg-[#1f0101] border border-[#890404]/20 rounded-xl p-4">
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-3">
            Poses obligatoires : {category}
          </p>
          <div className="space-y-1.5">
            {posingData.mandatory_poses.map((pose, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border border-[#890404]/30 bg-[#890404]/10 flex-shrink-0 flex items-center justify-center">
                  <span className="text-[8px] text-[#F5EDED]/40">{i + 1}</span>
                </div>
                <span className="text-xs text-[#F5EDED]/70">{pose}</span>
              </div>
            ))}
          </div>
          {posingData.notes && (
            <p className="mt-3 text-[10px] text-[#F5EDED]/30 italic border-t border-[#890404]/15 pt-2">
              {posingData.notes}
            </p>
          )}
        </div>
      )}

      {!posingData && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
          <div className="flex items-center gap-2">
            <AlertCircle size={14} className="text-amber-400 flex-shrink-0" />
            <p className="text-xs text-amber-400">
              {isSelfTracking
                ? "Catégorie non définie. Choisis-la ci-dessous."
                : "Catégorie non définie. Ton coach va la configurer prochainement."}
            </p>
          </div>
          {isSelfTracking && saveCompetitionSettings && (
            <SelfCategoryPicker coachId={profile.id} save={saveCompetitionSettings} />
          )}
        </div>
      )}

      {/* Astuces posing — pour que cet espace serve à progresser, pas juste
          à déposer des photos. */}
      {posingData && posingData.tips.length > 0 && (
        <div className="bg-[#E01E1E]/6 border border-[#E01E1E]/15 rounded-xl p-4">
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#E01E1E]/70 mb-2.5 flex items-center gap-1.5">
            <Sparkles size={11} />
            Astuces posing · {category}
          </p>
          <div className="space-y-2">
            {posingData.tips.map((tip, i) => (
              <p key={i} className="text-[11px] text-[#F5EDED]/60 leading-relaxed flex gap-2">
                <span className="text-[#E01E1E]/50 flex-shrink-0">•</span>
                {tip}
              </p>
            ))}
          </div>
        </div>
      )}

      {type === "posing_routine" && posingData && (
        <div className="bg-[#1f0101] border border-[#890404]/20 rounded-xl p-4 space-y-2">
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/35">
            Instructions : {category}
          </p>
          <p className="text-xs text-[#F5EDED]/60 leading-relaxed">
            {posingData.posing_routine.instructions}
          </p>
          <p className="text-[10px] text-[#E01E1E]/70 font-bold">
            ⏱ Durée : {posingData.posing_routine.duration}
          </p>
        </div>
      )}

      {type === "posing_routine" && (
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5 block">
            Durée de ta routine
          </label>
          <input
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="Ex. 48 secondes"
            className={inputCls}
          />
        </div>
      )}

      {/* Médias */}
      {type === "mandatory_poses" ? (
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5 block">
            Photos ({photos.length}/{MAX_PHOTOS}) <span className="text-[#E01E1E]">*</span>
          </label>
          <div className="flex gap-2 flex-wrap">
            {photos.map((p) => (
              <div key={p.localId} className="relative w-16 h-16 rounded-lg overflow-hidden border border-[#890404]/30">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.previewUrl} alt="" className="w-full h-full object-cover" />
                {p.uploading && (
                  <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                    <Loader2 size={16} className="animate-spin text-white" />
                  </div>
                )}
                {p.error && (
                  <div className="absolute inset-0 bg-[#E01E1E]/55 flex items-center justify-center">
                    <span className="text-[9px] text-white font-black">Échec</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setPhotos((prev) => prev.filter((x) => x.localId !== p.localId))}
                  className="absolute top-0.5 right-0.5 w-4.5 h-4.5 rounded-full bg-black/65 flex items-center justify-center"
                  aria-label="Retirer cette photo"
                >
                  <X size={11} className="text-white" />
                </button>
              </div>
            ))}
            {photos.length < MAX_PHOTOS && (
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="w-16 h-16 rounded-lg border border-dashed border-[#890404]/40 bg-black/20 flex flex-col items-center justify-center gap-1 text-[#F5EDED]/40"
              >
                <Camera size={16} />
                <span className="text-[8px] font-bold uppercase">Photo</span>
              </button>
            )}
          </div>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) handlePhotosSelected(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
      ) : (
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5 block">
            Vidéo <span className="text-[#E01E1E]">*</span>
          </label>
          {video ? (
            <div className="flex items-center gap-2.5 bg-black/20 border border-[#890404]/30 rounded-lg px-3 py-2">
              <Video size={14} className={video.error ? "text-[#E01E1E]" : "text-green-400"} />
              <span className="text-[11px] text-[#F5EDED]/60 flex-1">
                {video.uploading ? "Envoi en cours…" : video.error ? "Échec de l'envoi" : "Vidéo prête"}
              </span>
              {video.uploading && <Loader2 size={13} className="animate-spin text-[#F5EDED]/40" />}
              <button type="button" onClick={() => setVideo(null)} aria-label="Retirer la vidéo">
                <X size={13} className="text-[#F5EDED]/40" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 border border-dashed border-[#890404]/40 bg-black/20 rounded-lg py-2.5 text-[#F5EDED]/40"
            >
              <Video size={14} />
              <span className="text-[11px] font-bold uppercase tracking-widest">Filmer ma vidéo</span>
            </button>
          )}
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleVideoSelected(file);
              e.target.value = "";
            }}
          />
        </div>
      )}

      {/* Lens Buddy : superpose la photo précédente en transparence pour
          reprendre exactement la même pose/angle chaque semaine. Lien vers
          la fiche App Store plutôt qu'un schéma d'URL deep-link non
          confirmé — évite d'ouvrir l'appareil photo natif du téléphone
          par erreur en cliquant sur la tuile photo juste à côté. */}
      {type === "mandatory_poses" && (
        <a
          href="https://apps.apple.com/search?term=lens%20buddy"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 bg-[#E01E1E]/6 border border-[#E01E1E]/15 hover:border-[#E01E1E]/35 rounded-lg px-3 py-2.5 transition-colors"
        >
          <Sparkles size={13} className="text-[#E01E1E] flex-shrink-0" />
          <span className="text-[11px] text-[#F5EDED]/55 leading-relaxed flex-1">
            Utilise <strong className="text-[#F5EDED]">Lens Buddy</strong> pour reprendre la même pose au pixel près.
          </span>
          <ExternalLink size={12} className="text-[#E01E1E]/60 flex-shrink-0" />
        </a>
      )}

      {/* Notes */}
      <div>
        <label className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5 block">
          Notes / Ressenti (facultatif)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder={isSelfTracking ? "Notes personnelles…" : "Ce qui t'a plu, ce sur quoi tu veux un retour particulier…"}
          className={`${inputCls} resize-none`}
        />
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={submitting || mediaUploading}
        className="w-full py-3 text-xs font-black uppercase tracking-widest bg-[#E01E1E] hover:bg-[#B00202] text-white rounded-xl disabled:opacity-50 transition-colors"
      >
        {submitting ? "Envoi…" : mediaUploading ? "Envoi des médias…" : "Envoyer"}
      </button>
    </form>
  );
}

// ── History card ─────────────────────────────────────────────────────────────

function PhotoHistoryCard({ photo, isSelfTracking }: { photo: PhotoUpdate; isSelfTracking: boolean }) {
  const hasFeedback = !!photo.coach_replied_at;
  const date = formatDate(photo.submitted_at);
  const typeLabel = TYPE_LABELS[photo.type] ?? photo.type;

  return (
    <div className="bg-[#1f0101] border border-[#890404]/20 rounded-xl p-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-white">{typeLabel}</p>
          <p className="text-[10px] text-[#F5EDED]/30">
            {date}
            {photo.week_number != null && ` · Semaine ${photo.week_number}`}
          </p>
          {photo.category && (
            <span className="inline-block text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#890404]/20 text-[#F5EDED]/40 border border-[#890404]/15 mt-1">
              {photo.category}
            </span>
          )}
        </div>
        {/* Pas de statut "retour" en suivi perso — personne ne relit ces
            photos, ce badge n'aurait aucun sens. */}
        {!isSelfTracking && (hasFeedback ? (
          <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-green-500/15 text-green-400 border border-green-500/25 flex-shrink-0">
            <CheckCircle2 size={10} />
            Retour reçu
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25 flex-shrink-0">
            <Clock size={10} />
            En attente
          </span>
        ))}
      </div>

      {(photo.photo_urls.length > 0 || photo.video_url) && (
        <div className="flex gap-1.5 flex-wrap">
          {photo.photo_urls.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="w-12 h-12 object-cover rounded-lg border border-[#890404]/30" />
            </a>
          ))}
          {photo.video_url && (
            <a
              href={photo.video_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#E01E1E]/80 hover:text-[#E01E1E] transition-colors"
            >
              <ExternalLink size={11} />
              Voir la vidéo
            </a>
          )}
        </div>
      )}

      {photo.drive_link && (
        <a
          href={photo.drive_link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#E01E1E]/80 hover:text-[#E01E1E] transition-colors"
        >
          <ExternalLink size={11} />
          Ouvrir dans Drive
        </a>
      )}

      {photo.notes && (
        <p className="text-[10px] text-[#F5EDED]/45 leading-relaxed border-t border-[#890404]/10 pt-2">
          {photo.notes}
        </p>
      )}

      {!isSelfTracking && hasFeedback && photo.coach_feedback && (
        <div className="bg-green-500/8 border border-green-500/20 rounded-lg p-3 mt-1">
          <p className="text-[9px] font-bold uppercase tracking-widest text-green-400/70 mb-1">
            Retour de ton coach
          </p>
          <p className="text-xs text-[#F5EDED]/75 leading-relaxed">
            {photo.coach_feedback}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────

interface Props {
  today: string;
  profile: Profile | null;
  photoHistory: PhotoUpdate[];
  alreadySubmitted: boolean;
  submitPhotoUpdate: (formData: FormData) => Promise<{ error?: string; success?: boolean }>;
  // Uniquement fourni par la page "Moi > Photos" du coach — lui permet de
  // choisir lui-même sa catégorie de compétition, personne d'autre ne peut
  // le faire à sa place.
  saveCompetitionSettings?: (clientId: string, _prev: { error?: string; success?: boolean } | null, formData: FormData) => Promise<{ error?: string; success?: boolean } | null>;
}

export default function ClientPhotosView({
  profile,
  photoHistory,
  alreadySubmitted,
  saveCompetitionSettings,
  submitPhotoUpdate,
}: Props) {
  // Guard: profile not yet available (Supabase fetch failed or slow)
  if (!profile) {
    return (
      <div className="px-6 py-8 max-w-2xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-24 bg-[#1A0101] rounded" />
          <div className="h-8 w-48 bg-[#1A0101] rounded" />
          <div className="h-40 bg-[#1A0101] rounded-xl" />
        </div>
      </div>
    );
  }

  const frequency = profile?.photo_frequency ?? "weekly";
  const isDaily = frequency === "daily";
  const competitionDate = profile?.competition_date;
  const daysLeft = competitionDate ? daysUntil(competitionDate) : null;
  // Le coach utilise cette même vue pour son propre suivi physique (Moi >
  // Photos) — personne ne "donne un retour" là-dessus, donc tout ce qui
  // évoque un coach qui répond n'a pas sa place dans ce contexte.
  const isSelfTracking = profile.role === "coach";

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto pb-24 md:pb-8">
      {/* Header */}
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Suivi
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">Photos</h1>
      </div>

      {/* Frequency badge */}
      <div className="mb-6">
        {isDaily ? (
          <div className="flex items-center gap-3 bg-[#E01E1E]/10 border border-[#E01E1E]/30 rounded-xl px-4 py-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E01E1E] opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#E01E1E]" />
            </span>
            <div>
              <p className="text-xs font-black text-[#E01E1E] uppercase tracking-widest">
                Suivi Quotidien : Compétition
              </p>
              {daysLeft != null && daysLeft > 0 && (
                <p className="text-[10px] text-[#F5EDED]/50 mt-0.5">
                  J-{daysLeft} avant la compétition
                </p>
              )}
              {daysLeft != null && daysLeft <= 0 && (
                <p className="text-[10px] text-green-400/70 mt-0.5">
                  Jour J. Bonne chance ! 💪
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-2.5">
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <p className="text-xs font-bold text-green-400 uppercase tracking-widest">
              Suivi Hebdomadaire
            </p>
          </div>
        )}
      </div>

      {/* Submission section */}
      <div className="bg-[#1f0101] border border-[#890404]/40 rounded-xl p-5 mb-8">
        <div className="mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
            {isDaily ? "Mise à jour du jour" : "Mise à jour de la semaine"}
          </p>
          <h2 className="text-lg font-black uppercase tracking-tight">
            Envoyer une mise à jour
          </h2>
        </div>

        {alreadySubmitted ? (
          <div className="flex items-center gap-3 py-4 text-center justify-center">
            <CheckCircle2 size={20} className="text-green-400" />
            <p className="text-sm font-bold text-green-400">
              Mise à jour envoyée {isDaily ? "aujourd'hui" : "cette semaine"} ✓
            </p>
          </div>
        ) : (
          <SubmissionForm
            profile={profile}
            onSubmit={submitPhotoUpdate}
            isSelfTracking={isSelfTracking}
            saveCompetitionSettings={saveCompetitionSettings}
          />
        )}
      </div>

      {/* History */}
      {(photoHistory ?? []).length > 0 && (
        <section>
          <div className="mb-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
              Historique
            </p>
            <h2 className="text-xl font-black uppercase tracking-tight">
              Mes photos
            </h2>
          </div>
          <div className="space-y-3">
            {(photoHistory ?? []).map((p) => (
              <PhotoHistoryCard key={p.id} photo={p} isSelfTracking={isSelfTracking} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
