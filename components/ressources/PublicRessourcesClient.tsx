"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, FileText, Download, Heart } from "lucide-react";
import { createClientSupabase } from "@/lib/supabase-client";
import type { ResourceItem } from "@/utils/resources";
import SignupGateModal from "@/components/ressources/SignupGateModal";

const FREE_PREVIEW_SECONDS = 60;

export default function PublicRessourcesClient({
  resources,
  initialQuery,
}: {
  resources: ResourceItem[];
  initialQuery: string;
}) {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(FREE_PREVIEW_SECONDS);
  const [manualOpen, setManualOpen] = useState(false);
  const [search, setSearch] = useState(initialQuery);

  // Logged-in members browse freely — no timer, no gate.
  useEffect(() => {
    const sb = createClientSupabase();
    sb.auth.getUser().then(({ data: { user } }) => setIsLoggedIn(!!user));
  }, []);

  // Pure countdown — never sets showModal directly, so it stays derived
  // below instead of synced via a second effect.
  useEffect(() => {
    if (isLoggedIn !== false || secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [isLoggedIn, secondsLeft]);

  const showModal = isLoggedIn === false && (secondsLeft <= 0 || manualOpen);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return resources;
    return resources.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        (r.description ?? "").toLowerCase().includes(q)
    );
  }, [resources, search]);

  const showGate = isLoggedIn === false;

  return (
    <div className="page-transition" style={{ minHeight: "100vh" }}>
      {showGate && (
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 40,
            background: "#cc0000",
            color: "#fff",
            padding: "10px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          <span style={{ letterSpacing: "0.04em" }}>
            Accès libre — {secondsLeft}s
          </span>
          <button
            onClick={() => setManualOpen(true)}
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.35)",
              borderRadius: 999,
              color: "#fff",
              fontSize: 11,
              fontWeight: 700,
              padding: "4px 12px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <Heart size={11} /> Rejoindre la communauté
          </button>
        </div>
      )}

      <div className="px-6 py-8 max-w-2xl mx-auto pb-24">
        <div className="mb-6">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
            EP Coaching
          </p>
          <h1 className="text-3xl font-black uppercase tracking-tight">Ressources</h1>
        </div>

        <div className="relative mb-5">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#F5EDED]/30" strokeWidth={1.8} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une ressource..."
            className="w-full bg-[#1f0101] border border-[#890404]/25 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-[#F5EDED]/25 focus:outline-none focus:border-[#E01E1E]/40"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="bg-[#1f0101] border border-dashed border-[#890404]/25 rounded-xl py-16 text-center">
            <FileText size={26} className="text-[#F5EDED]/15 mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-sm text-[#F5EDED]/35">Aucune ressource ne correspond à ta recherche.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((r) => (
              <a
                key={r.id}
                href={r.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 bg-[#1f0101] border border-[#890404]/20 hover:border-[#890404]/40 rounded-xl px-4 py-3.5 transition-colors group"
              >
                <div className="w-9 h-9 rounded-lg bg-[#890404]/10 flex items-center justify-center flex-shrink-0">
                  <FileText size={15} className="text-[#890404]" strokeWidth={1.8} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{r.title}</p>
                  {r.description && (
                    <p className="text-[10px] text-[#F5EDED]/35 truncate">{r.description}</p>
                  )}
                </div>
                <Download
                  size={15}
                  className="text-[#F5EDED]/25 group-hover:text-[#F5EDED]/50 transition-colors flex-shrink-0"
                  strokeWidth={1.8}
                />
              </a>
            ))}
          </div>
        )}
      </div>

      {showModal && <SignupGateModal />}
    </div>
  );
}
