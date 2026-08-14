"use client";

import { useActionState, useState } from "react";
import { ExternalLink, CheckCircle2, Camera, Pencil, Eraser } from "lucide-react";
import { CATEGORIES_BY_GENDER, TYPE_LABELS } from "@/lib/posing-data";
import { driveImageUrl } from "@/lib/drive-utils";
import DrawableImage from "@/components/ui/DrawableImage";
import type { Profile } from "@/utils/auth";
import type { PhotoUpdate } from "@/utils/photos";
import { safeExternalUrl } from "@/lib/sanitize";

const inputCls =
  "w-full bg-[#150000] border border-[#890404]/30 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#F5EDED]/25 focus:outline-none focus:border-[#E01E1E]/60 transition-colors";
const labelCls =
  "block text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5";

type ActionState = { error?: string; success?: boolean } | null;

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(dateStr + "T12:00:00"));
}

// ── Competition settings ──────────────────────────────────────────────────────

function CompetitionSettings({
  client,
  save,
}: {
  client: Profile;
  save: (clientId: string, _prev: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const bound = save.bind(null, client.id);
  const [state, action, isPending] = useActionState(bound, null);

  return (
    <form action={action} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Catégorie compétition</label>
          <select aria-label="Catégorie compétition"
            name="competition_category"
            defaultValue={client.competition_category ?? ""}
            className={inputCls}
          >
            <option value="">Non définie</option>
            <optgroup label="Femmes">
              {CATEGORIES_BY_GENDER.femme.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </optgroup>
            <optgroup label="Hommes">
              {CATEGORIES_BY_GENDER.homme.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
        <div>
          <label className={labelCls}>Date de compétition</label>
          <input aria-label="Date de compétition"
            name="competition_date"
            type="date"
            defaultValue={client.competition_date ?? ""}
            className={inputCls}
          />
        </div>
      </div>

      <div>
        <label className={labelCls}>Phase actuelle</label>
        <div className="flex gap-2">
          {[
            { value: "off_season", label: "Off-season" },
            { value: "prep", label: "Prep" },
          ].map((opt) => (
            <label
              key={opt.value}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border border-[#890404]/25 cursor-pointer text-xs font-bold uppercase tracking-widest text-[#F5EDED]/40 has-[:checked]:bg-[#E01E1E]/15 has-[:checked]:border-[#E01E1E]/50 has-[:checked]:text-[#E01E1E] transition-colors"
            >
              <input
                type="radio"
                name="season_mode"
                value={opt.value}
                defaultChecked={(client.season_mode ?? "off_season") === opt.value}
                className="sr-only"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] text-[#F5EDED]/35">
            Fréquence actuelle :{" "}
            <span
              className={
                client.photo_frequency === "daily"
                  ? "text-[#E01E1E] font-bold"
                  : "text-green-400 font-bold"
              }
            >
              {client.photo_frequency === "daily"
                ? "📸 Quotidienne (J-30)"
                : "📅 Hebdomadaire"}
            </span>
          </p>
          <p className="text-[9px] text-[#F5EDED]/20 mt-0.5">
            Passe automatiquement en quotidien à J-30 avant la compétition.
          </p>
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="px-5 py-2.5 text-xs font-black uppercase tracking-widest bg-[#E01E1E] hover:bg-[#B00202] text-white rounded-lg disabled:opacity-50 transition-colors"
        >
          {isPending ? "Sauvegarde…" : "Sauvegarder"}
        </button>
      </div>

      {state?.success && (
        <p className="text-xs text-green-400">✓ Paramètres sauvegardés.</p>
      )}
      {state?.error && <p className="text-xs text-red-400">{state.error}</p>}
    </form>
  );
}

// ── Photo feedback form ────────────────────────────────────────────────────────

function PhotoFeedbackForm({
  photo,
  clientId,
  action,
}: {
  photo: PhotoUpdate;
  clientId: string;
  action: (photoId: string, clientId: string, _prev: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const bound = action.bind(null, photo.id, clientId);
  const [state, formAction, isPending] = useActionState(bound, null);

  if (state?.success) {
    return (
      <p className="text-green-400 text-xs font-semibold pt-3 border-t border-[#890404]/15">
        ✓ Retour envoyé, le client a été notifié.
      </p>
    );
  }

  return (
    <form action={formAction} className="pt-3 border-t border-[#890404]/15 space-y-3">
      <p className="text-[9px] font-bold uppercase tracking-widest text-amber-400/70">
        Envoyer un retour
      </p>
      <textarea
        name="coach_feedback"
        rows={3}
        required
        placeholder="Points positifs, axes d'amélioration, corrections à apporter…" aria-label="Points positifs, axes d'amélioration, corrections à apporter…"
        className={`${inputCls} resize-none`}
      />
      {state?.error && <p className="text-xs text-red-400">{state.error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="bg-[#E01E1E] hover:bg-[#B00202] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-widest px-5 py-2.5 rounded-lg transition-colors"
      >
        {isPending ? "Envoi…" : "Envoyer le retour"}
      </button>
    </form>
  );
}

// ── Photo card ────────────────────────────────────────────────────────────────

function PhotoCard({
  photo,
  clientId,
  pending,
  sendFeedback,
}: {
  photo: PhotoUpdate;
  clientId: string;
  pending: boolean;
  sendFeedback: (photoId: string, clientId: string, _prev: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const hasFeedback = !!photo.coach_replied_at;
  const typeLabel = TYPE_LABELS[photo.type] ?? photo.type;

  return (
    <div className={`rounded-xl p-4 space-y-3 border ${pending ? "bg-[#1f0101] border-amber-500/20" : "bg-[#1a0000] border-[#890404]/20"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-white">{typeLabel}</p>
          <p className="text-[10px] text-[#F5EDED]/30">
            {formatDate(photo.submitted_at)}
            {photo.week_number != null && ` · Semaine ${photo.week_number}`}
          </p>
          {photo.category && (
            <span className="inline-block text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#890404]/20 text-[#F5EDED]/40 border border-[#890404]/15 mt-1">
              {photo.category}
            </span>
          )}
        </div>
        {hasFeedback && (
          <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-green-500/15 text-green-400 border border-green-500/25 flex-shrink-0">
            <CheckCircle2 size={10} />
            Traité
          </span>
        )}
      </div>

      {(photo.photo_urls.length > 0 || photo.video_url) && (
        <div className="flex gap-1.5 flex-wrap">
          {photo.photo_urls.map((url, i) => (
            <a key={i} href={safeExternalUrl(url) ?? "#"} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="w-14 h-14 object-cover rounded-lg border border-[#890404]/30" />
            </a>
          ))}
          {photo.video_url && (
            <a
              href={safeExternalUrl(photo.video_url) ?? "#"}
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
          href={safeExternalUrl(photo.drive_link) ?? "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#E01E1E]/80 hover:text-[#E01E1E] transition-colors"
        >
          <ExternalLink size={11} />
          Ouvrir dans Drive
        </a>
      )}

      {photo.notes && (
        <p className="text-xs text-[#F5EDED]/50 leading-relaxed border-t border-[#890404]/10 pt-2">
          <span className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/25">Notes : </span>
          {photo.notes}
        </p>
      )}

      {hasFeedback && photo.coach_feedback && (
        <div className="pt-2 border-t border-[#890404]/10 space-y-1.5">
          <p className="text-[9px] font-bold uppercase tracking-widest text-green-400/60">
            Ton retour envoyé
          </p>
          <p className="text-xs text-[#F5EDED]/55 leading-relaxed">{photo.coach_feedback}</p>
        </div>
      )}

      {pending && (
        <PhotoFeedbackForm photo={photo} clientId={clientId} action={sendFeedback} />
      )}
    </div>
  );
}

// ── Comparison section ────────────────────────────────────────────────────────
// Real in-app side-by-side viewer (not just opening two Drive tabs), with a
// telestrator-style draw tool: strokes fade out ~5s after being drawn — handy
// for pointing things out live while recording a feedback video for the client.

function ComparisonSection({ photos }: { photos: PhotoUpdate[] }) {
  const [leftId, setLeftId] = useState<string>(photos[0]?.id ?? "");
  const [rightId, setRightId] = useState<string>(photos[1]?.id ?? "");
  const [drawMode, setDrawMode] = useState(false);
  const [clearKey, setClearKey] = useState(0);

  const leftPhoto = photos.find((p) => p.id === leftId);
  const rightPhoto = photos.find((p) => p.id === rightId);

  if (photos.length < 2) return null;

  return (
    <div className="bg-[#1f0101] border border-[#890404]/20 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35">
          Comparaison
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDrawMode((v) => !v)}
            className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border transition-colors ${
              drawMode
                ? "bg-[#E01E1E]/20 border-[#E01E1E]/50 text-[#E01E1E]"
                : "border-[#890404]/25 text-[#F5EDED]/40 hover:text-[#F5EDED]/70"
            }`}
          >
            <Pencil size={11} />
            {drawMode ? "Dessin actif" : "Mode dessin"}
          </button>
          {drawMode && (
            <button
              onClick={() => setClearKey((k) => k + 1)}
              title="Effacer les traits" aria-label="Effacer les traits"
              className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-[#890404]/25 text-[#F5EDED]/40 hover:text-[#F5EDED]/70 transition-colors"
            >
              <Eraser size={12} />
            </button>
          )}
        </div>
      </div>

      {drawMode && (
        <p className="text-[10px] text-[#F5EDED]/30 italic">
          Trace directement sur les photos pour pointer un détail à l&apos;oral, chaque trait s&apos;efface automatiquement au bout de 5 secondes.
        </p>
      )}

      <div className="grid grid-cols-2 gap-4">
        {[
          { id: leftId, setId: setLeftId, photo: leftPhoto, label: "Avant" },
          { id: rightId, setId: setRightId, photo: rightPhoto, label: "Après" },
        ].map(({ id, setId, photo, label }) => {
          const imgUrl = photo
            ? photo.photo_urls[0] ?? (photo.drive_link ? driveImageUrl(photo.drive_link) : null)
            : null;
          return (
            <div key={label} className="space-y-2">
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/30">
                {label}
              </p>
              <select value={id} onChange={(e) => setId(e.target.value)} className={inputCls}>
                {photos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {formatDate(p.submitted_at)} : {TYPE_LABELS[p.type] ?? p.type}
                  </option>
                ))}
              </select>

              {photo && imgUrl && (
                <DrawableImage key={`${id}-${clearKey}`} src={imgUrl} alt={label} drawMode={drawMode} />
              )}
              {photo && !imgUrl && (
                <div className="aspect-[3/4] flex items-center justify-center bg-[#150000] border border-[#890404]/15 rounded-lg text-center px-4">
                  <p className="text-[10px] text-[#F5EDED]/30">
                    {photo.video_url || photo.drive_link
                      ? "Pas de photo pour cette mise à jour (vidéo)."
                      : "Aperçu indisponible. Le lien Drive doit être partagé en «Tous les utilisateurs disposant du lien»."}
                  </p>
                </div>
              )}

              {photo && (
                <div className="bg-[#150000] border border-[#890404]/15 rounded-lg p-3 space-y-1.5">
                  <p className="text-xs text-white font-bold">{TYPE_LABELS[photo.type] ?? photo.type}</p>
                  <p className="text-[10px] text-[#F5EDED]/40">{formatDate(photo.submitted_at)}</p>
                  {photo.notes && <p className="text-[10px] text-[#F5EDED]/40 italic">{photo.notes}</p>}
                  {photo.video_url && (
                    <a
                      href={safeExternalUrl(photo.video_url) ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-[#E01E1E]/80 hover:text-[#E01E1E] transition-colors"
                    >
                      <ExternalLink size={10} />
                      Voir la vidéo
                    </a>
                  )}
                  {!photo.video_url && photo.drive_link && (
                    <a
                      href={safeExternalUrl(photo.drive_link) ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-[#E01E1E]/80 hover:text-[#E01E1E] transition-colors"
                    >
                      <ExternalLink size={10} />
                      Ouvrir Drive
                    </a>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────

interface Props {
  client: Profile;
  photos: PhotoUpdate[];
  saveCompetitionSettings: (clientId: string, _prev: ActionState, formData: FormData) => Promise<ActionState>;
  sendPhotoFeedback: (photoId: string, clientId: string, _prev: ActionState, formData: FormData) => Promise<ActionState>;
}

export default function CoachClientPhotosView({
  client,
  photos,
  saveCompetitionSettings,
  sendPhotoFeedback,
}: Props) {
  const pendingPhotos = photos.filter((p) => !p.coach_replied_at);
  const donePhotos = photos.filter((p) => !!p.coach_replied_at);
  const [showDone, setShowDone] = useState(false);

  return (
    <div className="space-y-8">
      {/* Paramètres */}
      <div className="bg-[#1f0101] border border-[#890404]/20 rounded-xl p-5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-4">
          Paramètres photo
        </p>
        <CompetitionSettings client={client} save={saveCompetitionSettings} />
      </div>

      {/* Comparaison */}
      {photos.length >= 2 && <ComparisonSection photos={photos} />}

      {/* Toutes les photos — en attente */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-sm font-black uppercase tracking-widest text-white">
            En attente de retour
          </h2>
          {pendingPhotos.length > 0 && (
            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
              {pendingPhotos.length}
            </span>
          )}
        </div>

        {pendingPhotos.length === 0 ? (
          <div className="flex items-center gap-3 bg-[#1f0101] border border-[#890404]/20 rounded-xl px-5 py-4">
            <CheckCircle2 size={16} className="text-green-400" />
            <p className="text-xs text-[#F5EDED]/40">Tout à jour, aucune photo en attente.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingPhotos.map((p) => (
              <PhotoCard
                key={p.id}
                photo={p}
                clientId={client.id}
                pending
                sendFeedback={sendPhotoFeedback}
              />
            ))}
          </div>
        )}
      </div>

      {/* Historique traité */}
      {donePhotos.length > 0 && (
        <div>
          <button
            onClick={() => setShowDone((v) => !v)}
            className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/30 hover:text-[#F5EDED]/50 transition-colors mb-3"
          >
            <Camera size={12} />
            Retours envoyés ({donePhotos.length})
            <span className="text-[8px]">{showDone ? "▲" : "▼"}</span>
          </button>
          {showDone && (
            <div className="space-y-3">
              {donePhotos.map((p) => (
                <PhotoCard
                  key={p.id}
                  photo={p}
                  clientId={client.id}
                  pending={false}
                  sendFeedback={sendPhotoFeedback}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {photos.length === 0 && (
        <div className="bg-[#1f0101] border border-[#890404]/20 rounded-xl p-8 text-center">
          <p className="text-xs text-[#F5EDED]/25 italic">
            Aucune photo soumise pour ce client.
          </p>
        </div>
      )}
    </div>
  );
}
