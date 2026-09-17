"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Check, Mail, Phone, ChevronRight, Sparkles, ArrowRight, Clock, Zap,
  type LucideIcon,
} from "lucide-react";
import { createClientSupabase } from "@/lib/supabase-client";
import type { LeadMagnet, GuideMagnet, ChecklistMagnet, QuizMagnet } from "@/lib/lead-magnets";
import { getMagnetIcon } from "@/components/ressources/lead-magnet-icons";

const UNLOCK_PREFIX = "ep-unlocked-";
// Retour d'usage attendu (jamais mesuré jusqu'ici, mais visible dans le
// code) : le déblocage était mémorisé PAR guide (UNLOCK_PREFIX + slug), donc
// un visiteur qui a déjà laissé son email pour un premier guide devait
// retaper email/téléphone pour CHAQUE guide suivant qu'il ouvrait — alors
// que ce sont justement les leads qui en consultent plusieurs qui sont les
// plus qualifiés. Mémorise maintenant le contact une fois donné (clé
// partagée, pas par slug) pour débloquer automatiquement, en silence, les
// guides suivants — sans jamais sauter l'appel `submitLead` par guide : la
// ligne `leads` par (slug, email) reste écrite normalement, c'est la seule
// donnée qui dit vraiment quels guides intéressent ce contact.
const CONTACT_KEY = "ep-lead-contact";

function readUnlocked(slug: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(UNLOCK_PREFIX + slug) === "1";
  } catch {
    return false;
  }
}

function markUnlocked(slug: string) {
  try {
    localStorage.setItem(UNLOCK_PREFIX + slug, "1");
  } catch {
    // stockage indisponible, tant pis, le déblocage reste valable pour cette session
  }
}

function readRememberedContact(): { email: string; phone: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CONTACT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { email?: unknown; phone?: unknown };
    const email = typeof parsed.email === "string" ? parsed.email : "";
    const phone = typeof parsed.phone === "string" ? parsed.phone : "";
    return email || phone ? { email, phone } : null;
  } catch {
    return null;
  }
}

function rememberContact(email: string, phone: string) {
  try {
    localStorage.setItem(CONTACT_KEY, JSON.stringify({ email, phone }));
  } catch {
    // stockage indisponible, tant pis, juste pas de déblocage auto la prochaine fois
  }
}

// ── CTA final, identique sur les 3 formats une fois le contenu débloqué ──

// Un membre déjà inscrit (client, coach, peu importe) n'a aucune raison de
// se voir proposer de créer un compte qu'il a déjà — le CTA s'adapte plutôt
// que de traiter tout le monde comme un lead qui découvre l'appli.
function AppCta({ isLoggedIn, isCoach }: { isLoggedIn: boolean; isCoach: boolean }) {
  return (
    <div
      style={{
        marginTop: 32,
        padding: "24px 20px",
        borderRadius: 16,
        background: "linear-gradient(135deg, rgba(224,30,30,0.12), rgba(224,30,30,0.03))",
        border: "1px solid rgba(224,30,30,0.25)",
        textAlign: "center",
      }}
    >
      <Sparkles size={20} style={{ color: "#E01E1E", marginBottom: 10 }} />
      {isLoggedIn ? (
        <>
          <p style={{ fontSize: 15, fontWeight: 900, color: "#F5EDED", margin: "0 0 6px" }}>
            Retrouve tout ça directement dans l&apos;appli
          </p>
          <p style={{ fontSize: 12.5, color: "rgba(245,237,237,0.5)", lineHeight: 1.6, margin: "0 0 18px" }}>
            Suivi nutrition, programme, road map de progression : tout est déjà là pour toi.
          </p>
          <Link
            href={isCoach ? "/dashboard/coach" : "/dashboard/client"}
            className="ep-btn-primary"
            style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 48, padding: "0 28px", fontSize: 13 }}
          >
            Retour à l&apos;appli <ArrowRight size={15} />
          </Link>
        </>
      ) : (
        <>
          <p style={{ fontSize: 15, fontWeight: 900, color: "#F5EDED", margin: "0 0 6px" }}>
            Prêt(e) à passer à la vitesse supérieure ?
          </p>
          <p style={{ fontSize: 12.5, color: "rgba(245,237,237,0.5)", lineHeight: 1.6, margin: "0 0 18px" }}>
            L&apos;appli EP Coaching va plus loin : suivi nutrition, programme adapté, road map de progression
            et vrai accompagnement, gratuit pour commencer.
          </p>
          <Link
            href="/auth/client"
            className="ep-btn-primary"
            style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 48, padding: "0 28px", fontSize: 13 }}
          >
            Créer mon compte gratuit <ArrowRight size={15} />
          </Link>
        </>
      )}
    </div>
  );
}

