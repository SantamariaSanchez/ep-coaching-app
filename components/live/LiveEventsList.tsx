"use client";

import { useState, useEffect } from "react";
import { CalendarX2 } from "lucide-react";
import LiveEventCard from "@/components/live/LiveEventCard";

function isStillRelevant(startsAt: string): boolean {
  return new Date(startsAt).getTime() > Date.now() - 2 * 60 * 60 * 1000;
}
import LiveScheduler from "@/components/live/LiveScheduler";
import { isOneToOneType, type LiveEvent } from "@/lib/live-types";
import type { CreateLiveEventInput, UpdateLiveEventInput } from "@/app/dashboard/coach/live/actions";

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
}) {
  const [events, setEvents] = useState(initialEvents);

  // MASTERCLASS.md Axe E : resynchronise depuis le serveur quand
  // initialEvents change (même piège que todayLogs dans ClientNutritionView —
  // useState ne reprend jamais un nouveau prop après le premier rendu).
  useEffect(() => {
    setEvents(initialEvents);
  }, [initialEvents]);

  async function handleCancel(id: string) {
    if (!onCancel) return;
    const res = await onCancel(id);
    if (!res.error) {
      setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, status: "cancelled" } : e)));
    }
  }

  async function handleDelete(id: string) {
    if (!onDelete) return;
    const res = await onDelete(id);
    if (!res.error) setEvents((prev) => prev.filter((e) => e.id !== id));
  }

  async function handleUpdate(id: string, input: UpdateLiveEventInput) {
    if (!onUpdate) return { error: "Action indisponible." };
    const res = await onUpdate(id, input);
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
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
