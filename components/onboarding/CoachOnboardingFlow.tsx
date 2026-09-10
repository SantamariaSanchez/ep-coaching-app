"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Rocket, User, Tags, Users, Link2, ChevronRight, ChevronLeft, Target } from "lucide-react";
import ProfileEditor from "@/components/profile/ProfileEditor";
import CoachSpecializationsCard from "@/components/coach/CoachSpecializationsCard";
import AcceptingClientsCard from "@/components/coach/AcceptingClientsCard";
import InviteLinkCard from "@/components/coach/InviteLinkCard";
import BusinessCanvasEditor from "@/components/coach/BusinessCanvasEditor";
import type { WaitlistEntry } from "@/utils/waitlist";
import type { BusinessCanvas } from "@/lib/coach-business-canvas";
import { completeOnboarding } from "@/app/onboarding/actions";

// Onboarding coach (Axe 9, VISION.md) — étapes courtes, chacune réutilisant
// un composant déjà existant et déjà auto-sauvegardant (ProfileEditor,
// CoachSpecializationsCard, AcceptingClientsCard, InviteLinkCard,
// BusinessCanvasEditor vivent normalement dans /dashboard/coach/parametres
// ou /business) : pas de nouvelle logique de sauvegarde à écrire, juste un
// fil qui les présente dans le bon ordre au premier lancement, pour qu'un
// coach tiers n'atterrisse jamais sur un tableau de bord vide sans savoir
// par où commencer ni comment récupérer son premier client.
//
// Étape "business" ajoutée le 2026-09-10 (retour direct : "l'onboarding
// membre et client existe mais on n'a pas d'onboarding complet pour les
// coachs... je veux beaucoup de paramètres derrière pour réellement
// personnaliser l'appli à leur situation") — les 4 étapes d'origine ne
// couvraient que la fiche PUBLIQUE (annuaire /coachs), jamais le modèle
// business qui personnalise en retour tout Studio créatif (les prompts
// copiés dans l'onglet Prompts s'auto-remplissent avec ces blocs, voir
// IdeationScripts.tsx/buildCoachContext) — jusqu'ici seul un coach qui
// pensait à aller fouiller "Développer mon business" en profitait.
type Step = "welcome" | "profile" | "specializations" | "business" | "capacity" | "invite";
const STEPS: Step[] = ["welcome", "profile", "specializations", "business", "capacity", "invite"];

export default function CoachOnboardingFlow({
  fullName,
  phone,
  bio,
  instagramHandle,
  specializations,
  accepting,
  waitlist,
  inviteCode,
  canvas,
}: {
  fullName: string;
  phone: string | null;
  bio: string | null;
  instagramHandle: string | null;
  specializations: string[];
  accepting: boolean;
  waitlist: WaitlistEntry[];
  inviteCode: string | null;
  canvas: BusinessCanvas | null;
}) {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const step = STEPS[stepIndex];

  function next() {
    if (stepIndex < STEPS.length - 1) setStepIndex(stepIndex + 1);
    else finish();
  }
  function back() {
    if (stepIndex > 0) setStepIndex(stepIndex - 1);
  }
  function finish() {
    setFinishing(true);
    completeOnboarding().catch(() => {});
    router.push("/dashboard/coach?onboarded=1");
    router.refresh();
  }

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "40px 20px 80px" }} className="page-transition">
      {/* Progression */}
      <div style={{ display: "flex", gap: 6, marginBottom: 32 }}>
        {STEPS.map((s, i) => (
          <div
            key={s}
            style={{
              flex: 1, height: 3, borderRadius: 999,
              background: i <= stepIndex ? "#E01E1E" : "rgba(245,237,237,0.1)",
              transition: "background 0.2s ease",
            }}
          />
        ))}
      </div>

      {step === "welcome" && (
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 64, height: 64, borderRadius: 20, margin: "0 auto 20px",
              background: "linear-gradient(135deg, rgba(224,30,30,0.22), rgba(137,4,4,0.12))",
              border: "1px solid rgba(224,30,30,0.35)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <Rocket size={28} style={{ color: "#E01E1E" }} strokeWidth={1.8} />
          </div>
          <h1 className="ep-h1" style={{ marginBottom: 10 }}>
            Bienvenue{fullName ? `, ${fullName.split(" ")[0]}` : ""}
          </h1>
          <p style={{ fontSize: 13.5, color: "rgba(245,237,237,0.5)", lineHeight: 1.6, maxWidth: 440, margin: "0 auto" }}>
            Ton abonnement plateforme est actif. Avant ton premier client, 3 minutes pour que ta fiche
            soit prête : ton profil, tes spécialités, ta capacité, et ton lien d&apos;inscription
            personnel. Tout reste modifiable ensuite depuis Paramètres.
          </p>
        </div>
      )}

      {step === "profile" && (
        <div>
          <StepHeader icon={User} title="Ton profil" subtitle="Ce que verra un prospect qui te découvre dans l'annuaire." />
          <ProfileEditor fullName={fullName} phone={phone} bio={bio} instagramHandle={instagramHandle} />
        </div>
      )}

      {step === "specializations" && (
        <div>
          <StepHeader icon={Tags} title="Tes spécialités" subtitle="Pour qu'un membre te trouve selon SON besoin, pas au hasard." />
          <CoachSpecializationsCard initialSpecializations={specializations} />
        </div>
      )}

      {step === "business" && (
        <div>
          <StepHeader
            icon={Target}
            title="Ton activité"
            subtitle="Sert à personnaliser automatiquement les prompts de contenu dans Studio créatif à TA situation, pas rester générique."
          />
          <p style={{ fontSize: 11.5, color: "rgba(245,237,237,0.4)", lineHeight: 1.6, margin: "0 0 14px" }}>
            Remplis au moins &laquo; Proposition de valeur &raquo; et &laquo; Segments de clientèle &raquo; si tu es pressé,
            les autres blocs t&apos;attendent dans Développer mon business quand tu auras 5 minutes de plus. Rien n&apos;est
            obligatoire, chaque bloc s&apos;enregistre tout seul.
          </p>
          <BusinessCanvasEditor canvas={canvas} />
        </div>
      )}

      {step === "capacity" && (
        <div>
          <StepHeader icon={Users} title="Ta capacité" subtitle="Combien de clients tu peux vraiment bien suivre en ce moment." />
          <AcceptingClientsCard initialAccepting={accepting} waitlist={waitlist} />
        </div>
      )}

      {step === "invite" && (
        <div>
          <StepHeader icon={Link2} title="Ton lien" subtitle="Chaque inscription via ce lien te rattache automatiquement le client." />
          <InviteLinkCard inviteCode={inviteCode} />
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 36 }}>
        {stepIndex > 0 ? (
          <button
            type="button"
            onClick={back}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              fontSize: 11.5, fontWeight: 700, color: "rgba(245,237,237,0.4)",
              background: "none", border: "none", cursor: "pointer",
            }}
          >
            <ChevronLeft size={14} /> Retour
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={next}
          disabled={finishing}
          className="ep-btn-primary"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "12px 22px" }}
        >
          {stepIndex === STEPS.length - 1 ? "C'est parti" : "Continuer"}
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

function StepHeader({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle: string }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Icon size={16} style={{ color: "#E01E1E" }} strokeWidth={1.8} />
        <h2 className="ep-h2" style={{ margin: 0 }}>{title}</h2>
      </div>
      <p style={{ fontSize: 12, color: "rgba(245,237,237,0.4)", margin: "4px 0 0 26px" }}>{subtitle}</p>
    </div>
  );
}
