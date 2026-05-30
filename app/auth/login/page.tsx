import { loginAction } from "@/app/auth/actions";
import { EPLogo } from "@/components/ui/EPLogo";

interface Props {
  searchParams: Promise<{ error?: string }>;
}

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const hasError =
    params.error === "invalid_credentials" || params.error === "no_user";

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 20px",
        background:
          "radial-gradient(ellipse 70% 60% at 50% 30%, #3D0505 0%, #1A0101 40%, #0D0000 100%)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 380 }}>

        {/* Logo */}
        <div
          className="animate-fade-up"
          style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}
        >
          <EPLogo size="lg" showCoaching />
        </div>

        {/* Divider */}
        <div
          className="animate-fade-in stagger-2"
          style={{
            width: 60,
            height: 1,
            background: "linear-gradient(90deg, transparent, #E01E1E, transparent)",
            margin: "0 auto 28px",
          }}
        />

        {/* Title */}
        <div
          className="animate-fade-up stagger-3"
          style={{ textAlign: "center", marginBottom: 32 }}
        >
          <h1
            style={{
              fontFamily: "var(--font-montserrat, 'Montserrat'), sans-serif",
              fontWeight: 800,
              fontSize: 28,
              letterSpacing: "-0.04em",
              color: "#F5EDED",
              margin: 0,
              lineHeight: 1,
            }}
          >
            Connexion
          </h1>
          <p
            style={{
              marginTop: 8,
              fontSize: 13,
              color: "rgba(245,237,237,0.4)",
              fontWeight: 500,
            }}
          >
            Ton espace coaching
          </p>
        </div>

        {/* Form */}
        <form
          action={loginAction}
          className="animate-fade-up stagger-5"
          style={{ display: "flex", flexDirection: "column", gap: 18 }}
        >
          <div>
            <label
              htmlFor="email"
              style={{
                display: "block",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "rgba(224,30,30,0.8)",
                marginBottom: 8,
              }}
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="ton@email.com"
              style={{
                width: "100%",
                background: "rgba(0,0,0,0.4)",
                border: "1px solid rgba(224,30,30,0.15)",
                borderRadius: 8,
                padding: "12px 16px",
                color: "#F5EDED",
                fontFamily: "var(--font-montserrat, 'Montserrat'), sans-serif",
                fontWeight: 500,
                fontSize: 14,
                outline: "none",
                transition: "border-color 0.15s, box-shadow 0.15s",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#E01E1E";
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(224,30,30,0.1)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "rgba(224,30,30,0.15)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              style={{
                display: "block",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "rgba(224,30,30,0.8)",
                marginBottom: 8,
              }}
            >
              Mot de passe
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              style={{
                width: "100%",
                background: "rgba(0,0,0,0.4)",
                border: "1px solid rgba(224,30,30,0.15)",
                borderRadius: 8,
                padding: "12px 16px",
                color: "#F5EDED",
                fontFamily: "var(--font-montserrat, 'Montserrat'), sans-serif",
                fontWeight: 500,
                fontSize: 14,
                outline: "none",
                transition: "border-color 0.15s, box-shadow 0.15s",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#E01E1E";
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(224,30,30,0.1)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "rgba(224,30,30,0.15)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>

          {hasError && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 16px",
                background: "rgba(224,30,30,0.08)",
                border: "1px solid rgba(224,30,30,0.25)",
                borderRadius: 8,
              }}
            >
              <span style={{ color: "#E01E1E", fontSize: 14, flexShrink: 0 }}>⚠</span>
              <p style={{ fontSize: 13, color: "#FDC4C4", margin: 0, fontWeight: 500 }}>
                Email ou mot de passe incorrect.
              </p>
            </div>
          )}

          <button
            type="submit"
            style={{
              width: "100%",
              height: 48,
              background: "linear-gradient(135deg, #E01E1E 0%, #890404 100%)",
              border: "none",
              borderRadius: 8,
              color: "#F5EDED",
              fontFamily: "var(--font-montserrat, 'Montserrat'), sans-serif",
              fontWeight: 800,
              fontSize: 13,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              cursor: "pointer",
              transition: "all 0.2s ease",
              marginTop: 4,
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.filter = "brightness(1.1)";
              el.style.boxShadow = "0 4px 20px rgba(224,30,30,0.3)";
              el.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.filter = "none";
              el.style.boxShadow = "none";
              el.style.transform = "translateY(0)";
            }}
          >
            Se connecter
          </button>
        </form>

        {/* Footer */}
        <p
          className="animate-fade-in stagger-6"
          style={{
            marginTop: 40,
            textAlign: "center",
            fontSize: 10,
            color: "rgba(245,237,237,0.2)",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}
        >
          EP Coaching © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
