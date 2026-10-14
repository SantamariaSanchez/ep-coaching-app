"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ArrowRight, Check, ChevronLeft, ExternalLink, Mic, PenLine, Video, Image as ImageIcon,
  MessageSquareText, Dumbbell, Apple, Send, Loader2, X,
} from "lucide-react";
import { useT } from "@/components/i18n/I18nProvider";
import type { CheckIn } from "@/utils/checkins";
import { replyToCheckin, attachCoachVideoLink, attachCoachAudio } from "@/app/dashboard/coach/clients/[id]/checkins/actions";
import { createClientSupabase } from "@/lib/supabase-client";
import VoiceNoteRecorder from "@/components/coach/VoiceNoteRecorder";
import { resolveVideoEmbed } from "@/lib/video-embed-utils";
import { CHECKIN_RETURN_KEY } from "@/components/coach/CheckinReturnBar";

export interface ReviewProgram {
  name: string;
  objective: string | null;
  days: { label: string; exercises: { name: string; sets: number | null; reps: string | null; rir: number | null; technique: string | null }[] }[];
}
export interface ReviewDiet {
  name: string;
  totals: { kcal: number; p: number; c: number; f: number } | null;
  meals: { slot: string; foods: { name: string; grams: number }[] }[];
}

type Tool = "loom" | "screenpal" | "vocal" | "ecrit";
const TOOL_KEY = "ep-checkin-tool";
const TOOLS: { id: Tool; label: string; hint: string; url?: string }[] = [
  { id: "loom", label: "Loom", hint: "Enregistre ton écran, puis colle le lien à la fin", url: "https://www.loom.com/looms/videos" },
  { id: "screenpal", label: "ScreenPal", hint: "Enregistre ton écran, puis colle le lien à la fin", url: "https://screenpal.com/" },
  { id: "vocal", label: "Message vocal", hint: "Tu parles, l'appli enregistre seulement ta voix" },
  { id: "ecrit", label: "Écrit", hint: "Un retour écrit, sans enregistrement" },
];

const STEPS = [
  { key: "start", label: "Démarrer", icon: PenLine },
  { key: "videos", label: "Vidéos", icon: Video },
  { key: "photos", label: "Photos", icon: ImageIcon },
  { key: "answers", label: "Réponses", icon: MessageSquareText },
  { key: "program", label: "Programme", icon: Dumbbell },
  { key: "diet", label: "Diète", icon: Apple },
  { key: "send", label: "Envoyer", icon: Send },
] as const;

const QUESTIONS: { key: keyof CheckIn; label: string }[] = [
  { key: "attitude_explanation", label: "Pourquoi cette note d'attitude" },
  { key: "training_review", label: "Performances à l'entraînement" },
  { key: "work_impact", label: "Événements qui ont impacté la semaine" },
  { key: "improvement_reflection", label: "Comment améliorer la semaine prochaine" },
  { key: "entourage_support", label: "L'entourage aide ou complique" },
  { key: "upcoming_obstacles", label: "Événements prévus la semaine prochaine" },
  { key: "plan_adherence_feedback", label: "Ressenti sur le plan et l'accompagnement" },
  { key: "physique_feeling", label: "Ressenti physique" },
  { key: "energy_mood", label: "Énergie et moral" },
  { key: "nutrition_review", label: "Nutrition" },
  { key: "digestion_review", label: "Digestion" },
  { key: "sleep_review", label: "Sommeil" },
  { key: "client_notes", label: "Notes" },
  { key: "additional_notes", label: "Autre chose à dire" },
];

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" }).format(new Date(iso));
}

const card: React.CSSProperties = {
  background: "var(--ep-card, rgba(var(--ep-shade-rgb),0.35))",
  border: "1px solid rgba(var(--ep-line-rgb),0.25)",
  borderRadius: 14,
  padding: 16,
};
const btnPrimary: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 48, padding: "0 20px",
  borderRadius: 12, border: "none", background: "var(--ep-accent)", color: "#FFFFFF", fontWeight: 800, fontSize: 14, cursor: "pointer",
};
const btnGhost: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 48, padding: "0 18px",
  borderRadius: 12, border: "1px solid rgba(var(--ep-line-rgb),0.4)", background: "transparent", color: "var(--ep-ink)", fontWeight: 700, fontSize: 14, cursor: "pointer", textDecoration: "none",
};

