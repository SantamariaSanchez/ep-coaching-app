"use client";

import { useState } from "react";
import { Loader2, AlertCircle, X, ArrowLeft, ArrowRight, Check } from "lucide-react";
import { LIVE_TYPE_LABELS, LIVE_TYPE_INFO, isOneToOneType, type LiveType } from "@/lib/live-types";
import { LIVE_TYPE_ICONS } from "@/components/live/live-icons";
import type { CreateLiveEventInput } from "@/app/dashboard/coach/live/actions";

const inputCls =
  "w-full bg-[#150000] border border-[#890404]/30 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-[#F5EDED]/25 focus:outline-none focus:border-[#E01E1E]/60 transition-colors";

const TYPE_ORDER: LiveType[] = [
  "1to1", "audit", "checkin_hebdo", "acces_direct", "atelier", "webinaire", "qna",
];

// Flow séquentiel en 3 étapes. Auparavant le choix du type ouvrait un
// formulaire unique qui rouvrait un <select> de tous les types : le choix
// n'était jamais vraiment figé, et rien ne permettait de revenir en arrière.
// Chaque étape est désormais un écran distinct, avec un retour en haut qui
// conserve tout ce qui a déjà été saisi.
const STEPS = ["Type", "Sujet", "Créneau"] as const;

