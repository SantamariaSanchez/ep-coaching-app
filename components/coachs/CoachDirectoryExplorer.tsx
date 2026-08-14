"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AtSign, UserPlus, UserX, Tags } from "lucide-react";
import type { CoachDirectoryEntry } from "@/lib/coach-directory";
import { COACH_SPECIALIZATIONS } from "@/lib/coach-specializations";

function initials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
}

// Axe 5 (VISION.md) : filtre client-side (liste déjà petite, pas besoin
// d'un fetch par changement de filtre) — même approche que LeadMagnetsExplorer.
export default function CoachDirectoryExplorer({ coaches }: { coaches: CoachDirectoryEntry[] }) {
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const usedTags = useMemo(() => {
    const set = new Set<string>();
    coaches.forEach((c) => c.specializations.forEach((s) => set.add(s)));
    return COACH_SPECIALIZATIONS.filter((t) => set.has(t));
  }, [coaches]);

  const filtered = useMemo(() => {
    if (!activeTag) return coaches;
    if (activeTag === "Généraliste") {
      return coaches.filter((c) => c.specializations.length === 0 || c.specializations.includes("Généraliste"));
    }
    return coaches.filter((c) => c.specializations.includes(activeTag));
  }, [coaches, activeTag]);

  return (
    <div>
      {usedTags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
          <button
            type="button"
            onClick={() => setActiveTag(null)}
            style={chipStyle(activeTag === null)}
          >
            Tous
          </button>
          {usedTags.map((tag) => (
            <button key={tag} type="button" onClick={() => setActiveTag(tag)} style={chipStyle(activeTag === tag)}>
              {tag}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="bg-[#1f0101] border border-dashed border-[#890404]/25 rounded-xl py-16 text-center">
          <Tags size={22} className="text-[#F5EDED]/15 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-sm text-[#F5EDED]/35">Aucun coach ne correspond à ce critère pour l&apos;instant.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map((coach) => (
            <CoachCard key={coach.id} coach={coach} />
          ))}
        </div>
      )}
    </div>
  );
}

function chipStyle(active: boolean): React.CSSProperties {
  return {
    fontSize: 11.5,
    fontWeight: 700,
    padding: "7px 12px",
    borderRadius: 999,
    cursor: "pointer",
    border: active ? "1px solid #E01E1E" : "1px solid rgba(245,237,237,0.15)",
    background: active ? "rgba(224,30,30,0.16)" : "rgba(0,0,0,0.25)",
    color: active ? "#F5EDED" : "rgba(245,237,237,0.55)",
    transition: "background 0.15s ease, border-color 0.15s ease",
  };
}

function CoachCard({ coach }: { coach: CoachDirectoryEntry }) {
  const tags = coach.specializations.length > 0 ? coach.specializations : ["Généraliste"];

  return (
    <div className="ep-card" style={{ padding: 20 }}>
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        {coach.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coach.avatar_url}
            alt=""
            style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "1px solid rgba(224,30,30,0.25)" }}
          />
        ) : (
          <div
            style={{
              width: 52, height: 52, borderRadius: "50%", flexShrink: 0,
              background: "rgba(224,30,30,0.15)", border: "1px solid rgba(224,30,30,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 15, fontWeight: 800, color: "#F5EDED", textTransform: "uppercase",
            }}
          >
            {initials(coach.full_name)}
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#F5EDED" }}>
              {coach.full_name ?? "Coach"}
            </p>
            {coach.accepting_new_clients ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 700, color: "#4ade80" }}>
                <UserPlus size={11} /> Places dispo
              </span>
            ) : (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 700, color: "rgba(245,237,237,0.4)" }}>
                <UserX size={11} /> Complet
              </span>
            )}
          </div>

          {coach.bio && (
            <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "rgba(245,237,237,0.5)", lineHeight: 1.5 }}>
              {coach.bio}
            </p>
          )}

          {coach.instagram_handle && (
            <p style={{ margin: "6px 0 0", fontSize: 11.5, color: "rgba(245,237,237,0.35)", display: "flex", alignItems: "center", gap: 4 }}>
              <AtSign size={11} /> {coach.instagram_handle}
            </p>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
            {tags.map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: 10, fontWeight: 700, padding: "4px 9px", borderRadius: 999,
                  background: "rgba(245,237,237,0.06)", color: "rgba(245,237,237,0.5)",
                  border: "1px solid rgba(245,237,237,0.1)",
                }}
              >
                {tag}
              </span>
            ))}
          </div>

          <div style={{ marginTop: 14 }}>
            {coach.accepting_new_clients ? (
              <Link
                href={`/auth/client?coach=${coach.invite_code}`}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  background: "#E01E1E", color: "#fff", padding: "10px 18px", borderRadius: "var(--radius-lg)",
                  fontWeight: 800, fontSize: 12.5, letterSpacing: "0.02em", textDecoration: "none",
                }}
              >
                Commencer avec {coach.full_name?.split(" ")[0] ?? "ce coach"}
              </Link>
            ) : (
              <p style={{ margin: 0, fontSize: 11.5, color: "rgba(245,237,237,0.35)" }}>
                Complet pour le moment — inscris-toi et rejoins sa liste d&apos;attente depuis ton espace membre.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
