"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Check, CheckCircle2, Loader2, X } from "lucide-react";
import { ONBOARDING_SECTIONS, type FieldDef, type SectionDef } from "@/lib/onboarding-intake-config";
import { submitOnboardingIntake } from "@/app/onboarding/intake/actions";
import { compressImage } from "@/lib/image-compress";

type Step =
  | { kind: "intro" }
  | { kind: "fields"; section: SectionDef; group: string[] }
  | { kind: "gym-photos" }
  | { kind: "physique-photos" }
  | { kind: "final" };

const inputCls =
  "w-full bg-black/30 border border-[#890404]/30 focus:border-[#E01E1E]/60 rounded-xl px-4 py-3 text-[15px] text-[#F5EDED] placeholder-[#7a5c5c] outline-none transition-colors";

// ── Brouillon local ──────────────────────────────────────────────────────
// Un questionnaire à 9 sections perdu d'un coup (page rechargée par l'OS,
// onglet déchargé pour libérer de la mémoire, connexion coupée...) est une
// perte de temps inacceptable pour le client. Les réponses texte (légères,
// sérialisables) sont sauvegardées à chaque changement et restaurées au
// montage — seules les photos ne survivent pas (un File ne se sérialise
// pas en localStorage), mais redemander 1 à 6 photos coûte infiniment
// moins cher que de refaire tout le questionnaire depuis le début.
const DRAFT_KEY = "ep-onboarding-draft-v1";

interface Draft {
  answers: Record<string, string>;
  stepIndex: number;
}

function loadDraft(): Draft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Draft>;
    if (!parsed || typeof parsed !== "object" || typeof parsed.answers !== "object") return null;
    return { answers: parsed.answers ?? {}, stepIndex: typeof parsed.stepIndex === "number" ? parsed.stepIndex : 0 };
  } catch {
    return null;
  }
}

function saveDraft(draft: Draft) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Stockage plein ou navigation privée — best-effort, pas bloquant.
  }
}

function clearDraft() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Ignoré volontairement.
  }
}

function FieldControl({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: string;
  onChange: (v: string) => void;
}) {
  if (field.type === "textarea") {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder ?? "Écris ta réponse ici..."}
        rows={4}
        className={inputCls}
        style={{ resize: "vertical", lineHeight: 1.5 }}
      />
    );
  }
  if (field.type === "radio") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {(field.options ?? []).map((opt) => {
          const checked = value === opt;
          return (
            <label
              key={opt}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 10,
                border: `1px solid ${checked ? "#E01E1E" : "rgba(255,255,255,0.1)"}`,
                background: checked ? "rgba(224,30,30,0.12)" : "rgba(255,255,255,0.02)",
                boxShadow: checked ? "0 0 0 1px #E01E1E" : "none",
                cursor: "pointer", fontSize: 13.5, fontWeight: 600, color: checked ? "#fff" : "#e8dede",
                transition: "border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease, color 0.15s ease",
              }}
            >
              <span style={{
                width: 14, height: 14, borderRadius: "50%", flexShrink: 0,
                border: `2px solid ${checked ? "#E01E1E" : "rgba(255,255,255,0.25)"}`,
                background: checked ? "#E01E1E" : "transparent",
                boxShadow: checked ? "0 0 10px rgba(224,30,30,0.8)" : "none",
              }} />
              <input type="radio" checked={checked} onChange={() => onChange(opt)} className="sr-only" style={{ display: "none" }} />
              {opt}
            </label>
          );
        })}
      </div>
    );
  }
  if (field.type === "scale") {
    const n = value ? parseInt(value) : 0;
    return (
      <div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {Array.from({ length: 10 }, (_, i) => i + 1).map((v) => {
            const checked = n === v;
            return (
              <button
                key={v}
                type="button"
                onClick={() => onChange(String(v))}
                style={{
                  width: 32, height: 32, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center",
                  border: `1px solid ${checked ? "#E01E1E" : "rgba(255,255,255,0.15)"}`,
                  background: checked ? "linear-gradient(135deg, #E01E1E, #890404)" : "rgba(255,255,255,0.02)",
                  color: checked ? "#fff" : "#ccb", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
                  boxShadow: checked ? "0 0 12px rgba(224,30,30,0.6)" : "none",
                }}
              >
                {v}
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: "#8a6a6a", marginTop: 6 }}>
          <span>Faible</span>
          <span>Élevé</span>
        </div>
      </div>
    );
  }
  return (
    <input
      type={field.type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder}
      className={inputCls}
    />
  );
}

function PhotoSlot({
  label,
  file,
  onPick,
  onClear,
}: {
  label: string;
  file: File | null;
  onPick: (f: File) => void;
  onClear: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  return (
    <div>
      {/*
        Pas de `capture="environment"` : ça force l'ouverture de l'appli
        appareil photo native sur mobile plutôt que de laisser le choix
        (galerie, fichiers, caméra). Or basculer vers l'appli caméra peut
        faire décharger l'onglet par l'OS (mémoire), et au retour la page
        recharge à zéro — tout le questionnaire déjà rempli disparaît avec
        elle. `accept="image/*"` seul propose le choix et reste dans un
        sélecteur léger qui ne quitte jamais vraiment la page.
      */}
      <input
        ref={ref}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          onPick(await compressImage(f));
        }}
      />
      {preview ? (
        <div style={{ position: "relative" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt={label} style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 12, border: "1px solid rgba(224,30,30,0.3)" }} />
          <button
            type="button"
            onClick={onClear}
            style={{
              position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: "50%",
              background: "rgba(0,0,0,0.7)", border: "none", color: "#fff", display: "flex",
              alignItems: "center", justifyContent: "center", cursor: "pointer",
            }}
          >
            <X size={13} />
          </button>
          <div style={{ position: "absolute", bottom: 6, left: 6, display: "flex", alignItems: "center", gap: 4, background: "rgba(74,222,128,0.15)", border: "1px solid rgba(74,222,128,0.4)", borderRadius: 999, padding: "2px 8px" }}>
            <Check size={10} style={{ color: "#4ade80" }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: "#4ade80" }}>{label}</span>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          style={{
            width: "100%", height: 140, borderRadius: 12, border: "1px dashed rgba(224,30,30,0.35)",
            background: "rgba(224,30,30,0.04)", display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", gap: 8, cursor: "pointer", color: "rgba(245,237,237,0.4)",
          }}
        >
          <Upload size={22} style={{ color: "#E01E1E" }} strokeWidth={1.6} />
          <span style={{ fontSize: 11.5, fontWeight: 700 }}>{label}</span>
        </button>
      )}
    </div>
  );
}