export default function LiveScheduler({
  clients,
  onCreate,
}: {
  clients: { id: string; full_name: string | null }[];
  onCreate: (input: CreateLiveEventInput) => Promise<{ error?: string; id?: string }>;
}) {
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<LiveType | null>(null);
  const [clientId, setClientId] = useState("");
  const [guestName, setGuestName] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("30");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function chooseType(t: LiveType) {
    setType(t);
    setDuration(String(LIVE_TYPE_INFO[t].defaultDuration));
    setError(null);
    setStep(1);
  }

  function resetAll() {
    setStep(0);
    setType(null);
    setTitle("");
    setDescription("");
    setClientId("");
    setGuestName("");
    setDate("");
    setTime("");
    setError(null);
  }

  function goBack() {
    setError(null);
    setStep((s) => Math.max(0, s - 1));
  }

  function goNextFromSujet() {
    if (!type) return;
    if (isOneToOneType(type) && !clientId) {
      setError("Choisis le client concerné par ce live.");
      return;
    }
    if (!title.trim()) {
      setError("Donne un titre ou un sujet à ce live.");
      return;
    }
    setError(null);
    setStep(2);
  }

  async function handleSubmit() {
    if (!type) return;
    if (!date || !time) {
      setError("La date et l'heure sont requises.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const startsAt = new Date(`${date}T${time}:00`).toISOString();
    const res = await onCreate({
      title,
      description,
      type,
      invitedClientId: isOneToOneType(type) ? clientId || null : null,
      guestName: type === "atelier" ? guestName.trim() || null : null,
      startsAt,
      durationMinutes: parseInt(duration) || 30,
    });
    setSubmitting(false);
    if (res.error) {
      setError(res.error);
    } else {
      resetAll();
    }
  }

  // ── Étape 1 : choix du type ────────────────────────────────────────────────
  if (step === 0 || !type) {
    return (
      <div className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-3">
          Programmer un live · étape 1 sur 3 : quel format ?
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
          {TYPE_ORDER.map((t) => {
            const Icon = LIVE_TYPE_ICONS[t];
            const info = LIVE_TYPE_INFO[t];
            return (
              <button
                key={t}
                onClick={() => chooseType(t)}
                className="ep-card"
                style={{
                  padding: "14px 12px",
                  textAlign: "left",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  cursor: "pointer",
                }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: 9,
                  background: "rgba(224,30,30,0.1)", border: "1px solid rgba(224,30,30,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Icon size={15} style={{ color: "#E01E1E" }} strokeWidth={1.8} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: "#F5EDED" }}>
                    {LIVE_TYPE_LABELS[t]}
                  </p>
                  <p style={{ margin: "2px 0 0", fontSize: 10.5, color: "rgba(245,237,237,0.4)", lineHeight: 1.4 }}>
                    {info.tagline}
                  </p>
                  <p style={{ margin: "6px 0 0", fontSize: 9.5, fontWeight: 700, color: "rgba(224,30,30,0.55)", lineHeight: 1.4, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                    {info.cadence}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const TypeIcon = LIVE_TYPE_ICONS[type];
  const info = LIVE_TYPE_INFO[type];

  return (
    <div className="bg-[#1f0101] border border-[#890404]/25 rounded-xl p-5 mb-6">
      {/* Barre d'étape : retour toujours visible en haut */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={goBack}
          aria-label="Revenir à l'étape précédente"
          className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#F5EDED]/45 hover:text-[#F5EDED] transition-colors shrink-0"
        >
          <ArrowLeft size={14} /> Retour
        </button>
        <div className="flex items-center gap-1.5 flex-1 justify-center">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-1.5">
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: i === step ? "#E01E1E" : i < step ? "rgba(245,237,237,0.5)" : "rgba(245,237,237,0.22)",
                }}
              >
                {label}
              </span>
              {i < STEPS.length - 1 && (
                <span style={{
                  width: 14, height: 1,
                  background: i < step ? "rgba(224,30,30,0.5)" : "rgba(245,237,237,0.12)",
                  display: "inline-block",
                }} />
              )}
            </div>
          ))}
        </div>
        <button
          onClick={resetAll}
          aria-label="Annuler la création du live"
          className="text-[#F5EDED]/30 hover:text-white transition-colors shrink-0"
        >
          <X size={14} />
        </button>
      </div>

      {/* Type choisi, figé — on le change en revenant à l'étape 1 */}
      <div className="flex items-center gap-3 mb-4 bg-[#150000] border border-[#890404]/25 rounded-lg px-3 py-2.5">
        <div style={{
          width: 30, height: 30, borderRadius: 9, flexShrink: 0,
          background: "rgba(224,30,30,0.1)", border: "1px solid rgba(224,30,30,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <TypeIcon size={14} style={{ color: "#E01E1E" }} strokeWidth={1.8} />
        </div>
        <div className="min-w-0 flex-1">
          <p style={{ margin: 0, fontSize: 12.5, fontWeight: 800, color: "#F5EDED" }}>
            {LIVE_TYPE_LABELS[type]}
          </p>
          <p style={{ margin: "1px 0 0", fontSize: 10.5, color: "rgba(245,237,237,0.4)" }}>
            {info.tagline}
          </p>
        </div>
        <button
          onClick={() => setStep(0)}
          className="text-[10px] font-bold uppercase tracking-wider text-[#E01E1E] hover:text-white transition-colors shrink-0"
        >
          Changer
        </button>
      </div>

      {/* ── Étape 2 : sujet et participants ─────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-3">
          <p style={{ margin: 0, fontSize: 11.5, color: "rgba(245,237,237,0.45)", lineHeight: 1.6 }}>
            {info.coachDescription}
          </p>

          {isOneToOneType(type) && (
            <div>
              <p className="ep-label" style={{ marginBottom: 6 }}>Client concerné</p>
              {clients.length === 0 ? (
                <p style={{ fontSize: 12, color: "rgba(245,237,237,0.35)", margin: 0 }}>
                  Aucun client actif pour l&apos;instant.
                </p>
              ) : (
                <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={inputCls}>
                  <option value="">Choisir un client</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.full_name ?? "Client"}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {type === "atelier" && (
            <div>
              <p className="ep-label" style={{ marginBottom: 6 }}>Intervenant invité (optionnel)</p>
              <input
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Nom de l'intervenant" aria-label="Nom de l'intervenant"
                className={inputCls}
              />
            </div>
          )}

          <div>
            <p className="ep-label" style={{ marginBottom: 6 }}>Titre / sujet</p>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex : point sur la phase de sèche" aria-label="Ex : point sur la phase de sèche"
              className={inputCls}
            />
          </div>

          <div>
            <p className="ep-label" style={{ marginBottom: 6 }}>But / description (optionnel)</p>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ce que tu veux couvrir pendant ce live" aria-label="Ce que tu veux couvrir pendant ce live"
              rows={2}
              className={`${inputCls} resize-none`}
            />
          </div>

          <button
            onClick={goNextFromSujet}
            className="flex items-center gap-1.5 bg-[#E01E1E] hover:bg-[#B00202] text-white text-xs font-bold uppercase tracking-widest px-4 py-2.5 rounded-lg transition-colors"
          >
            Continuer <ArrowRight size={13} />
          </button>
        </div>
      )}

      {/* ── Étape 3 : créneau ───────────────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-3">
          <div className="bg-[#150000] border border-[#890404]/20 rounded-lg px-3 py-2.5">
            <p className="ep-label" style={{ marginBottom: 3 }}>Récapitulatif</p>
            <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: "#F5EDED" }}>{title}</p>
            {isOneToOneType(type) && (
              <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(245,237,237,0.42)" }}>
                Avec {clients.find((c) => c.id === clientId)?.full_name ?? "un client"}
              </p>
            )}
            {type === "atelier" && guestName.trim() && (
              <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(245,237,237,0.42)" }}>
                Intervenant : {guestName.trim()}
              </p>
            )}
          </div>

          <div>
            <p className="ep-label" style={{ marginBottom: 6 }}>Date, heure et durée</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputCls} />
              <select value={duration} onChange={(e) => setDuration(e.target.value)} className={inputCls}>
                <option value="15">15 min</option>
                <option value="30">30 min</option>
                <option value="45">45 min</option>
                <option value="60">1h</option>
                <option value="90">1h30</option>
                <option value="120">2h</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-1.5 bg-[#E01E1E] hover:bg-[#B00202] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-widest px-4 py-2.5 rounded-lg transition-colors"
            >
              {submitting ? <Loader2 size={13} className="animate-spin" /> : <><Check size={13} /> Programmer</>}
            </button>
            <button onClick={resetAll} className="text-xs text-[#F5EDED]/40 hover:text-[#F5EDED]/70 transition-colors">
              Annuler
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-red-400 text-xs font-semibold mt-3">
          <AlertCircle size={12} /> {error}
        </div>
      )}
    </div>
  );
}
