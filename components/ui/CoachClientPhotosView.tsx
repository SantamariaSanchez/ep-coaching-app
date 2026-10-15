"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { useActionState, useState } from "react";
import { ExternalLink, CheckCircle2, Camera } from "lucide-react";
import { CATEGORIES_BY_GENDER, TYPE_LABELS } from "@/lib/posing-data";
import PhotoCompareLauncher from "@/components/photos/PhotoCompareLauncher";
import { mergePhotoSets, photoUpdateSets, type PhotoSet } from "@/lib/photo-sets";
import type { Profile } from "@/utils/auth";
import type { PhotoUpdate } from "@/utils/photos";
import { safeExternalUrl } from "@/lib/sanitize";
import EmbeddedVideo from "@/components/ui/EmbeddedVideo";

const inputCls =
  "w-full bg-(--ep-s2) border border-(--ep-line)/30 rounded-lg px-3 py-2 text-sm text-(--ep-strong) placeholder:text-(--ep-ink)/25 focus:outline-none focus:border-(--ep-accent)/60 transition-colors";
const labelCls =
  "block text-[9px] font-bold uppercase tracking-widest text-(--ep-ink)/40 mb-1.5";

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
  const t = useT();
  const bound = save.bind(null, client.id);
  const [state, action, isPending] = useActionState(bound, null);

  return (
    <form action={action} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>{t("Catégorie compétition")}</label>
          <select aria-label={t("Catégorie compétition")}
            name="competition_category"
            defaultValue={client.competition_category ?? ""}
            className={inputCls}
          >
            <option value="">{t("Non définie")}</option>
            <optgroup label={t("Femmes")}>
              {CATEGORIES_BY_GENDER.femme.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </optgroup>
            <optgroup label={t("Hommes")}>
              {CATEGORIES_BY_GENDER.homme.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
        <div>
          <label className={labelCls}>{t("Date de compétition")}</label>
          <input aria-label={t("Date de compétition")}
            name="competition_date"
            type="date"
            defaultValue={client.competition_date ?? ""}
            className={inputCls}
          />
        </div>
      </div>

      <div>
        <label className={labelCls}>{t("Phase actuelle")}</label>
        <div className="flex gap-2">
          {[
            { value: "off_season", label: t("Off-season") },
            { value: "prep", label: t("Prep") },
          ].map((opt) => (
            <label
              key={opt.value}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border border-(--ep-line)/25 cursor-pointer text-xs font-bold uppercase tracking-widest text-(--ep-ink)/40 has-[:checked]:bg-(--ep-accent)/15 has-[:checked]:border-(--ep-accent)/50 has-[:checked]:text-(--ep-accent) transition-colors"
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
          <p className="text-[10px] text-(--ep-ink)/35">
            {t("Fréquence actuelle :")}{" "}
            <span
              className={
                client.photo_frequency === "daily"
                  ? "text-(--ep-accent) font-bold"
                  : "text-green-400 font-bold"
              }
            >
              {client.photo_frequency === "daily"
                ? t("📸 Quotidienne (J-30)")
                : t("📅 Hebdomadaire")}
            </span>
          </p>
          <p className="text-[9px] text-(--ep-ink)/20 mt-0.5">
            {t("Passe automatiquement en quotidien à J-30 avant la compétition.")}
          </p>
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="px-5 py-2.5 text-xs font-black uppercase tracking-widest bg-(--ep-accent) hover:bg-(--ep-accent-2) text-(--ep-strong) rounded-lg disabled:opacity-50 transition-colors"
        >
          {isPending ? t("Sauvegarde…") : t("Sauvegarder")}
        </button>
      </div>

      {state?.success && (
        <p className="text-xs text-green-400">{t("✓ Paramètres sauvegardés.")}</p>
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
  const t = useT();
  const bound = action.bind(null, photo.id, clientId);
  const [state, formAction, isPending] = useActionState(bound, null);

  if (state?.success) {
    return (
      <p className="text-green-400 text-xs font-semibold pt-3 border-t border-(--ep-line)/15">
        {t("✓ Retour envoyé, le client a été notifié.")}
      </p>
    );
  }

  return (
    <form action={formAction} className="pt-3 border-t border-(--ep-line)/15 space-y-3">
      <p className="text-[9px] font-bold uppercase tracking-widest text-amber-400/70">
        {t("Envoyer un retour")}
      </p>
      <textarea
        name="coach_feedback"
        rows={3}
        required
        placeholder={t("Points positifs, axes d'amélioration, corrections à apporter…")} aria-label={t("Points positifs, axes d'amélioration, corrections à apporter…")}
        className={`${inputCls} resize-none`}
      />
      {state?.error && <p className="text-xs text-red-400">{state.error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="bg-(--ep-accent) hover:bg-(--ep-accent-2) disabled:opacity-50 text-(--ep-strong) text-xs font-bold uppercase tracking-widest px-5 py-2.5 rounded-lg transition-colors"
      >
        {isPending ? t("Envoi…") : t("Envoyer le retour")}
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
  const t = useT();
  const hasFeedback = !!photo.coach_replied_at;
  const typeLabel = TYPE_LABELS[photo.type] ?? photo.type;

  return (
    <div className={`rounded-xl p-4 space-y-3 border ${pending ? "bg-(--ep-s1) border-amber-500/20" : "bg-(--ep-s3) border-(--ep-line)/20"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-(--ep-strong)">{typeLabel}</p>
          <p className="text-[10px] text-(--ep-ink)/30">
            {formatDate(photo.submitted_at)}
            {photo.week_number != null && ` · Semaine ${photo.week_number}`}
          </p>
          {photo.category && (
            <span className="inline-block text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-(--ep-line)/20 text-(--ep-ink)/40 border border-(--ep-line)/15 mt-1">
              {photo.category}
            </span>
          )}
        </div>
        {hasFeedback && (
          <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-green-500/15 text-green-400 border border-green-500/25 flex-shrink-0">
            <CheckCircle2 size={10} />
            {t("Traité")}
          </span>
        )}
      </div>

      {(photo.photo_urls.length > 0 || photo.video_url) && (
        <div className="flex gap-1.5 flex-wrap">
          {photo.photo_urls.map((url, i) => (
            <a key={i} href={safeExternalUrl(url) ?? "#"} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Photo ${i + 1}`} className="w-14 h-14 object-cover rounded-lg border border-(--ep-line)/30" />
            </a>
          ))}
          {photo.video_url && (
            <a
              href={safeExternalUrl(photo.video_url) ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[10px] font-bold text-(--ep-accent)/80 hover:text-(--ep-accent) transition-colors"
            >
              <ExternalLink size={11} />
              {t("Voir la vidéo")}
            </a>
          )}
        </div>
      )}
      {!photo.video_url && photo.video_link && <EmbeddedVideo url={photo.video_link} maxWidth={280} />}

      {photo.drive_link && (
        <a
          href={safeExternalUrl(photo.drive_link) ?? "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[10px] font-bold text-(--ep-accent)/80 hover:text-(--ep-accent) transition-colors"
        >
          <ExternalLink size={11} />
          {t("Ouvrir dans Drive")}
        </a>
      )}

      {photo.notes && (
        <p className="text-xs text-(--ep-ink)/50 leading-relaxed border-t border-(--ep-line)/10 pt-2">
          <span className="text-[9px] font-bold uppercase tracking-widest text-(--ep-ink)/25">{t("Notes :")}{" "}</span>
          {photo.notes}
        </p>
      )}

      {hasFeedback && photo.coach_feedback && (
        <div className="pt-2 border-t border-(--ep-line)/10 space-y-1.5">
          <p className="text-[9px] font-bold uppercase tracking-widest text-green-400/60">
            {t("Ton retour envoyé")}
          </p>
          <p className="text-xs text-(--ep-ink)/55 leading-relaxed">{photo.coach_feedback}</p>
        </div>
      )}

      {pending && (
        <PhotoFeedbackForm photo={photo} clientId={clientId} action={sendFeedback} />
      )}
    </div>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────

interface Props {
  client: Profile;
  photos: PhotoUpdate[];
  saveCompetitionSettings: (clientId: string, _prev: ActionState, formData: FormData) => Promise<ActionState>;
  sendPhotoFeedback: (photoId: string, clientId: string, _prev: ActionState, formData: FormData) => Promise<ActionState>;
  /** Séances photo (bilans + envois) ; à défaut, seulement les envois de cette page. */
  compareSets?: PhotoSet[];
}

export default function CoachClientPhotosView({
  client,
  photos,
  saveCompetitionSettings,
  sendPhotoFeedback,
  compareSets,
}: Props) {
  const t = useT();
  // Comparateur plein écran (2026-10-14) : remplace l'ancienne comparaison
  // à deux listes déroulantes. Bascule, semaine vs S-6, dessin qui s'efface
  // après 5 s, post preuve sociale.
  const sets = compareSets ?? mergePhotoSets(photoUpdateSets(photos));
  const firstName = (client.full_name ?? "").split(" ")[0] || null;
  const pendingPhotos = photos.filter((p) => !p.coach_replied_at);
  const donePhotos = photos.filter((p) => !!p.coach_replied_at);
  const [showDone, setShowDone] = useState(false);

  return (
    <div className="space-y-8">
      <PhotoCompareLauncher sets={sets} audience="coach" subjectName={firstName} />

      {/* Paramètres */}
      <div className="bg-(--ep-s1) border border-(--ep-line)/20 rounded-xl p-5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-(--ep-ink)/35 mb-4">
          {t("Paramètres photo")}
        </p>
        <CompetitionSettings client={client} save={saveCompetitionSettings} />
      </div>

      {/* Toutes les photos — en attente */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-sm font-black uppercase tracking-widest text-(--ep-strong)">
            {t("En attente de retour")}
          </h2>
          {pendingPhotos.length > 0 && (
            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
              {pendingPhotos.length}
            </span>
          )}
        </div>

        {pendingPhotos.length === 0 ? (
          <div className="flex items-center gap-3 bg-(--ep-s1) border border-(--ep-line)/20 rounded-xl px-5 py-4">
            <CheckCircle2 size={16} className="text-green-400" />
            <p className="text-xs text-(--ep-ink)/40">{t("Tout à jour, aucune photo en attente.")}</p>
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
            className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-(--ep-ink)/30 hover:text-(--ep-ink)/50 transition-colors mb-3"
          >
            <Camera size={12} />
            {t("Retours envoyés (")}{donePhotos.length})
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

      {photos.length === 0 && sets.length < 2 && (
        <div className="bg-(--ep-s1) border border-(--ep-line)/20 rounded-xl p-8 text-center">
          <p className="text-xs text-(--ep-ink)/25 italic">
            {t("Aucune photo soumise pour ce client.")}
          </p>
        </div>
      )}
    </div>
  );
}
