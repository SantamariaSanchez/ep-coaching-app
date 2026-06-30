"use client";

import { useActionState, useState } from "react";
import { ExternalLink, CheckCircle2, Clock, Camera, Pencil, Eraser } from "lucide-react";
import { ALL_CATEGORIES, TYPE_LABELS } from "@/lib/posing-data";
import { driveImageUrl } from "@/lib/drive-utils";
import DrawableImage from "@/components/ui/DrawableImage";
import type { Profile } from "@/utils/auth";
import type { PhotoUpdate } from "@/utils/photos";

const inputCls =
  "w-full bg-[var(--color-ep-input)] border border-[var(--color-ep-dark-red)]/30 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[var(--color-ep-light)]/25 focus:outline-none focus:border-[var(--color-ep-red)]/60 transition-colors";
const labelCls =
  "block text-[9px] font-bold uppercase tracking-widest text-[var(--color-ep-light)]/40 mb-1.5";

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
          <select
            name="competition_category"
            defaultValue={client.competition_category ?? ""}
            className={inputCls}
          >
            <option value="">— Non définie —</option>
            {ALL_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Date de compétition</label>
          <input
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
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border border-[var(--color-ep-dark-red)]/25 cursor-pointer text-xs font-bold uppercase tracking-widest text-[var(--color-ep-light)]/40 has-[:checked]:bg-[var(--color-ep-red)]/15 has-[:checked]:border-[var(--color-ep-red)]/50 has-[:checked]:text-[var(--color-ep-red)] transition-colors"
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
          <p className="text-[10px] text-[var(--color-ep-light)]/35">
            Fréquence actuelle :{" "}
            <span
              className={
                client.photo_frequency === "daily"
                  ? "text-[var(--color-ep-red)] font-bold"
                  : "text-green-400 font-bold"
              }
            >
              {client.photo_frequency === "daily"
                ? "📸 Quotidienne (J-30)"
                : "📅 Hebdomadaire"}
            </span>
          </p>
          <p className="text-[9px] text-[var(--color-ep-light)]/20 mt-0.5">
            Passe automatiquement en quotidien à J-30 avant la compétition.
          </p>
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="px-5 py-2.5 text-xs font-black uppercase tracking-widest bg-[var(--color-ep-red)] hover:bg-[var(--color-ep-med-red)] text-white rounded-lg disabled:opacity-50 transition-colors"
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
      <p className="text-green-400 text-xs font-semibold pt-3 border-t border-[var(--color-ep-dark-red)]/15">
        ✓ Retour envoyé — le client a été notifié.
      </p>
    );
  }

  return (
    <form action={formAction} className="pt-3 border-t border-[var(--color-ep-dark-red)]/15 space-y-3">
      <p className="text-[9px] font-bold uppercase tracking-widest text-amber-400/70">
        Envoyer un retour
      </p>
      <textarea
        name="coach_feedback"
        rows={3}
        required
        placeholder="Points positifs, axes d'amélioration, corrections à apporter…"
        className={`${inputCls} resize-none`}
      />
      {state?.error && <p className="text-xs text-red-400">{state.error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="bg-[var(--color-ep-red)] hover:bg-[var(--color-ep-med-red)] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-widest px-5 py-2.5 rounded-lg transition-colors"
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
    <div className={`rounded-xl p-4 space-y-3 border ${pending ? "bg-[var(--color-ep-card)] border-amber-500/20" : "bg-[var(--color-ep-card)] border-[var(--color-ep-dark-red)]/20"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-white">{typeLabel}</p>
          <p className="text-[10px] text-[var(--color-ep-light)]/30">
            {formatDate(photo.submitted_at)}
            {photo.week_number != null && ` · Semaine ${photo.week_number}`}
          </p>
          {photo.category && (
            <span className="inline-block text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-[var(--color-ep-dark-red)]/20 text-[var(--color-ep-light)]/40 border border-[var(--color-ep-dark-red)]/15 mt-1">
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

      <a
        href={photo.drive_link}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[var(--color-ep-red)]/80 hover:text-[var(--color-ep-red)] transition-colors"
      >
        <ExternalLink size={11} />
        Ouvrir dans Drive
      </a>

      {photo.notes && (
        <p className="text-xs text-[var(--color-ep-light)]/50 leading-relaxed border-t border-[var(--color-ep-dark-red)]/10 pt-2">
          <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-ep-light)]/25">Notes — </span>
          {photo.notes}
        </p>
      )}

      {hasFeedback && photo.coach_feedback && (
        <div className="pt-2 border-t border-[var(--color-ep-dark-red)]/10 space-y-1.5">
          <p className="text-[9px] font-bold uppercase tracking-widest text-green-400/60">
            Ton retour envoyé
          </p>
          <p className="text-xs text-[var(--color-ep-light)]/55 leading-relaxed">{photo.coach_feedback}</p>
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
    <div className="bg-[var(--color-ep-card)] border border-[var(--color-ep-dark-red)]/20 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-ep-light)]/35">
          Comparaison
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDrawMode((v) => !v)}
            className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border transition-colors ${
              drawMode
                ? "bg-[var(--color-ep-red)]/20 border-[var(--color-ep-red)]/50 text-[var(--color-ep-red)]"
                : "border-[var(--color-ep-dark-red)]/25 text-[var(--color-ep-light)]/40 hover:text-[var(--color-ep-light)]/70"
            }`}
          >
            <Pencil size={11} />
            {drawMode ? "Dessin actif" : "Mode dessin"}
          </button>
          {drawMode && (
            <button
              onClick={() => setClearKey((k) => k + 1)}
              title="Effacer les traits"
              className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-[var(--color-ep-dark-red)]/25 text-[var(--color-ep-light)]/40 hover:text-[var(--color-ep-light)]/70 transition-colors"
            >
              <Eraser size={12} />
            </button>
          )}
        </div>
      </div>

      {drawMode && (
        <p className="text-[10px] text-[var(--color-ep-light)]/30 italic">
          Trace directement sur les photos pour pointer un détail à l&apos;oral — chaque trait s&apos;efface automatiquement au bout de 5 secondes.
        </p>
      )}

      <div className="grid grid-cols-2 gap-4">
        {[
          { id: leftId, setId: setLeftId, photo: leftPhoto, label: "Avant" },
          { id: rightId, setId: setRightId, photo: rightPhoto, label: "Après" },
        ].map(({ id, setId, photo, label }) => {
          const imgUrl = photo ? driveImageUrl(photo.drive_link) : null;
          return (
            <div key={label} className="space-y-2">
              <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-ep-light)]/30">
                {label}
              </p>
              <select value={id} onChange={(e) => setId(e.target.value)} className={inputCls}>
                {photos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {formatDate(p.submitted_at)} — {TYPE_LABELS[p.type] ?? p.type}
                  </option>
                ))}
              </select>

              {photo && imgUrl && (
                <DrawableImage key={`${id}-${clearKey}`} src={imgUrl} alt={label} drawMode={drawMode} />
              )}
              {photo && !imgUrl && (
                <div className="aspect-[3/4] flex items-center justify-center bg-[var(--color-ep-input)] border border-[var(--color-ep-dark-red)]/15 rounded-lg text-center px-4">
                  <p className="text-[10px] text-[var(--color-ep-light)]/30">
                    Aperçu indisponible — le lien Drive doit être partagé en &quot;Tous les utilisateurs disposant du lien&quot;.
                  </p>
                </div>
              )}

              {photo && (
                <div className="bg-[var(--color-ep-input)] border border-[var(--color-ep-dark-red)]/15 rounded-lg p-3 space-y-1.5">
                  <p className="text-xs text-white font-bold">{TYPE_LABELS[photo.type] ?? photo.type}</p>
                  <p className="text-[10px] text-[var(--color-ep-light)]/40">{formatDate(photo.submitted_at)}</p>
                  {photo.notes && <p className="text-[10px] text-[var(--color-ep-light)]/40 italic">{photo.notes}</p>}
                  <a
                    href={photo.drive_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-[var(--color-ep-red)]/80 hover:text-[var(--color-ep-red)] transition-colors"
                  >
                    <ExternalLink size={10} />
                    Ouvrir Drive
                  </a>
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
      <div className="bg-[var(--color-ep-card)] border border-[var(--color-ep-dark-red)]/20 rounded-xl p-5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-ep-light)]/35 mb-4">
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
          <div className="flex items-center gap-3 bg-[var(--color-ep-card)] border border-[var(--color-ep-dark-red)]/20 rounded-xl px-5 py-4">
            <CheckCircle2 size={16} className="text-green-400" />
            <p className="text-xs text-[var(--color-ep-light)]/40">Tout à jour — aucune photo en attente.</p>
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
            className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-ep-light)]/30 hover:text-[var(--color-ep-light)]/50 transition-colors mb-3"
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
        <div className="bg-[var(--color-ep-card)] border border-[var(--color-ep-dark-red)]/20 rounded-xl p-8 text-center">
          <p className="text-xs text-[var(--color-ep-light)]/25 italic">
            Aucune photo soumise pour ce client.
          </p>
        </div>
      )}
    </div>
  );
}
