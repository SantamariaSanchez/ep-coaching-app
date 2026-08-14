"use client";

import { useRef, useState } from "react";
import { Camera, User, X, ArrowRight } from "lucide-react";
import { updateMyProfile, uploadAvatar } from "@/utils/profile-actions";

export default function ProfileSetupStep({
  onDone,
  finishing,
}: {
  onDone: () => void;
  finishing: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [bio, setBio] = useState("");
  const [instagram, setInstagram] = useState("");

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await uploadAvatar(formData);
      if (result.url) setAvatarUrl(result.url);
    } finally {
      setUploading(false);
    }
  }

  // Navigation instantanée : la sauvegarde part en arrière-plan (fire-and-
  // forget), on ne fait jamais attendre la personne pour une étape 100%
  // facultative.
  function handleContinue() {
    if (bio.trim() || instagram.trim()) {
      updateMyProfile({
        bio: bio.trim() || undefined,
        instagram_handle: instagram.trim() || undefined,
      }).catch(() => {});
    }
    onDone();
  }

  const busy = finishing;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", position: "relative", zIndex: 1 }}>
      {/* Skip */}
      <div style={{ padding: "24px 24px 0", display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={onDone}
          disabled={busy}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            background: "rgba(245,237,237,0.06)",
            border: "1px solid rgba(245,237,237,0.18)",
            borderRadius: 999,
            cursor: "pointer",
            color: "rgba(245,237,237,0.75)", fontSize: 12, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.06em",
            flexShrink: 0, padding: "7px 12px", whiteSpace: "nowrap",
          }}
        >
          Passer <X size={13} />
        </button>
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px 24px" }}>
        <div className="animate-fade-up" style={{ width: "100%", maxWidth: 420 }}>
          <p style={{
            fontSize: 11, fontWeight: 800, letterSpacing: "0.18em",
            textTransform: "uppercase", color: "#E01E1E", margin: "0 0 6px", textAlign: "center",
          }}>
            Ton profil
          </p>
          <h1 style={{
            fontSize: "clamp(20px, 5vw, 26px)", fontWeight: 900,
            letterSpacing: "-0.03em", color: "#F5EDED", margin: "0 0 8px",
            lineHeight: 1.2, textAlign: "center",
          }}>
            Personnalise ta page
          </h1>
          <p style={{ fontSize: 12, color: "rgba(245,237,237,0.4)", textAlign: "center", margin: "0 0 28px" }}>
            100% facultatif, tu pourras toujours le faire plus tard.
          </p>

          <input ref={fileRef} type="file" accept="image/*" aria-label="Photo de profil" className="hidden" onChange={handleAvatarChange} />
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              style={{
                position: "relative", width: 84, height: 84, borderRadius: "50%",
                border: "1px dashed rgba(224,30,30,0.4)",
                background: avatarUrl ? `url(${avatarUrl}) center/cover no-repeat` : "rgba(224,30,30,0.08)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", flexShrink: 0,
              }}
            >
              {!avatarUrl && (
                uploading
                  ? <div style={{ width: 18, height: 18, border: "2px solid #E01E1E", borderTopColor: "transparent", borderRadius: "50%" }} className="animate-spin" />
                  : <User size={28} style={{ color: "rgba(224,30,30,0.6)" }} strokeWidth={1.6} />
              )}
              <div style={{
                position: "absolute", bottom: -2, right: -2, width: 26, height: 26, borderRadius: "50%",
                background: "#E01E1E", display: "flex", alignItems: "center", justifyContent: "center",
                border: "2px solid #1a0000",
              }}>
                <Camera size={12} style={{ color: "#fff" }} />
              </div>
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{
                display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "0.18em",
                textTransform: "uppercase", color: "rgba(224,30,30,0.8)", marginBottom: 7,
              }}>
                Bio
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Parle un peu de toi, tes objectifs, ton parcours..." aria-label="Parle un peu de toi, tes objectifs, ton parcours..."
                rows={3}
                maxLength={280}
                style={{
                  width: "100%", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(224,30,30,0.15)",
                  borderRadius: 8, color: "#F5EDED", padding: "11px 14px", fontFamily: "var(--font-montserrat,'Montserrat'),sans-serif",
                  fontWeight: 500, fontSize: 14, outline: "none", resize: "none",
                }}
              />
            </div>
            <div>
              <label style={{
                display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "0.18em",
                textTransform: "uppercase", color: "rgba(224,30,30,0.8)", marginBottom: 7,
              }}>
                Instagram
              </label>
              <input
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="tonpseudo" aria-label="tonpseudo"
                style={{
                  width: "100%", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(224,30,30,0.15)",
                  borderRadius: 8, color: "#F5EDED", padding: "11px 14px", fontFamily: "var(--font-montserrat,'Montserrat'),sans-serif",
                  fontWeight: 500, fontSize: 14, outline: "none",
                }}
              />
            </div>
          </div>

          <button
            onClick={handleContinue}
            disabled={busy}
            className="ep-btn-primary"
            style={{ width: "100%", height: 48, fontSize: 13, marginTop: 22, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            {busy ? "Un instant…" : "Continuer"}
            {!busy && <ArrowRight size={15} />}
          </button>
        </div>
      </div>
    </div>
  );
}