export default function CheckinReview({
  clientId, clientName, checkin, previous, program, diet, initialStep,
}: {
  clientId: string;
  clientName: string;
  checkin: CheckIn;
  previous: CheckIn | null;
  program: ReviewProgram | null;
  diet: ReviewDiet | null;
  initialStep: number;
}) {
  const t = useT();
  const router = useRouter();
  const firstName = clientName.split(" ")[0] || clientName;
  const draftKey = `ep-checkin-draft:${checkin.id}`;
  const selfUrl = `/dashboard/coach/clients/${clientId}/checkins/${checkin.id}`;

  const [step, setStep] = useState(initialStep);
  const [tool, setTool] = useState<Tool | null>(null);
  const [message, setMessage] = useState(`${t("Merci pour ton check-in")} ${firstName} ! ${t("Voilà ton retour :")}`);
  const [link, setLink] = useState(checkin.coach_video_link ?? "");
  const [rating, setRating] = useState<string>(checkin.coach_rating ? String(checkin.coach_rating) : "");
  const [audioPath, setAudioPath] = useState<string | null>(checkin.coach_audio_path ?? null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [zoom, setZoom] = useState<string | null>(null);

  // Outil préféré et brouillon gardés : le coach peut partir modifier le
  // programme ou la diète et revenir sans rien perdre.
  /* eslint-disable react-hooks/set-state-in-effect -- hydratation depuis le stockage du navigateur, impossible dans un initialiseur useState (rendu serveur). */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(TOOL_KEY) as Tool | null;
      if (saved && TOOLS.some((x) => x.id === saved)) setTool(saved);
      const draft = JSON.parse(sessionStorage.getItem(draftKey) ?? "null") as { message?: string; link?: string; rating?: string } | null;
      if (draft?.message) setMessage(draft.message);
      if (draft?.link) setLink(draft.link);
      if (draft?.rating) setRating(draft.rating);
      sessionStorage.removeItem(CHECKIN_RETURN_KEY);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    try { sessionStorage.setItem(draftKey, JSON.stringify({ message, link, rating })); } catch {}
  }, [draftKey, message, link, rating]);

  useEffect(() => {
    const url = `${selfUrl}?etape=${step}`;
    window.history.replaceState(null, "", url);
    window.scrollTo({ top: 0 });
  }, [step, selfUrl]);

  function chooseTool(next: Tool) {
    setTool(next);
    try { localStorage.setItem(TOOL_KEY, next); } catch {}
    const target = TOOLS.find((x) => x.id === next);
    if (target?.url) window.open(target.url, "_blank", "noopener,noreferrer");
    setStep(1);
  }

  function goEdit(href: string, nextStep: number) {
    try {
      sessionStorage.setItem(CHECKIN_RETURN_KEY, JSON.stringify({ url: `${selfUrl}?etape=${nextStep}`, name: firstName }));
    } catch {}
    router.push(href);
  }

  async function handleAudio(blob: Blob) {
    const supabase = createClientSupabase();
    const ext = blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm";
    const path = `${clientId}/${checkin.id}-vocal-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("coach-videos").upload(path, blob, { contentType: blob.type || "audio/webm", upsert: false });
    if (upErr) throw upErr;
    const res = await attachCoachAudio(checkin.id, clientId, path);
    if (res.error) throw new Error(res.error);
    setAudioPath(path);
  }

  function send() {
    setError(null);
    const cleanLink = link.trim();
    if (cleanLink && !resolveVideoEmbed(cleanLink)) {
      setError(t("Ce lien ne ressemble pas à un lien vidéo."));
      return;
    }
    if (!message.trim() && !cleanLink && !audioPath) {
      setError(t("Ajoute ton lien, un vocal ou un message avant d'envoyer."));
      return;
    }
    startTransition(async () => {
      if (cleanLink && cleanLink !== checkin.coach_video_link) {
        const res = await attachCoachVideoLink(checkin.id, clientId, cleanLink);
        if (res.error) {
          setError(res.error);
          return;
        }
      }
      const fd = new FormData();
      fd.set("checkin_id", checkin.id);
      fd.set("client_id", clientId);
      fd.set("coach_notes", message.trim());
      if (rating) fd.set("coach_rating", rating);
      const res = await replyToCheckin(null, fd);
      if (res && "error" in res) {
        setError(res.error);
        return;
      }
      try { sessionStorage.removeItem(draftKey); } catch {}
      router.push(`/dashboard/coach/clients/${clientId}/checkins?envoye=1`);
    });
  }

  const videos = checkin.video_items ?? [];
  const metrics = useMemo(() => {
    const out: { label: string; value: string }[] = [];
    if (checkin.weight != null) out.push({ label: t("Poids fin de semaine"), value: `${checkin.weight} kg` });
    if (checkin.weight_avg != null) out.push({ label: t("Poids moyen"), value: `${checkin.weight_avg} kg` });
    if (previous?.weight_avg != null && checkin.weight_avg != null) {
      const d = Math.round((checkin.weight_avg - previous.weight_avg) * 10) / 10;
      out.push({ label: t("Évolution"), value: `${d > 0 ? "+" : ""}${d} kg` });
    }
    if (checkin.attitude_rating != null) out.push({ label: t("Attitude"), value: `${checkin.attitude_rating}/10` });
    if (checkin.nutrition_adherence != null) out.push({ label: t("Adhérence diète"), value: `${checkin.nutrition_adherence} %` });
    if (checkin.steps_per_day != null) out.push({ label: t("Pas / jour"), value: `${checkin.steps_per_day}` });
    if (checkin.sleep_hours != null) out.push({ label: t("Sommeil"), value: `${checkin.sleep_hours} h` });
    return out;
  }, [checkin, previous, t]);

  const wins = [checkin.biggest_win, checkin.biggest_win_2, checkin.biggest_win_3].filter(Boolean) as string[];
  const answers = QUESTIONS.map((q) => ({ label: q.label, value: checkin[q.key] as string | null })).filter((a) => typeof a.value === "string" && a.value.trim());

  const isLast = step === STEPS.length - 1;

  return (
    <div className="page-transition" style={{ maxWidth: 980, margin: "0 auto", padding: "20px 16px 140px" }}>
      {/* En-tête */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <Link href={`/dashboard/coach/clients/${clientId}/checkins`} aria-label={t("Retour aux check-ins")} style={{ ...btnGhost, minHeight: 40, width: 40, padding: 0 }}>
          <ChevronLeft size={18} />
        </Link>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(var(--ep-ink-rgb),0.45)" }}>
            {t("Check-in de la semaine du")} {formatDate(checkin.week_start)}
          </p>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "var(--ep-strong)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{clientName}</h1>
        </div>
        {tool && tool !== "ecrit" && step > 0 && step < 6 && (
          <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 800, color: "var(--ep-accent)" }}>
            <span className="animate-pulse" style={{ width: 8, height: 8, borderRadius: 999, background: "var(--ep-accent)" }} />
            {tool === "vocal" ? t("Vocal à la fin") : t("Enregistrement en cours")}
          </span>
        )}
      </div>

      {/* Étapes */}
      <nav aria-label={t("Étapes du check-in")} style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 6, marginBottom: 16, scrollbarWidth: "none" }}>
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const active = i === step;
          const done = i < step;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setStep(i)}
              aria-current={active ? "step" : undefined}
              style={{
                flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 6, minHeight: 36, padding: "0 12px", borderRadius: 999, cursor: "pointer",
                border: active ? "1px solid var(--ep-accent)" : "1px solid rgba(var(--ep-line-rgb),0.3)",
                background: active ? "rgba(var(--ep-accent-rgb),0.15)" : "transparent",
                color: active ? "var(--ep-strong)" : done ? "var(--ep-ok)" : "rgba(var(--ep-ink-rgb),0.55)",
                fontSize: 12, fontWeight: 800,
              }}
            >
              {done ? <Check size={13} /> : <Icon size={13} />} {t(s.label)}
            </button>
          );
        })}
      </nav>

      {/* 0. Démarrer */}
      {step === 0 && (
        <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={card}>
            <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 900, color: "var(--ep-strong)" }}>{t("Comment tu fais ton retour ?")}</h2>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: "rgba(var(--ep-ink-rgb),0.6)" }}>
              {t("Lance ton enregistrement, puis laisse-toi guider : vidéos, photos, réponses, programme, diète. À la fin, tu colles ton lien et tu envoies.")}
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
            {TOOLS.map((x) => (
              <button
                key={x.id}
                type="button"
                onClick={() => chooseTool(x.id)}
                style={{
                  ...card, textAlign: "left", cursor: "pointer", display: "flex", flexDirection: "column", gap: 6, minHeight: 96,
                  borderColor: tool === x.id ? "var(--ep-accent)" : "rgba(var(--ep-line-rgb),0.25)",
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 900, color: "var(--ep-strong)" }}>
                  {x.id === "vocal" ? <Mic size={16} /> : x.id === "ecrit" ? <PenLine size={16} /> : <Video size={16} />}
                  {x.label}
                  {x.url && <ExternalLink size={13} style={{ opacity: 0.5 }} />}
                </span>
                <span style={{ fontSize: 12, lineHeight: 1.45, color: "rgba(var(--ep-ink-rgb),0.55)" }}>{t(x.hint)}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 1. Vidéos d'exécution */}
      {step === 1 && (
        <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {videos.length === 0 && !checkin.video_drive_link && (
            <div style={card}><p style={{ margin: 0, fontSize: 13, color: "rgba(var(--ep-ink-rgb),0.6)" }}>{t("Pas de vidéo d'exécution cette semaine.")}</p></div>
          )}
          {videos.map((v, i) => (
            <div key={i} style={card}>
              <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 800, color: "var(--ep-strong)" }}>
                {v.label || `${t("Vidéo")} ${i + 1}`}
              </p>
              <video src={v.url} controls playsInline preload="metadata" style={{ width: "100%", maxHeight: "70vh", borderRadius: 10, background: "#000" }} />
            </div>
          ))}
          {checkin.video_drive_link && (
            <a href={checkin.video_drive_link} target="_blank" rel="noopener noreferrer" style={{ ...btnGhost, justifyContent: "flex-start" }}>
              <ExternalLink size={15} /> {t("Ouvrir le lien vidéo envoyé par")} {firstName}
            </a>
          )}
        </section>
      )}

      {/* 2. Photos */}
      {step === 2 && (
        <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {checkin.photo_urls.length === 0 ? (
            <div style={card}><p style={{ margin: 0, fontSize: 13, color: "rgba(var(--ep-ink-rgb),0.6)" }}>{t("Pas de photo cette semaine.")}</p></div>
          ) : (
            checkin.photo_urls.map((url, i) => {
              const before = previous?.photo_urls[i] ?? null;
              return (
                <div key={i} style={{ ...card, padding: 10 }}>
                  {/* Sur ordi, les deux photos tiennent dans l'écran sans défiler. */}
                  <div style={{ display: "grid", gridTemplateColumns: before ? "1fr 1fr" : "1fr", gap: 8, maxWidth: before ? 620 : 310, margin: "0 auto" }}>
                    {before && (
                      <figure style={{ margin: 0 }}>
                        <button type="button" onClick={() => setZoom(before)} style={{ padding: 0, border: "none", background: "none", width: "100%", cursor: "zoom-in" }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={before} alt={t("Photo précédente")} style={{ width: "100%", aspectRatio: "3 / 4", objectFit: "cover", borderRadius: 10, background: "#000" }} />
                        </button>
                        <figcaption style={{ fontSize: 11, fontWeight: 700, color: "rgba(var(--ep-ink-rgb),0.5)", marginTop: 4 }}>{formatDate(previous!.week_start)}</figcaption>
                      </figure>
                    )}
                    <figure style={{ margin: 0 }}>
                      <button type="button" onClick={() => setZoom(url)} style={{ padding: 0, border: "none", background: "none", width: "100%", cursor: "zoom-in" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={t("Photo de cette semaine")} style={{ width: "100%", aspectRatio: "3 / 4", objectFit: "cover", borderRadius: 10, background: "#000" }} />
                      </button>
                      <figcaption style={{ fontSize: 11, fontWeight: 800, color: "var(--ep-accent)", marginTop: 4 }}>{t("Cette semaine")}</figcaption>
                    </figure>
                  </div>
                </div>
              );
            })
          )}
        </section>
      )}

      {/* 3. Réponses */}
      {step === 3 && (
        <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {metrics.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8 }}>
              {metrics.map((m) => (
                <div key={m.label} style={{ ...card, padding: 12 }}>
                  <p style={{ margin: 0, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(var(--ep-ink-rgb),0.45)" }}>{m.label}</p>
                  <p style={{ margin: "4px 0 0", fontSize: 18, fontWeight: 900, color: "var(--ep-strong)" }}>{m.value}</p>
                </div>
              ))}
            </div>
          )}
          {wins.length > 0 && (
            <div style={card}>
              <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 800, color: "var(--ep-ok)" }}>{t("Ses victoires de la semaine")}</p>
              <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
                {wins.map((w, i) => <li key={i} style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ep-ink)" }}>{w}</li>)}
              </ul>
            </div>
          )}
          {answers.map((a) => (
            <div key={a.label} style={card}>
              <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 800, color: "rgba(var(--ep-ink-rgb),0.55)" }}>{t(a.label)}</p>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "var(--ep-ink)", whiteSpace: "pre-wrap" }}>{a.value}</p>
            </div>
          ))}
          {answers.length === 0 && wins.length === 0 && (
            <div style={card}><p style={{ margin: 0, fontSize: 13, color: "rgba(var(--ep-ink-rgb),0.6)" }}>{t("Pas de réponse écrite cette semaine.")}</p></div>
          )}
        </section>
      )}

      {/* 4. Programme */}
      {step === 4 && (
        <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {!program ? (
            <div style={card}><p style={{ margin: 0, fontSize: 13, color: "rgba(var(--ep-ink-rgb),0.6)" }}>{t("Pas de programme actif.")}</p></div>
          ) : (
            <>
              <div style={card}>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: "var(--ep-strong)" }}>{program.name}</p>
                {program.objective && <p style={{ margin: "4px 0 0", fontSize: 13, color: "rgba(var(--ep-ink-rgb),0.6)" }}>{program.objective}</p>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
                {program.days.map((d) => (
                  <div key={d.label} style={card}>
                    <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 900, color: "var(--ep-accent)" }}>{d.label}</p>
                    <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
                      {d.exercises.map((e, i) => (
                        <li key={i} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 13, color: "var(--ep-ink)" }}>
                          <span style={{ minWidth: 0 }}>{e.name}{e.technique ? <span style={{ color: "rgba(var(--ep-ink-rgb),0.5)" }}> · {e.technique}</span> : null}</span>
                          <span style={{ flexShrink: 0, fontWeight: 700, color: "rgba(var(--ep-ink-rgb),0.65)" }}>
                            {e.sets ?? "?"}×{e.reps ?? "?"}{e.rir != null ? ` · RIR ${e.rir}` : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </>
          )}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="button" onClick={() => goEdit(`/dashboard/coach/clients/${clientId}/program/edit`, 5)} style={btnGhost}>
              <PenLine size={15} /> {t("Modifier le programme")}
            </button>
            <button type="button" onClick={() => setStep(5)} style={{ ...btnGhost, borderColor: "rgba(var(--ep-ok-rgb),0.5)", color: "var(--ep-ok)" }}>
              <Check size={15} /> {t("Tout est bon")}
            </button>
          </div>
        </section>
      )}

      {/* 5. Diète */}
      {step === 5 && (
        <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {!diet ? (
            <div style={card}><p style={{ margin: 0, fontSize: 13, color: "rgba(var(--ep-ink-rgb),0.6)" }}>{t("Pas de diète active.")}</p></div>
          ) : (
            <>
              <div style={card}>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: "var(--ep-strong)" }}>{diet.name}</p>
                {diet.totals && (
                  <p style={{ margin: "6px 0 0", fontSize: 13, fontWeight: 700, color: "rgba(var(--ep-ink-rgb),0.7)" }}>
                    {diet.totals.kcal} kcal · P {diet.totals.p} g · G {diet.totals.c} g · L {diet.totals.f} g
                  </p>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
                {diet.meals.map((m) => (
                  <div key={m.slot} style={card}>
                    <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 900, color: "var(--ep-accent)" }}>{m.slot}</p>
                    <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
                      {m.foods.map((f, i) => (
                        <li key={i} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 13, color: "var(--ep-ink)" }}>
                          <span style={{ minWidth: 0 }}>{f.name}</span>
                          <span style={{ flexShrink: 0, fontWeight: 700, color: "rgba(var(--ep-ink-rgb),0.65)" }}>{f.grams} g</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </>
          )}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="button" onClick={() => goEdit(`/dashboard/coach/clients/${clientId}/nutrition`, 6)} style={btnGhost}>
              <PenLine size={15} /> {t("Modifier la diète")}
            </button>
            <button type="button" onClick={() => setStep(6)} style={{ ...btnGhost, borderColor: "rgba(var(--ep-ok-rgb),0.5)", color: "var(--ep-ok)" }}>
              <Check size={15} /> {t("Tout est bon")}
            </button>
          </div>
        </section>
      )}

      {/* 6. Envoyer */}
      {step === 6 && (
        <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {(tool === "loom" || tool === "screenpal" || link) && (
            <div style={card}>
              <label htmlFor="ck-link" style={{ display: "block", fontSize: 13, fontWeight: 800, color: "var(--ep-strong)", marginBottom: 8 }}>
                {t("Arrête ton enregistrement et colle le lien")}
              </label>
              <input
                id="ck-link"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                inputMode="url"
                placeholder={tool === "screenpal" ? "https://go.screenpal.com/watch/..." : "https://www.loom.com/share/..."}
                style={{ width: "100%", minHeight: 48, background: "rgba(var(--ep-shade-rgb),0.45)", border: "1px solid rgba(var(--ep-line-rgb),0.35)", borderRadius: 10, padding: "0 14px", fontSize: 14, color: "var(--ep-ink)", outline: "none" }}
              />
            </div>
          )}
          {(tool === "vocal" || audioPath) && (
            <div style={card}>
              <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 800, color: "var(--ep-strong)" }}>{t("Ton message vocal")}</p>
              {audioPath ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ep-ok)" }}>{t("✓ Vocal joint")}</span>
                  <button type="button" onClick={async () => { const r = await attachCoachAudio(checkin.id, clientId, null); if (!r.error) setAudioPath(null); }} style={{ background: "none", border: "none", color: "rgba(var(--ep-ink-rgb),0.5)", fontSize: 12, fontWeight: 700, textDecoration: "underline", cursor: "pointer", minHeight: 40 }}>
                    {t("Refaire")}
                  </button>
                </div>
              ) : (
                <VoiceNoteRecorder onSend={handleAudio} />
              )}
            </div>
          )}
          <div style={card}>
            <label htmlFor="ck-msg" style={{ display: "block", fontSize: 13, fontWeight: 800, color: "var(--ep-strong)", marginBottom: 8 }}>{t("Ton message")}</label>
            <textarea
              id="ck-msg"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              style={{ width: "100%", background: "rgba(var(--ep-shade-rgb),0.45)", border: "1px solid rgba(var(--ep-line-rgb),0.35)", borderRadius: 10, padding: "12px 14px", fontSize: 14, lineHeight: 1.5, color: "var(--ep-ink)", outline: "none", resize: "vertical" }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
              <label htmlFor="ck-rating" style={{ fontSize: 12, fontWeight: 700, color: "rgba(var(--ep-ink-rgb),0.6)" }}>{t("Note de la semaine")}</label>
              <select
                id="ck-rating"
                value={rating}
                onChange={(e) => setRating(e.target.value)}
                style={{ minHeight: 40, background: "rgba(var(--ep-shade-rgb),0.45)", border: "1px solid rgba(var(--ep-line-rgb),0.35)", borderRadius: 10, padding: "0 10px", fontSize: 14, color: "var(--ep-ink)" }}
              >
                <option value="">{t("Aucune")}</option>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}/10</option>)}
              </select>
            </div>
          </div>
          {error && <p role="alert" style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--ep-pink)" }}>{error}</p>}
          <button type="button" onClick={send} disabled={pending} style={{ ...btnPrimary, width: "100%", opacity: pending ? 0.7 : 1 }}>
            {pending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {pending ? t("Envoi…") : `${t("Envoyer le retour à")} ${firstName}`}
          </button>
          <p style={{ margin: 0, fontSize: 12, textAlign: "center", color: "rgba(var(--ep-ink-rgb),0.5)" }}>
            {firstName} {t("reçoit une notification et un e-mail tout de suite.")}
          </p>
        </section>
      )}

      {/* Navigation bas d'écran */}
      {step > 0 && !isLast && (
        <div style={{ position: "fixed", left: 0, right: 0, bottom: "calc(env(safe-area-inset-bottom, 0px) + 72px)", zIndex: 50, display: "flex", justifyContent: "center", padding: "0 12px", pointerEvents: "none" }}>
          <div style={{ display: "flex", gap: 8, width: "100%", maxWidth: 560, pointerEvents: "auto" }}>
            <button type="button" onClick={() => setStep((s) => Math.max(0, s - 1))} aria-label={t("Étape précédente")} style={{ ...btnGhost, background: "var(--ep-bg)", width: 52, padding: 0 }}>
              <ArrowLeft size={18} />
            </button>
            <button type="button" onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))} style={{ ...btnPrimary, flex: 1, boxShadow: "0 10px 30px rgba(0,0,0,0.3)" }}>
              {t(STEPS[step + 1].label)} <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {zoom && (
        <div role="dialog" aria-modal="true" onClick={() => setZoom(null)} style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoom} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 8 }} />
          <button type="button" onClick={() => setZoom(null)} aria-label={t("Fermer")} style={{ position: "absolute", top: 16, right: 16, width: 44, height: 44, borderRadius: 999, border: "none", background: "rgba(255,255,255,0.15)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
