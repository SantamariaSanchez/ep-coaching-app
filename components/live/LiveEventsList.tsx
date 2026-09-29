"use client";

import { useState } from "react";
import { AlertCircle, CalendarX2 } from "lucide-react";
import LiveEventCard from "@/components/live/LiveEventCard";
import LiveScheduler from "@/components/live/LiveScheduler";
import { useConfirm } from "@/components/ui/ConfirmDialogProvider";
import { isOneToOneType, type LiveEvent } from "@/lib/live-types";
import type { CreateLiveEventInput, UpdateLiveEventInput } from "@/app/dashboard/coach/live/actions";

function isStillRelevant(startsAt: string): boolean {
  return new Date(startsAt).getTime() > Date.now() - 2 * 60 * 60 * 1000;
}

// Live encore à venir : sa suppression prévient les participants (même règle
// que deleteLiveEvent côté serveur), le message de confirmation le dit.
function isUpcomingScheduled(event: LiveEvent | undefined): boolean {
  return !!event && event.status === "scheduled" && new Date(event.starts_at).getTime() > Date.now();
}

export default function LiveEventsList({
  initialEvents,
  basePath,
  isCoach,
  clients,
  onCreate,
  onCancel,
  onDelete,
  onUpdate,
  onToggleRsvp,
  onSaveRecap,
  autoOpenRecapId,
}: {
  initialEvents: LiveEvent[];
  basePath: string;
  isCoach: boolean;
  clients?: { id: string; full_name: string | null }[];
  onCreate?: (input: CreateLiveEventInput) => Promise<{ error?: string; id?: string }>;
  onCancel?: (id: string) => Promise<{ error?: string }>;
  onDelete?: (id: string) => Promise<{ error?: string }>;
  onUpdate?: (id: string, input: UpdateLiveEventInput) => Promise<{ error?: string }>;
  onToggleRsvp?: (id: string) => Promise<{ error?: string; rsvped?: boolean }>;
  onSaveRecap?: (id: string, recap: string) => Promise<{ error?: string }>;
  /** Live que le coach vient de terminer (?recap=id) : sa saisie de notes s'ouvre d'elle-même. */
  autoOpenRecapId?: string | null;
}) {
  const confirm = useConfirm();
  const [events, setEvents] = useState(initialEvents);
  const [syncedFrom, setSyncedFrom] = useState(initialEvents);
  const [actionError, setActionError] = useState<string | null>(null);

  // MASTERCLASS.md Axe E : resynchronise depuis le serveur quand
  // initialEvents change (même piège que todayLogs dans ClientNutritionView —
  // useState ne reprend jamais un nouveau prop après le premier rendu).
  // Ajusté pendant le rendu plutôt que dans un useEffect, qui provoquait un
  // second rendu complet de la liste à chaque rafraîchissement.
  if (syncedFrom !== initialEvents) {
    setSyncedFrom(initialEvents);
    setEvents(initialEvents);
  }

  // Annuler ou supprimer se faisait en un clic, sans confirmation : un tap
  // de travers sur mobile retirait un rendez-vous client. Les deux passent
  // désormais par la confirmation de l'appli, et les participants d'un
  // live à venir sont prévenus dans les deux cas (voir notifyLiveCancelled).
  async function handleCancel(id: string) {
    if (!onCancel) return;
    const ok = await confirm("Annuler ce live ? Les participants seront prévenus.", {
      confirmLabel: "Annuler le live",
      cancelLabel: "Garder",
    });
    if (!ok) return;
    setActionError(null);
    try {
      const res = await onCancel(id);
      if (res.error) {
        setActionError(res.error);
        return;
      }
      setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, status: "cancelled" } : e)));
    } catch {
      setActionError("Annulation impossible pour le moment, réessaie.");
    }
  }

  async function handleDelete(id: string) {
    if (!onDelete) return;
    const event = events.find((e) => e.id === id);
    const upcomingScheduled = isUpcomingScheduled(event);
    const ok = await confirm(
      upcomingScheduled
        ? "Supprimer définitivement ce live ? Les participants seront prévenus."
        : "Supprimer définitivement ce live et ses notes ?",
      { confirmLabel: "Supprimer", cancelLabel: "Garder" }
    );
    if (!ok) return;
    setActionError(null);
    try {
      const res = await onDelete(id);
      if (res.error) {
        setActionError(res.error);
        return;
      }
      setEvents((prev) => prev.filter((e) => e.id !== id));
    } catch {
      setActionError("Suppression impossible pour le moment, réessaie.");
    }
  }

  async function handleUpdate(id: string, input: UpdateLiveEventInput) {
    if (!onUpdate) return { error: "Action indisponible." };
    let res: { error?: string };
    try {
      res = await onUpdate(id, input);
    } catch {
      return { error: "Modification impossible pour le moment, réessaie." };
    }
    if (!res.error) {
      setEvents((prev) =>
        prev.map((e) =>
          e.id === id
            ? {
                ...e,
                title: input.title,
                description: input.description || null,
                invited_client_id: isOneToOneType(e.type) ? input.invitedClientId : e.invited_client_id,
                invited_client_name:
                  isOneToOneType(e.type)
                    ? clients?.find((c) => c.id === input.invitedClientId)?.full_name ?? e.invited_client_name
                    : e.invited_client_name,
                starts_at: input.startsAt,
                duration_minutes: input.durationMinutes,
              }
            : e
        )
      );
    }
    return res;
  }

  const upcoming = events.filter((e) => e.status !== "cancelled" && isStillRelevant(e.starts_at));
  const others = events.filter((e) => !upcoming.includes(e));

  return (
    <div>
      {isCoach && onCreate && clients && <LiveScheduler clients={clients} onCreate={onCreate} />}

      {actionError && (
        <div role="alert" className="flex items-center gap-2 text-red-400 text-xs font-semibold mb-3">
          <AlertCircle size={12} className="flex-shrink-0" /> {actionError}
        </div>
      )}

      {upcoming.length === 0 ? (
        <div className="bg-[#1f0101] border border-dashed border-[#890404]/25 rounded-xl py-12 text-center mb-6">
          <CalendarX2 size={24} className="text-[#F5EDED]/15 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-sm text-[#F5EDED]/35">Aucun live programmé pour l&apos;instant.</p>
        </div>
      ) : (
        <div className="space-y-2 mb-6">
          {upcoming.map((event) => (
            <LiveEventCard
              key={event.id}
              event={event}
              basePath={basePath}
              isCoach={isCoach}
              clients={clients}
              onCancel={isCoach ? () => handleCancel(event.id) : undefined}
              onDelete={isCoach ? () => handleDelete(event.id) : undefined}
              onUpdate={isCoach && onUpdate ? handleUpdate : undefined}
              onToggleRsvp={!isCoach ? onToggleRsvp : undefined}
              onSaveRecap={isCoach ? onSaveRecap : undefined}
              autoOpenRecap={isCoach && autoOpenRecapId === event.id}
            />
          ))}
        </div>
      )}

      {others.length > 0 && (
        <>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/25 mb-2">
            Passés / annulés
          </p>
          <div className="space-y-2 opacity-60">
            {others.map((event) => (
              <LiveEventCard
                key={event.id}
                event={event}
                basePath={basePath}
                isCoach={isCoach}
                onDelete={isCoach ? () => handleDelete(event.id) : undefined}
                onSaveRecap={isCoach ? onSaveRecap : undefined}
                autoOpenRecap={isCoach && autoOpenRecapId === event.id}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
