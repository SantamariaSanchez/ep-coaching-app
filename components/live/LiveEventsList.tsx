"use client";

import { useState } from "react";
import { CalendarX2 } from "lucide-react";
import LiveEventCard from "@/components/live/LiveEventCard";

function isStillRelevant(startsAt: string): boolean {
  return new Date(startsAt).getTime() > Date.now() - 2 * 60 * 60 * 1000;
}
import LiveScheduler from "@/components/live/LiveScheduler";
import type { LiveEvent } from "@/lib/live-types";
import type { CreateLiveEventInput } from "@/app/dashboard/coach/live/actions";

export default function LiveEventsList({
  initialEvents,
  basePath,
  isCoach,
  clients,
  onCreate,
  onCancel,
  onDelete,
}: {
  initialEvents: LiveEvent[];
  basePath: string;
  isCoach: boolean;
  clients?: { id: string; full_name: string | null }[];
  onCreate?: (input: CreateLiveEventInput) => Promise<{ error?: string; id?: string }>;
  onCancel?: (id: string) => Promise<{ error?: string }>;
  onDelete?: (id: string) => Promise<{ error?: string }>;
}) {
  const [events, setEvents] = useState(initialEvents);

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

  const upcoming = events.filter((e) => e.status !== "cancelled" && isStillRelevant(e.starts_at));
  const others = events.filter((e) => !upcoming.includes(e));

  return (
    <div>
      {isCoach && onCreate && clients && <LiveScheduler clients={clients} onCreate={onCreate} />}

      {upcoming.length === 0 ? (
        <div className="bg-[var(--color-ep-card)] border border-dashed border-[var(--color-ep-dark-red)]/25 rounded-xl py-12 text-center mb-6">
          <CalendarX2 size={24} className="text-[var(--color-ep-light)]/15 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-sm text-[var(--color-ep-light)]/35">Aucun live programmé pour l&apos;instant.</p>
        </div>
      ) : (
        <div className="space-y-2 mb-6">
          {upcoming.map((event) => (
            <LiveEventCard
              key={event.id}
              event={event}
              basePath={basePath}
              isCoach={isCoach}
              onCancel={isCoach ? () => handleCancel(event.id) : undefined}
              onDelete={isCoach ? () => handleDelete(event.id) : undefined}
            />
          ))}
        </div>
      )}

      {others.length > 0 && (
        <>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-ep-light)]/25 mb-2">
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
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
