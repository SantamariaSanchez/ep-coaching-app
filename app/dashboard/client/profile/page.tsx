"use client";
import { useEffect, useState } from "react";
import { createClientSupabase } from "@/lib/supabase-client";
import { useRouter } from "next/navigation";
import { Bell, Lock, LogOut, Save, CheckCircle2, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(0,0,0,0.5)",
  border: "1px solid rgba(224,30,30,0.12)",
  borderRadius: "var(--radius-sm)" as string,
  color: "#F5EDED",
  padding: "12px 16px",
  fontFamily: "var(--font-montserrat, 'Montserrat'), sans-serif",
  fontWeight: 500,
  fontSize: 14,
  outline: "none",
  transition: "border-color 0.15s",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="ep-card" style={{ padding: "20px", marginBottom: 12 }}>
      <p className="ep-section-title">{title}</p>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "10px 0",
      borderBottom: "1px solid rgba(224,30,30,0.07)",
    }}>
      <span className="ep-label">{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(245,237,237,0.75)" }}>
        {value ?? "—"}
      </span>
    </div>
  );
}

function InputField({
  label, value, onChange, readOnly, placeholder,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  readOnly?: boolean;
  placeholder?: string;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label className="ep-label" style={{ display: "block", marginBottom: 7, color: "rgba(224,30,30,0.65)" }}>
        {label}
      </label>
      <input
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        readOnly={readOnly}
        placeholder={placeholder}
        style={{ ...inputStyle, opacity: readOnly ? 0.45 : 1, cursor: readOnly ? "not-allowed" : "text" }}
        onFocus={(e) => { if (!readOnly) (e.target as HTMLInputElement).style.borderColor = "#E01E1E"; }}
        onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = "rgba(224,30,30,0.12)"; }}
      />
    </div>
  );
}