export default function ClientOnboardingIntake() {
  const router = useRouter();
  const [initialDraft] = useState(() => loadDraft());
  const [answers, setAnswers] = useState<Record<string, string>>(() => initialDraft?.answers ?? {});
  const [gymFiles, setGymFiles] = useState<File[]>([]);
  const [physiqueFiles, setPhysiqueFiles] = useState<{ face: File | null; profil: File | null; dos: File | null }>({
    face: null, profil: null, dos: null,
  });
  const [stepIndex, setStepIndex] = useState(() => initialDraft?.stepIndex ?? 0);
  const restoredFromDraft = !!initialDraft && initialDraft.stepIndex > 0;
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const gymInputRef = useRef<HTMLInputElement>(null);

  const steps = useMemo<Step[]>(() => {
    const s: Step[] = [{ kind: "intro" }];
    for (const section of ONBOARDING_SECTIONS) {
      if (section.conditional && !section.conditional(answers)) continue;
      if (section.key === "secI") continue; // inséré après les photos, plus bas
      for (const group of section.groups) s.push({ kind: "fields", section, group });
    }
    s.push({ kind: "gym-photos" });
    s.push({ kind: "physique-photos" });
    const finalSection = ONBOARDING_SECTIONS.find((sec) => sec.key === "secI");
    if (finalSection) for (const group of finalSection.groups) s.push({ kind: "fields", section: finalSection, group });
    s.push({ kind: "final" });
    return s;
  }, [answers]);

  // Filet de sécurité si un stepIndex restauré ne correspond plus à un index
  // valide (ex. sections conditionnelles recalculées différemment) — évite
  // un crash sur steps[stepIndex] undefined plutôt que de faire confiance
  // aveuglément à une valeur venue du localStorage.
  const safeStepIndex = Math.min(stepIndex, steps.length - 1);
  const current = steps[safeStepIndex];
  const totalCountable = steps.length - 2; // sans intro ni final
  const displayStep = Math.max(1, Math.min(safeStepIndex, totalCountable));
  const pct = Math.max(0, Math.min(100, (safeStepIndex / totalCountable) * 100));

  // Sauvegarde best-effort à chaque changement — un questionnaire abandonné
  // en cours de route (ex. le client ferme l'onglet) laisse un brouillon
  // qu'on retrouve à la prochaine visite de /onboarding/intake plutôt que
  // de reperdre le tout.
  useEffect(() => {
    saveDraft({ answers, stepIndex: safeStepIndex });
  }, [answers, safeStepIndex]);

  function setAnswer(key: string, value: string) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  function validateCurrent(): boolean {
    setFieldError(null);
    if (current.kind === "fields") {
      for (const key of current.group) {
        const field = current.section.fields[key];
        if (field.required && !answers[key]?.trim()) {
          setFieldError("Réponds à cette question pour continuer.");
          return false;
        }
      }
    }
    if (current.kind === "gym-photos" && gymFiles.length === 0) {
      setFieldError("Ajoute au moins une photo de ta salle pour continuer.");
      return false;
    }
    if (current.kind === "physique-photos" && (!physiqueFiles.face || !physiqueFiles.profil || !physiqueFiles.dos)) {
      setFieldError("Ajoute tes 3 photos (face, profil, dos) pour continuer.");
      return false;
    }
    return true;
  }

  function goNext() {
    if (!validateCurrent()) return;
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  }

  function goPrev() {
    setFieldError(null);
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  async function handleFinish() {
    if (!validateCurrent()) return;
    setSubmitting(true);
    setSubmitError(null);

    const fd = new FormData();
    for (const [k, v] of Object.entries(answers)) fd.set(k, v);
    gymFiles.forEach((f) => fd.append("gym_photos", f));
    if (physiqueFiles.face) fd.set("photo_face", physiqueFiles.face);
    if (physiqueFiles.profil) fd.set("photo_profil", physiqueFiles.profil);
    if (physiqueFiles.dos) fd.set("photo_dos", physiqueFiles.dos);

    const res = await submitOnboardingIntake(fd);
    setSubmitting(false);
    if (res.error) {
      setSubmitError(res.error);
      return;
    }
    clearDraft();
    setStepIndex(steps.length - 1);
  }

  function goToApp() {
    router.push("/dashboard/client");
    router.refresh();
  }

  return (
    <div className="page-transition" style={{ maxWidth: 560, margin: "0 auto", padding: "28px 18px 60px" }}>
      <div style={{ textAlign: "center", marginBottom: 18 }}>
        <p style={{
          fontFamily: "var(--font-playfair,'Playfair Display'),serif", fontStyle: "italic", fontWeight: 700,
          fontSize: 24, color: "#E01E1E", textShadow: "0 0 24px rgba(224,30,30,0.5)", margin: 0,
        }}>
          EP Coaching
        </p>
        <p style={{ fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: "#a97", margin: "2px 0 0" }}>
          Onboarding
        </p>
      </div>

      {restoredFromDraft && current.kind !== "final" && (
        <p style={{
          fontSize: 11.5, fontWeight: 600, color: "#4ade80", textAlign: "center", marginBottom: 14,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}>
          <Check size={13} /> On reprend là où tu t&apos;étais arrêté.
          {(current.kind === "gym-photos" || current.kind === "physique-photos") && " Il faut juste réajouter tes photos."}
        </p>
      )}

      {current.kind !== "final" && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
          <div style={{ flex: 1, height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, #890404, #E01E1E)", boxShadow: "0 0 10px rgba(224,30,30,0.7)", transition: "width 0.3s ease" }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 800, color: "#c99", whiteSpace: "nowrap" }}>
            {String(displayStep).padStart(2, "0")} / {String(totalCountable).padStart(2, "0")}
          </span>
        </div>
      )}

      <div className="ep-card" style={{ padding: "26px 22px", minHeight: 240, position: "relative", overflow: "hidden" }}>
        {current.kind === "intro" && (
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 900, color: "#fff", margin: "0 0 12px", letterSpacing: "-0.02em" }}>
              Bienvenue dans <span style={{ fontFamily: "var(--font-playfair,'Playfair Display'),serif", fontStyle: "italic", color: "#E01E1E" }}>EP Coaching</span>
            </h1>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: "#e3caca", margin: "0 0 20px" }}>
              T&apos;as accès à l&apos;appli complète : programme, nutrition, suivi, road map, tout centralisé au même endroit.
              Plus de 80h de formations pour que tu comprennes ce que tu fais, pas juste que tu le suives.
              <br /><br />
              Réponds à ces quelques questions, ça me permet de démarrer sur des bases solides.
            </p>
            <button onClick={goNext} className="ep-btn-primary" style={{ width: "100%" }}>Commencer</button>
          </div>
        )}

        {current.kind === "fields" && (
          <div>
            <span style={{ fontSize: 10.5, letterSpacing: 2, textTransform: "uppercase", color: "#E01E1E", marginBottom: 16, display: "block" }}>
              {current.section.kicker} · {current.section.title}
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {current.group.map((key) => {
                const field = current.section.fields[key];
                return (
                  <div key={key}>
                    <label style={{ display: "block", fontSize: 15, fontWeight: 700, color: "#f0e0e0", lineHeight: 1.4, marginBottom: 10 }}>
                      {field.label}
                    </label>
                    <FieldControl field={field} value={answers[key] ?? ""} onChange={(v) => setAnswer(key, v)} />
                  </div>
                );
              })}
            </div>
            {fieldError && <p style={{ color: "#E01E1E", fontSize: 11.5, fontWeight: 700, marginTop: 10 }}>{fieldError}</p>}
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 20 }}>
              <button onClick={goPrev} className="ep-btn-secondary">Retour</button>
              {safeStepIndex === steps.length - 2 ? (
                <button onClick={handleFinish} disabled={submitting} className="ep-btn-primary" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : "Terminer"}
                </button>
              ) : (
                <button onClick={goNext} className="ep-btn-primary" style={{ flex: 1 }}>Suivant</button>
              )}
            </div>
          </div>
        )}

        {current.kind === "gym-photos" && (
          <div>
            <span style={{ fontSize: 10.5, letterSpacing: 2, textTransform: "uppercase", color: "#E01E1E", marginBottom: 16, display: "block" }}>
              Section 7 · Ta salle de sport
            </span>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#f0e0e0", marginBottom: 12 }}>
              Une ou plusieurs photos de ta salle et du matériel disponible
            </p>
            <input
              ref={gymInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: "none" }}
              onChange={async (e) => {
                const files = Array.from(e.target.files ?? []);
                if (files.length === 0) return;
                const compressed = await Promise.all(files.map((f) => compressImage(f)));
                setGymFiles((prev) => [...prev, ...compressed]);
              }}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {gymFiles.map((f, i) => (
                <PhotoSlot
                  key={i}
                  label={`Photo ${i + 1}`}
                  file={f}
                  onPick={() => {}}
                  onClear={() => setGymFiles((prev) => prev.filter((_, idx) => idx !== i))}
                />
              ))}
              <button
                type="button"
                onClick={() => gymInputRef.current?.click()}
                style={{
                  height: 140, borderRadius: 12, border: "1px dashed rgba(224,30,30,0.35)",
                  background: "rgba(224,30,30,0.04)", display: "flex", flexDirection: "column", alignItems: "center",
                  justifyContent: "center", gap: 8, cursor: "pointer", color: "rgba(245,237,237,0.4)",
                }}
              >
                <Upload size={22} style={{ color: "#E01E1E" }} strokeWidth={1.6} />
                <span style={{ fontSize: 11.5, fontWeight: 700 }}>Ajouter</span>
              </button>
            </div>
            {fieldError && <p style={{ color: "#E01E1E", fontSize: 11.5, fontWeight: 700, marginTop: 10 }}>{fieldError}</p>}
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 20 }}>
              <button onClick={goPrev} className="ep-btn-secondary">Retour</button>
              <button onClick={goNext} className="ep-btn-primary" style={{ flex: 1 }}>Suivant</button>
            </div>
          </div>
        )}

        {current.kind === "physique-photos" && (
          <div>
            <span style={{ fontSize: 10.5, letterSpacing: 2, textTransform: "uppercase", color: "#E01E1E", marginBottom: 16, display: "block" }}>
              Section 8 · Photos physique
            </span>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#f0e0e0", marginBottom: 12 }}>
              3 photos actuelles : face, profil, dos
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <PhotoSlot label="Face" file={physiqueFiles.face} onPick={(f) => setPhysiqueFiles((p) => ({ ...p, face: f }))} onClear={() => setPhysiqueFiles((p) => ({ ...p, face: null }))} />
              <PhotoSlot label="Profil" file={physiqueFiles.profil} onPick={(f) => setPhysiqueFiles((p) => ({ ...p, profil: f }))} onClear={() => setPhysiqueFiles((p) => ({ ...p, profil: null }))} />
              <PhotoSlot label="Dos" file={physiqueFiles.dos} onPick={(f) => setPhysiqueFiles((p) => ({ ...p, dos: f }))} onClear={() => setPhysiqueFiles((p) => ({ ...p, dos: null }))} />
            </div>
            {fieldError && <p style={{ color: "#E01E1E", fontSize: 11.5, fontWeight: 700, marginTop: 10 }}>{fieldError}</p>}
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 20 }}>
              <button onClick={goPrev} className="ep-btn-secondary">Retour</button>
              <button onClick={goNext} className="ep-btn-primary" style={{ flex: 1 }}>Suivant</button>
            </div>
          </div>
        )}

        {current.kind === "final" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 34, marginBottom: 14 }}>🔥</div>
            <h2 style={{ fontSize: 23, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em", marginBottom: 12 }}>
              C&apos;est parti.
            </h2>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: "#e3caca", marginBottom: 20 }}>
              J&apos;ai tout ce qu&apos;il me faut pour construire ton programme et ton plan. Direction ton espace.
            </p>
            {submitError && <p style={{ color: "#E01E1E", fontSize: 12, fontWeight: 700, marginBottom: 14 }}>{submitError}</p>}
            {submitError ? (
              <button onClick={handleFinish} disabled={submitting} className="ep-btn-primary" style={{ width: "100%" }}>
                {submitting ? <Loader2 size={16} className="animate-spin" /> : "Réessayer"}
              </button>
            ) : (
              <button onClick={goToApp} className="ep-btn-primary" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <CheckCircle2 size={16} /> Accéder à l&apos;application
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
