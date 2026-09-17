import { wrapBrandedEmail } from "@/lib/mailing-audience";

// ── Relance J+1 après la toute première action ──────────────────────────────
//
// Complète lib/first-action-celebration.ts : la félicitation immédiate
// (in-app + push, jamais d'email) part au moment même du premier geste, mais
// dès qu'une action existe le membre est classé "actif" par
// app/api/cron/weekly-reengagement (lib/reengagement.ts, fenêtre de 10 jours)
// et ne reçoit plus rien avant longtemps. Le lendemain de ce premier geste
// est exactement le moment où un rappel compte le plus pour transformer un
// geste isolé en habitude — cette relance couvre ce jour précis, une seule
// fois par membre (profiles.first_action_followup_sent_at).

export interface FollowupContext {
  firstName: string;
  appUrl: string;
  doneWorkout: boolean;
  doneMeal: boolean;
  doneBilan: boolean;
}

export interface FollowupMessage {
  subject: string;
  pushTitle: string;
  pushBody: string;
  pushUrl: string;
  html: string;
}

interface NextStep {
  key: "workout" | "meal" | "bilan";
  href: string;
  label: string;
  pitch: string;
}

const NEXT_STEPS: NextStep[] = [
  {
    key: "workout",
    href: "/dashboard/client/logbook",
    label: "Logue une séance",
    pitch: "Même une séance libre, en quelques minutes : c'est ce qui garde tes charges d'une fois sur l'autre.",
  },
  {
    key: "meal",
    href: "/dashboard/client/nutrition",
    label: "Note un repas",
    pitch: "Un seul aliment ajouté à ton journal du jour suffit pour commencer à voir où tu en es.",
  },
  {
    key: "bilan",
    href: "/dashboard/client/bilan",
    label: "Fais ton bilan du jour",
    pitch: "Poids, sommeil, ressenti : deux minutes, et tu commences à voir une vraie tendance.",
  },
];

function doneLabel(step: NextStep["key"]): string {
  switch (step) {
    case "workout":
      return "loggé une séance";
    case "meal":
      return "noté un repas";
    case "bilan":
      return "fait ton bilan du jour";
  }
}

/**
 * Message de relance à J+1. Si tout n'est pas encore fait, pointe vers la
 * prochaine action manquante (ordre workout > repas > bilan, celui de
 * lib/onboarding-checklist.ts). Si les 3 sont déjà cochées, félicite pour la
 * régularité plutôt que de répéter une checklist déjà terminée.
 */
export function buildFollowupMessage(ctx: FollowupContext): FollowupMessage {
  const { firstName, appUrl, doneWorkout, doneMeal, doneBilan } = ctx;
  const hi = firstName ? `Salut ${firstName}` : "Salut";
  const doneMap: Record<NextStep["key"], boolean> = {
    workout: doneWorkout,
    meal: doneMeal,
    bilan: doneBilan,
  };
  const doneOne = (Object.keys(doneMap) as NextStep["key"][]).find((k) => doneMap[k]);
  const next = NEXT_STEPS.find((s) => !doneMap[s.key]);

  const doneLine = doneOne
    ? `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:rgba(245,237,237,0.8);">Hier, tu as ${doneLabel(doneOne)}. C'est exactement le genre de petit geste qui, répété, fait toute la différence.</p>`
    : "";

  if (!next) {
    return {
      subject: "Tu as déjà tout coché, continue comme ça",
      pushTitle: "Belle régularité",
      pushBody: "Séance, nutrition, bilan : tu as déjà tout testé. La suite, c'est de tenir.",
      pushUrl: "/dashboard/client",
      html: wrapBrandedEmail(`
        <h2 style="color:#E01E1E;margin:0 0 14px;font-size:20px;">${hi} 👊</h2>
        <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:rgba(245,237,237,0.8);">En deux jours, tu as déjà loggé une séance, noté un repas et fait un bilan. La plupart des nouveaux membres ne font jamais ça, alors bravo, sincèrement.</p>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:rgba(245,237,237,0.8);">La seule chose qui compte maintenant, c'est de refaire pareil aujourd'hui. Pas plus, pas mieux : pareil.</p>
        <a href="${appUrl}/dashboard/client" style="background:#E01E1E;color:#ffffff;padding:11px 22px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:700;font-size:14px;">
          Ouvrir mon espace
        </a>
      `),
    };
  }

  return {
    subject: `${firstName ? `${firstName}, ` : ""}la suite logique après hier`,
    pushTitle: "La suite, c'est maintenant",
    pushBody: next.pitch,
    pushUrl: next.href,
    html: wrapBrandedEmail(`
      <h2 style="color:#E01E1E;margin:0 0 14px;font-size:20px;">${hi} 👋</h2>
      ${doneLine}
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:rgba(245,237,237,0.8);">Un geste isolé ne change rien, c'est la répétition qui construit une habitude. La suite logique aujourd'hui :</p>
      <div style="background:#1f0101;border:1px solid rgba(137,4,4,0.35);border-radius:12px;padding:16px;margin:0 0 20px;">
        <p style="margin:0 0 8px;font-size:16px;font-weight:700;color:#ffffff;">${next.label}</p>
        <p style="margin:0;font-size:14px;line-height:1.5;color:rgba(245,237,237,0.65);">${next.pitch}</p>
      </div>
      <a href="${appUrl}${next.href}" style="background:#E01E1E;color:#ffffff;padding:11px 22px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:700;font-size:14px;">
        ${next.label}
      </a>
    `),
  };
}