// ── Formulaire de capture email / téléphone ───────────────────────────────

function CaptureForm({
  slug,
  submitLead,
  onUnlocked,
  ctaLabel,
}: {
  slug: string;
  submitLead: (slug: string, email: string, phone: string) => Promise<{ error?: string }>;
  onUnlocked: () => void;
  ctaLabel: string;
}) {
  // Pré-rempli si ce visiteur a déjà laissé son contact sur un guide
  // précédent (voir CONTACT_KEY plus haut) : il n'a alors qu'à valider,
  // jamais à retaper depuis zéro. Lazy initializer, jamais recalculé au
  // re-render.
  const [email, setEmail] = useState(() => readRememberedContact()?.email ?? "");
  const [phone, setPhone] = useState(() => readRememberedContact()?.phone ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await submitLead(slug, email, phone);
    setSubmitting(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    rememberContact(email, phone);
    markUnlocked(slug);
    onUnlocked();
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ position: "relative" }}>
        <Mail size={14} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "rgba(245,237,237,0.3)" }} />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Ton email" aria-label="Ton email"
          className="ep-input"
          style={{ paddingLeft: 38 }}
        />
      </div>
      <div style={{ position: "relative" }}>
        <Phone size={14} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "rgba(245,237,237,0.3)" }} />
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Ou ton numéro (optionnel si email rempli)" aria-label="Ou ton numéro (optionnel si email rempli)"
          className="ep-input"
          style={{ paddingLeft: 38 }}
        />
      </div>
      {error && <p style={{ fontSize: 11.5, color: "#FDC4C4", margin: 0 }}>{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="ep-btn-primary"
        style={{ height: 48, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
      >
        {submitting ? "..." : ctaLabel}
      </button>
      <p style={{ fontSize: 10, color: "rgba(245,237,237,0.25)", textAlign: "center", margin: 0 }}>
        Aucun spam. Juste ce contenu, et rien d&apos;autre sans ton accord.
      </p>
    </form>
  );
}

// ── En tête commun ─────────────────────────────────────────────────────

function Header({ magnet, Icon, showKeyword }: { magnet: LeadMagnet; Icon: LucideIcon; showKeyword: boolean }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div
          style={{
            width: 48, height: 48, borderRadius: 14, flexShrink: 0,
            background: "rgba(224,30,30,0.12)", border: "1px solid rgba(224,30,30,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <Icon size={22} style={{ color: "#E01E1E" }} strokeWidth={1.8} />
        </div>
        <div>
          <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(224,30,30,0.65)" }}>
            {magnet.category}
          </span>
          <p style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10.5, color: "rgba(245,237,237,0.35)", margin: "2px 0 0" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Clock size={10} /> {magnet.readTime}
            </span>
            {/* Code CTA reels (voir LeadMagnetsExplorer) — réservé aux
                coachs (déterminé côté client, cette page est mise en cache
                ISR et partagée entre visiteurs, un rôle ne peut pas être
                figé dans le HTML pré-rendu). */}
            {showKeyword && <span style={{ fontVariantNumeric: "tabular-nums" }}>#{magnet.keyword}</span>}
          </p>
        </div>
      </div>
      <h1 style={{ fontSize: 26, fontWeight: 900, color: "#F5EDED", lineHeight: 1.2, letterSpacing: "-0.01em", margin: "0 0 10px" }}>
        {magnet.title}
      </h1>
      <p style={{ fontSize: 14, color: "rgba(245,237,237,0.55)", lineHeight: 1.6, margin: 0 }}>{magnet.hook}</p>
    </div>
  );
}

// ── Guide ─────────────────────────────────────────────────────────────

function GuideContent({ magnet }: { magnet: GuideMagnet }) {
  return (
    <div>
      <p style={{ fontSize: 14, color: "rgba(245,237,237,0.7)", lineHeight: 1.7, marginBottom: 24 }}>{magnet.intro}</p>
      {magnet.sections.map((s, i) => (
        <div key={i} style={{ marginBottom: 22 }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: "#F5EDED", marginBottom: 8 }}>{s.heading}</h2>
          {s.paragraphs.map((p, j) => (
            <p key={j} style={{ fontSize: 13.5, color: "rgba(245,237,237,0.6)", lineHeight: 1.75, marginBottom: 10 }}>
              {p}
            </p>
          ))}
          {s.callout && (
            <div
              style={{
                display: "flex", gap: 10, alignItems: "flex-start",
                background: "rgba(224,30,30,0.1)", border: "1px solid rgba(224,30,30,0.3)",
                borderRadius: 10, padding: "12px 14px", margin: "12px 0",
              }}
            >
              <Zap size={15} style={{ color: "#E01E1E", flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 13.5, color: "#F5EDED", fontWeight: 700, lineHeight: 1.6, margin: 0 }}>{s.callout}</p>
            </div>
          )}
          {s.actionSteps && s.actionSteps.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
              {s.actionSteps.map((step, k) => (
                <div key={k} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span
                    style={{
                      flexShrink: 0, width: 22, height: 22, borderRadius: "50%",
                      background: "#E01E1E", color: "#fff", fontSize: 11, fontWeight: 800,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    {k + 1}
                  </span>
                  <p style={{ fontSize: 13.5, color: "rgba(245,237,237,0.8)", lineHeight: 1.65, margin: 0, paddingTop: 1 }}>
                    {step}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      <div style={{ borderTop: "1px solid rgba(224,30,30,0.15)", paddingTop: 18, marginTop: 8 }}>
        <p style={{ fontSize: 13.5, color: "#F5EDED", fontWeight: 700, lineHeight: 1.7, fontStyle: "italic" }}>
          {magnet.conclusion}
        </p>
      </div>
    </div>
  );
}

// ── Checklist ─────────────────────────────────────────────────────────

function ChecklistContent({ magnet }: { magnet: ChecklistMagnet }) {
  const [checked, setChecked] = useState<Set<string>>(new Set());

  function toggle(key: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const total = magnet.groups.reduce((s, g) => s + g.items.length, 0);

  return (
    <div>
      <p style={{ fontSize: 14, color: "rgba(245,237,237,0.7)", lineHeight: 1.7, marginBottom: 18 }}>{magnet.intro}</p>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(245,237,237,0.3)" }}>
          {checked.size} / {total} cochés
        </span>
        <div style={{ width: 100, height: 5, borderRadius: 3, background: "rgba(224,30,30,0.12)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${(checked.size / total) * 100}%`, background: "#E01E1E", transition: "width 0.3s" }} />
        </div>
      </div>

      {magnet.groups.map((group, gi) => (
        <div key={gi} style={{ marginBottom: 18 }}>
          {group.heading && (
            <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(224,30,30,0.6)", marginBottom: 8 }}>
              {group.heading}
            </p>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {group.items.map((item, ii) => {
              const key = `${gi}-${ii}`;
              const isChecked = checked.has(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggle(key)}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: 10, textAlign: "left",
                    padding: "10px 12px", borderRadius: 10, cursor: "pointer",
                    background: isChecked ? "rgba(74,222,128,0.06)" : "#1a0000",
                    border: `1px solid ${isChecked ? "rgba(74,222,128,0.25)" : "rgba(137,4,4,0.2)"}`,
                  }}
                >
                  <span
                    style={{
                      width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 1,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: isChecked ? "#4ade80" : "transparent",
                      border: `1px solid ${isChecked ? "#4ade80" : "rgba(245,237,237,0.25)"}`,
                    }}
                  >
                    {isChecked && <Check size={12} style={{ color: "#0D0000" }} strokeWidth={3} />}
                  </span>
                  <span style={{ fontSize: 13, color: isChecked ? "rgba(245,237,237,0.5)" : "#F5EDED", lineHeight: 1.5, textDecoration: isChecked ? "line-through" : "none" }}>
                    {item}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div style={{ borderTop: "1px solid rgba(224,30,30,0.15)", paddingTop: 18, marginTop: 8 }}>
        <p style={{ fontSize: 13.5, color: "#F5EDED", fontWeight: 700, lineHeight: 1.7, fontStyle: "italic" }}>
          {magnet.conclusion}
        </p>
      </div>
    </div>
  );
}

// ── Quiz ──────────────────────────────────────────────────────────────

function QuizFlow({
  magnet,
  submitLead,
  skipCapture,
  isCoach,
}: {
  magnet: QuizMagnet;
  submitLead: (slug: string, email: string, phone: string) => Promise<{ error?: string }>;
  // true dès qu'un compte est détecté (voir le composant principal) : un
  // membre de l'appli n'a jamais besoin de laisser email/téléphone, seul un
  // lead qui ne l'est pas encore doit passer par ce formulaire.
  skipCapture: boolean;
  isCoach: boolean;
}) {
  const [step, setStep] = useState(0);
  const [storedUnlock, setStoredUnlock] = useState(false);
  const [autoUnlocking, setAutoUnlocking] = useState(false);
  const unlocked = skipCapture || storedUnlock;

  // localStorage n'existe pas côté serveur : lire un déblocage déjà acquis
  // pendant le rendu produirait un mismatch d'hydratation (même compromis
  // assumé ailleurs dans l'appli pour ce genre de lecture, ex. DashboardNav).
  useEffect(() => setStoredUnlock(readUnlocked(magnet.slug)), [magnet.slug]);
  const [answers, setAnswers] = useState<string[]>([]);

  const finished = step >= magnet.questions.length;

  // Même déblocage silencieux que la page guide/checklist (voir CONTACT_KEY) :
  // seulement une fois le quiz terminé, jamais avant, pas la peine de
  // deviner si ce visiteur ira au bout.
  useEffect(() => {
    if (!finished || unlocked) return;
    const remembered = readRememberedContact();
    if (!remembered) return;
    let cancelled = false;
    setAutoUnlocking(true);
    submitLead(magnet.slug, remembered.email, remembered.phone).then((res) => {
      if (cancelled) return;
      setAutoUnlocking(false);
      if (!res.error) {
        markUnlocked(magnet.slug);
        setStoredUnlock(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [finished, unlocked, magnet.slug, submitLead]);

  function selectAnswer(resultKey: string) {
    const next = [...answers, resultKey];
    setAnswers(next);
    setStep((s) => s + 1);
  }

  function computeResult(): QuizMagnet["outcomes"][number] {
    const counts: Record<string, number> = {};
    for (const key of answers) counts[key] = (counts[key] ?? 0) + 1;
    let bestKey = magnet.outcomes[0].key;
    let bestCount = -1;
    for (const [key, count] of Object.entries(counts)) {
      if (count > bestCount) {
        bestCount = count;
        bestKey = key;
      }
    }
    return magnet.outcomes.find((o) => o.key === bestKey) ?? magnet.outcomes[0];
  }

  if (!finished) {
    const q = magnet.questions[step];
    const progress = Math.round(((step + 1) / magnet.questions.length) * 100);
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(245,237,237,0.35)" }}>
            Question {step + 1} / {magnet.questions.length}
          </span>
        </div>
        <div style={{ height: 5, borderRadius: 3, background: "rgba(224,30,30,0.12)", overflow: "hidden", marginBottom: 20 }}>
          <div style={{ height: "100%", width: `${progress}%`, background: "#E01E1E", transition: "width 0.3s" }} />
        </div>
        <p style={{ fontSize: 16, fontWeight: 800, color: "#F5EDED", marginBottom: 16, lineHeight: 1.4 }}>{q.question}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {q.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => selectAnswer(opt.resultKey)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
                textAlign: "left", padding: "14px 16px", borderRadius: 12, cursor: "pointer",
                background: "#1a0000", border: "1px solid rgba(137,4,4,0.25)", color: "#F5EDED", fontSize: 13.5,
              }}
            >
              {opt.label}
              <ChevronRight size={15} style={{ color: "rgba(245,237,237,0.2)", flexShrink: 0 }} />
            </button>
          ))}
        </div>
      </div>
    );
  }

  const result = computeResult();

  if (!unlocked) {
    if (autoUnlocking) {
      return (
        <p style={{ fontSize: 13, color: "rgba(245,237,237,0.4)", textAlign: "center", padding: "24px 0" }}>
          Déblocage en cours...
        </p>
      );
    }
    return (
      <div>
        <div
          style={{
            textAlign: "center", padding: "28px 20px", borderRadius: 16, marginBottom: 20,
            background: "rgba(224,30,30,0.08)", border: "1px dashed rgba(224,30,30,0.3)",
          }}
        >
          <Sparkles size={22} style={{ color: "#E01E1E", marginBottom: 10 }} />
          <p style={{ fontSize: 15, fontWeight: 900, color: "#F5EDED", margin: "0 0 6px" }}>Ton résultat est prêt.</p>
          <p style={{ fontSize: 12.5, color: "rgba(245,237,237,0.45)", margin: 0 }}>
            Laisse ton email ou ton numéro pour le débloquer.
          </p>
        </div>
        <CaptureForm slug={magnet.slug} submitLead={submitLead} onUnlocked={() => setStoredUnlock(true)} ctaLabel="Voir mon résultat" />
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          padding: "24px 20px", borderRadius: 16, marginBottom: 8,
          background: "linear-gradient(135deg, rgba(224,30,30,0.1), rgba(224,30,30,0.02))",
          border: "1px solid rgba(224,30,30,0.25)",
        }}
      >
        <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(224,30,30,0.65)" }}>
          Ton résultat
        </span>
        <p style={{ fontSize: 19, fontWeight: 900, color: "#F5EDED", margin: "6px 0 10px" }}>{result.title}</p>
        <p style={{ fontSize: 13.5, color: "rgba(245,237,237,0.65)", lineHeight: 1.7, margin: 0 }}>{result.description}</p>
      </div>
      <AppCta isLoggedIn={skipCapture} isCoach={isCoach} />
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────────

export default function LeadMagnetLanding({
  magnet,
  submitLead,
}: {
  magnet: LeadMagnet;
  submitLead: (slug: string, email: string, phone: string) => Promise<{ error?: string }>;
}) {
  const Icon = getMagnetIcon(magnet.icon);
  const [storedUnlock, setStoredUnlock] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCoach, setIsCoach] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [autoUnlocking, setAutoUnlocking] = useState(false);

  // Cette page est mise en cache (ISR, voir app/ressources/[slug]/page.tsx)
  // et donc partagée entre visiteurs : le statut de connexion ne peut pas
  // être décidé côté serveur sous peine de figer le compte du premier
  // visiteur dans le HTML pré-rendu pour tout le monde. On le détermine ici,
  // côté client, une fois la page hydratée (même compromis que pour la
  // lecture localStorage juste en dessous : léger flash possible, jamais de
  // contenu erroné affiché à un mauvais visiteur).
  // Un membre déjà inscrit (client comme coach) n'a jamais besoin de
  // laisser email/téléphone pour débloquer un contenu : ce formulaire n'a
  // de sens que pour un lead qui ne l'est pas encore. Voir aussi le rôle
  // pour le code CTA reels (Header) et le libellé du CTA final (AppCta),
  // tous deux réservés/adaptés aux membres.
  useEffect(() => {
    let cancelled = false;
    const sb = createClientSupabase();
    sb.auth.getUser().then(({ data: { user } }) => {
      if (cancelled) return;
      if (!user) {
        setStoredUnlock(readUnlocked(magnet.slug));
        setAuthChecked(true);
        return;
      }
      setIsLoggedIn(true);
      setAuthChecked(true);
      sb.from("profiles").select("role").eq("id", user.id).single().then(({ data }) => {
        if (!cancelled) setIsCoach((data as { role?: string } | null)?.role === "coach");
      });
    });
    return () => {
      cancelled = true;
    };
  }, [magnet.slug]);

  // Débloque en silence un guide jamais vu si ce visiteur a déjà laissé son
  // contact sur un autre guide (voir CONTACT_KEY) : `authChecked` attend que
  // l'effet ci-dessus ait vraiment tranché membre/anonyme et lu le
  // déblocage propre à CE slug, pour ne jamais soumettre inutilement pour
  // quelqu'un déjà connecté ou déjà débloqué. `submitLead` reste appelé
  // normalement (même ligne `leads` par guide qu'un déblocage manuel),
  // seule l'interaction humaine disparaît.
  useEffect(() => {
    if (!authChecked || isLoggedIn || storedUnlock) return;
    const remembered = readRememberedContact();
    if (!remembered) return;
    let cancelled = false;
    setAutoUnlocking(true);
    submitLead(magnet.slug, remembered.email, remembered.phone).then((res) => {
      if (cancelled) return;
      setAutoUnlocking(false);
      if (!res.error) {
        markUnlocked(magnet.slug);
        setStoredUnlock(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [authChecked, isLoggedIn, storedUnlock, magnet.slug, submitLead]);

  const unlocked = isLoggedIn || storedUnlock;

  if (magnet.format === "quiz") {
    return (
      <div className="page-transition" style={{ padding: "32px 20px 80px", maxWidth: 600, margin: "0 auto" }}>
        <Header magnet={magnet} Icon={Icon} showKeyword={isCoach} />
        <QuizFlow magnet={magnet} submitLead={submitLead} skipCapture={isLoggedIn} isCoach={isCoach} />
      </div>
    );
  }

  return (
    <div className="page-transition" style={{ padding: "32px 20px 80px", maxWidth: 600, margin: "0 auto" }}>
      <Header magnet={magnet} Icon={Icon} showKeyword={isCoach} />

      {unlocked ? (
        <>
          {magnet.format === "guide" ? <GuideContent magnet={magnet} /> : <ChecklistContent magnet={magnet} />}
          <AppCta isLoggedIn={isLoggedIn} isCoach={isCoach} />
        </>
      ) : autoUnlocking ? (
        // Contact déjà connu (voir CONTACT_KEY) : pas la peine de montrer le
        // formulaire pour un aller-retour qui va se résoudre en un instant,
        // juste un état d'attente bref plutôt qu'un flash visuel du
        // formulaire suivi immédiatement de son remplacement.
        <p style={{ fontSize: 13, color: "rgba(245,237,237,0.4)", textAlign: "center", padding: "24px 0" }}>
          Déblocage en cours...
        </p>
      ) : (
        <div>
          <div
            style={{
              padding: "20px", borderRadius: 16, marginBottom: 20,
              background: "#1a0000", border: "1px solid rgba(137,4,4,0.25)",
            }}
          >
            <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(245,237,237,0.35)", marginBottom: 10 }}>
              Ce que tu vas trouver dedans
            </p>
            {magnet.format === "guide" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {magnet.sections.map((s, i) => (
                  <p key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "rgba(245,237,237,0.55)", margin: 0 }}>
                    <Check size={13} style={{ color: "#E01E1E", flexShrink: 0 }} /> {s.heading}
                  </p>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: "rgba(245,237,237,0.55)", lineHeight: 1.6, margin: 0 }}>
                {magnet.groups.reduce((n, g) => n + g.items.length, 0)} points concrets à checker, prêts à l&apos;emploi.
              </p>
            )}
          </div>
          <CaptureForm slug={magnet.slug} submitLead={submitLead} onUnlocked={() => setStoredUnlock(true)} ctaLabel="Débloquer gratuitement" />
        </div>
      )}
    </div>
  );
}
