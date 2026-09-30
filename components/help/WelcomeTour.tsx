"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, X } from "lucide-react";
import { tourFor, type HelpSpace } from "@/lib/help-content";

// Visite d'accueil (2026-09-30) : 5 écrans au premier lancement pour
// comprendre l'appli, puis plus jamais (sauf « Revoir la visite » dans
// Aide et tutoriels). Mémorisé sur l'appareil.

const KEY_BASE = "ep-tour-done-v1";

export function restartTour() {
  try {
    for (const sp of ["coach", "client", "staff"]) localStorage.removeItem(`${KEY_BASE}-${sp}`);
  } catch {
    // stockage indisponible : la visite s'ouvre quand même via l'événement
  }
  window.dispatchEvent(new Event("ep:open-tour"));
}

export default function WelcomeTour() {
  const pathname = usePathname();
  const space: HelpSpace = pathname.startsWith("/equipe") ? "staff" : pathname.startsWith("/dashboard/coach") ? "coach" : "client";
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);

  useEffect(() => {
    const show = () => {
      setI(0);
      setOpen(true);
    };
    let seen = true;
    try {
      seen = localStorage.getItem(`${KEY_BASE}-${space}`) === "1";
    } catch {
      seen = true;
    }
    // Pas pendant un parcours d'accueil ou un questionnaire déjà ouvert.
    const t = !seen && !/onboarding|mon-appli|contrat|verifier/.test(window.location.pathname) ? setTimeout(show, 1200) : null;
    window.addEventListener("ep:open-tour", show);
    return () => {
      if (t) clearTimeout(t);
      window.removeEventListener("ep:open-tour", show);
    };
  }, [space]);

  if (!open) return null;
  const steps = tourFor(space);
  const step = steps[Math.min(i, steps.length - 1)];
  const last = i >= steps.length - 1;

  function close() {
    try {
      localStorage.setItem(`${KEY_BASE}-${space}`, "1");
    } catch {
      // rien
    }
    setOpen(false);
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Découvrir l'appli" style={{ position: "fixed", inset: 0, zIndex: 400, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={close} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.72)", backdropFilter: "blur(3px)" }} />
      <div className="ep-modal-panel" style={{ position: "relative", width: "100%", maxWidth: 480, margin: "0 12px", marginBottom: "calc(16px + env(safe-area-inset-bottom, 0px))", background: "linear-gradient(160deg, #230202, #120000)", border: "1px solid rgba(224,30,30,0.35)", borderRadius: 20, padding: "22px 20px 18px", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}>
        <button type="button" onClick={close} aria-label="Fermer" style={{ position: "absolute", top: 12, right: 12, background: "none", border: "none", color: "rgba(245,237,237,0.45)", cursor: "pointer" }}>
          <X size={18} />
        </button>
        <div style={{ display: "flex", gap: 5, marginBottom: 16 }}>
          {steps.map((_, k) => (
            <span key={k} style={{ height: 4, flex: 1, borderRadius: 99, background: k <= i ? "#E01E1E" : "rgba(245,237,237,0.12)", transition: "background .3s" }} />
          ))}
        </div>
        <h2 style={{ fontSize: 21, fontWeight: 900, color: "#F5EDED", margin: "0 0 8px", lineHeight: 1.2 }}>{step.title}</h2>
        <p style={{ fontSize: 14.5, color: "rgba(245,237,237,0.72)", margin: "0 0 18px", lineHeight: 1.55 }}>{step.body}</p>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {step.href && (
            <Link href={step.href} onClick={close} style={{ padding: "11px 14px", borderRadius: 12, border: "1px solid rgba(137,4,4,0.5)", color: "rgba(245,237,237,0.85)", fontSize: 12.5, fontWeight: 800, textDecoration: "none" }}>
              {step.cta ?? "Voir"}
            </Link>
          )}
          <button
            type="button"
            data-haptic
            onClick={() => (last ? close() : setI((v) => v + 1))}
            style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6, padding: "12px 18px", borderRadius: 12, border: "none", background: "#E01E1E", color: "#fff", fontSize: 13, fontWeight: 900, cursor: "pointer" }}
          >
            {last ? "C'est parti" : "Suivant"} {!last && <ChevronRight size={15} />}
          </button>
        </div>
      </div>
    </div>
  );
}