export default function ClientProfilePage() {
  const router = useRouter();
  const sb = createClientSupabase();

  const [profile, setProfile]     = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading]     = useState(true);
  const [fullName, setFullName]   = useState("");
  const [phone, setPhone]         = useState("");
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [push, setPush]           = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [weeks, setWeeks]         = useState<number | null>(null);

  useEffect(() => {
    sb.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push("/"); return; }
      const { data: p } = await sb.from("profiles").select("*").eq("id", user.id).single();
      if (p) {
        const prof = p as Record<string, unknown>;
        setProfile(prof);
        setFullName((prof.full_name as string) ?? "");
        setPhone((prof.phone as string) ?? "");
        if (prof.start_date) {
          const w = Math.floor(
            (Date.now() - new Date((prof.start_date as string) + "T12:00:00").getTime()) /
            (7 * 24 * 60 * 60 * 1000)
          );
          setWeeks(w);
        }
      }
      const { data: sub } = await sb.from("push_subscriptions").select("id").eq("user_id", user.id).maybeSingle();
      setPush(!!sub);
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    if (!profile) return;
    setSaving(true);
    await sb.from("profiles").update({ full_name: fullName, phone }).eq("id", profile.id as string);
    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 3000);
  }

  async function signOut() {
    await sb.auth.signOut();
    router.push("/auth/client");
  }

  async function resetPwd() {
    const email = profile?.email as string;
    if (!email) return;
    await sb.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/client`,
    });
    setResetSent(true);
  }

  if (loading) {
    return (
      <div style={{ padding: "32px 20px", maxWidth: 560, margin: "0 auto" }}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="ep-skeleton" style={{ height: 140, marginBottom: 12, borderRadius: "var(--radius-lg)" }} />
        ))}
      </div>
    );
  }

  const startFmt = (profile?.start_date as string | null)
    ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" })
        .format(new Date((profile!.start_date as string) + "T12:00:00"))
    : null;

  return (
    <div className="page-transition" style={{ padding: "32px 20px 100px", maxWidth: 560, margin: "0 auto" }}>

      {/* Header */}
      <div className="animate-fade-up" style={{ marginBottom: 28 }}>
        <p className="ep-section-title" style={{ marginBottom: 4 }}>Mon espace</p>
        <h1 style={{
          fontSize: 32, fontWeight: 900, letterSpacing: "-0.04em",
          color: "#F5EDED", margin: 0, lineHeight: 1.05,
        }}>
          Mon profil
        </h1>
      </div>

      {/* Infos */}
      <Section title="Mes informations">
        <InputField label="Prénom et Nom" value={fullName} onChange={setFullName} placeholder="Jean Dupont" />
        <InputField label="Email" value={(profile?.email as string) ?? ""} readOnly />
        <InputField label="Téléphone" value={phone} onChange={setPhone} placeholder="06 XX XX XX XX" />
        <button
          onClick={save}
          disabled={saving}
          className="ep-btn-primary"
          style={{ width: "100%", marginTop: 4 }}
        >
          {saved ? (
            <><CheckCircle2 size={14} /> Sauvegardé</>
          ) : saving ? (
            "Sauvegarde..."
          ) : (
            <><Save size={14} /> Sauvegarder</>
          )}
        </button>
      </Section>

      {/* Coaching */}
      <Section title="Mon coaching">
        <InfoRow label="Date de début" value={startFmt} />
        {weeks !== null && <InfoRow label="Semaines de coaching" value={`${weeks} semaines`} />}
        <InfoRow label="Objectif" value={profile?.goal as string | null} />
        <InfoRow
          label="Poids de départ"
          value={(profile?.weight_start as number | null) != null ? `${profile!.weight_start} kg` : null}
        />
        {(profile?.competition_category as string) && (
          <InfoRow label="Catégorie" value={profile!.competition_category as string} />
        )}
      </Section>

      {/* Notifications */}
      <Section title="Notifications">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#F5EDED", margin: "0 0 3px" }}>
              Notifications push
            </p>
            <p style={{ fontSize: 12, color: "rgba(245,237,237,0.35)", margin: 0 }}>
              {push ? "Activées sur cet appareil" : "Non activées"}
            </p>
          </div>
          {push ? (
            <span className="ep-badge-green">Activées</span>
          ) : (
            <button
              onClick={async () => {
                try {
                  if (!("serviceWorker" in navigator)) return;
                  const reg = await navigator.serviceWorker.register("/sw.js");
                  await navigator.serviceWorker.ready;
                  if ((await Notification.requestPermission()) !== "granted") return;
                  const b64 = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
                  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
                  const raw = window.atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
                  const key = Uint8Array.from([...raw].map((c) => c.charCodeAt(0))).buffer as ArrayBuffer;
                  const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
                  await fetch("/api/push/subscribe", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ subscription: sub.toJSON() }),
                  });
                  setPush(true);
                } catch (e) { console.error(e); }
              }}
              className="ep-btn-primary"
              style={{ fontSize: 11, padding: "8px 14px" }}
            >
              <Bell size={12} /> Activer
            </button>
          )}
        </div>
      </Section>

      {/* Compte */}
      <Section title="Compte">
        <button
          onClick={resetPwd}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            padding: "12px 0",
            background: "none",
            border: "none",
            cursor: "pointer",
            borderBottom: "1px solid rgba(224,30,30,0.07)",
            marginBottom: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Lock size={15} style={{ color: "rgba(245,237,237,0.4)" }} />
            <span style={{ fontSize: 14, color: "#F5EDED", fontWeight: 500 }}>
              {resetSent ? "Email envoyé !" : "Changer mon mot de passe"}
            </span>
          </div>
          <ChevronRight size={14} style={{ color: "rgba(245,237,237,0.2)" }} />
        </button>
        <button
          onClick={signOut}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            width: "100%",
            marginTop: 4,
            background: "rgba(224,30,30,0.1)",
            border: "1px solid rgba(224,30,30,0.25)",
            borderRadius: "var(--radius-sm)" as string,
            padding: "12px 20px",
            color: "#E01E1E",
            fontWeight: 800,
            fontSize: 12,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            cursor: "pointer",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.background = "rgba(224,30,30,0.2)";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.background = "rgba(224,30,30,0.1)";
          }}
        >
          <LogOut size={14} /> Se déconnecter
        </button>
      </Section>
    </div>
  );
}
