import { createAdminClient } from "@/lib/supabase-admin";
import { sendBrevoEmail } from "@/utils/brevo";
import { wrapBrandedEmail } from "@/lib/mailing-audience";
import { escapeHtml } from "@/lib/sanitize";
import { notifyUser } from "@/lib/notify";
import { notifyAdmin } from "@/lib/admin-notify";
import { getRoleCard } from "@/lib/staff-roles";
import { getPlaybook } from "@/lib/staff-playbooks";
import { PHASES, trainingFor, type Lesson } from "@/lib/staff-training";
import { parisDate } from "@/lib/staff-kpis";

// Parcours d'intégration automatique d'une recrue (demande directe
// 2026-09-27 : "tout en auto, les mails, l'onboarding, la formation").
// Le jour de la signature, l'email du contrat sert d'accueil (voir
// sendContractEmail). Ensuite, chaque étape part toute seule, calée sur sa
// vraie progression dans la formation, et le fondateur est tenu au courant
// des moments qui comptent.

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://ep-coaching.vercel.app";

type StepKey = "j1" | "j3" | "j7" | "j14" | "j28" | "j90";

interface Progress {
  lessons: Lesson[];
  done: Set<string>;
  byPhase: { key: string; label: string; total: number; done: number; next: Lesson[] }[];
  reports: number;
  records: number;
}

interface Member {
  user_id: string;
  owner_id: string;
  role_key: string;
  full_name: string;
  email: string;
  contract_signed_at: string;
}

interface Step {
  key: StepKey;
  day: number;
  subject: (m: Member) => string;
  body: (m: Member, p: Progress) => string;
  /** Le fondateur est prévenu à cette étape (avec le point d'avancement). */
  founder?: boolean;
}

const h3 = (t: string) => `<h3 style="margin:16px 0 6px;font-size:14px;color:#ffffff;">${escapeHtml(t)}</h3>`;
const p = (t: string) => `<p style="margin:0 0 12px;color:rgba(245,237,237,0.85);font-size:13px;line-height:1.6;">${t}</p>`;
const list = (items: string[]) =>
  `<ul style="margin:0 0 12px;padding-left:18px;color:rgba(245,237,237,0.85);font-size:13px;">${items.map((i) => `<li style="margin:0 0 5px;">${i}</li>`).join("")}</ul>`;
const button = (label: string, path: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:14px auto 4px;"><tr><td style="border-radius:10px;background:#E01E1E;"><a href="${APP_URL}${path}" style="display:inline-block;padding:12px 28px;font-size:13px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#ffffff;text-decoration:none;border-radius:10px;">${escapeHtml(label)}</a></td></tr></table>`;
const title = (kicker: string, t: string) =>
  `<p style="margin:0 0 4px;font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#E01E1E;">${escapeHtml(kicker)}</p><h1 style="margin:0 0 14px;font-size:20px;font-weight:800;color:#ffffff;line-height:1.3;">${escapeHtml(t)}</h1>`;

const first = (m: Member) => m.full_name.trim().split(" ")[0] || "toi";
const roleTitle = (m: Member) => getRoleCard(m.role_key)?.role.title ?? m.role_key;
const phase = (pr: Progress, key: string) => pr.byPhase.find((b) => b.key === key);
const lessonItems = (ls: Lesson[]) => ls.map((l) => `<strong>${escapeHtml(l.title)}</strong> <span style="color:rgba(245,237,237,0.5)">(${l.minutes} min)</span>`);

export const STEPS: Step[] = [
  {
    key: "j1",
    day: 1,
    subject: (m) => `${first(m)}, ta formation commence aujourd'hui`,
    body: (m, pr) => {
      const dec = phase(pr, "decouverte");
      return (
        title(roleTitle(m), `Jour 1 : on pose les bases`) +
        p(`Cette semaine, une seule priorité : la phase <strong>Découverte</strong> de ta formation. Compte une vingtaine de minutes par jour, tout est dans ton espace.`) +
        (dec && dec.next.length ? h3("Tes prochaines leçons") + list(lessonItems(dec.next.slice(0, 4))) : "") +
        h3("Et aujourd'hui") +
        list([
          "Lis ta fiche technique : ce qu'on attend de toi et comment tu es mesuré.",
          "Règle tes objectifs du mois dans ton tableau de bord.",
          "Envoie ton premier rapport du jour ce soir, même court.",
        ]) +
        button("Commencer ma formation", "/equipe/formation")
      );
    },
  },
  {
    key: "j3",
    day: 3,
    subject: (m) => `${first(m)}, où en es-tu de ta découverte ?`,
    founder: true,
    body: (m, pr) => {
      const dec = phase(pr, "decouverte");
      const ok = dec && dec.done >= dec.total;
      return (
        title(roleTitle(m), ok ? "Découverte bouclée, bravo" : `Découverte : ${dec?.done ?? 0} leçon${(dec?.done ?? 0) > 1 ? "s" : ""} sur ${dec?.total ?? 0}`) +
        (ok
          ? p(`Tu as fini la première phase en avance. Tu peux attaquer la <strong>Pratique accompagnée</strong> dès maintenant.`)
          : p(`Il te reste ${Math.max(0, (dec?.total ?? 0) - (dec?.done ?? 0))} leçon(s) pour finir la semaine 1. Une par jour et c'est bouclé à temps.`) +
            (dec?.next.length ? list(lessonItems(dec.next.slice(0, 3))) : "")) +
        p(`Une question, un blocage ? Écris directement à Santamaria dans l'onglet Équipe, il répond vite.`) +
        button(ok ? "Passer à la pratique" : "Continuer ma formation", "/equipe/formation")
      );
    },
  },
  {
    key: "j7",
    day: 7,
    subject: (m) => `${first(m)}, ta première semaine est faite`,
    founder: true,
    body: (m, pr) => {
      const pra = phase(pr, "pratique");
      const pb = getPlaybook(m.role_key);
      return (
        title(roleTitle(m), "Semaine 1 bouclée, place à la pratique") +
        p(`Bilan de ta semaine : <strong>${pr.done.size} leçon${pr.done.size > 1 ? "s" : ""}</strong> terminée${pr.done.size > 1 ? "s" : ""}, <strong>${pr.reports} rapport${pr.reports > 1 ? "s" : ""}</strong> envoyé${pr.reports > 1 ? "s" : ""}, <strong>${pr.records}</strong> fiche${pr.records > 1 ? "s" : ""} dans ton espace.`) +
        p(`Les semaines 2 et 3, c'est la <strong>Pratique accompagnée</strong> : tu fais le vrai travail, avec un retour sur ce que tu produis.`) +
        (pra?.next.length ? h3("Au programme") + list(lessonItems(pra.next.slice(0, 4))) : "") +
        (pb?.targets?.length ? h3("Ce qu'on regarde") + p(`${escapeHtml(pb.targets.map((t) => t.label).join(", "))}. Règle tes objectifs du mois dans ton tableau de bord si ce n'est pas fait.`) : "") +
        button("Ouvrir ma journée", "/equipe")
      );
    },
  },
  {
    key: "j14",
    day: 14,
    subject: (m) => `${first(m)}, mi-parcours de ta pratique`,
    body: (m, pr) => {
      const pra = phase(pr, "pratique");
      return (
        title(roleTitle(m), "Mi-parcours") +
        p(`Tu es à la moitié de la pratique accompagnée (${pra?.done ?? 0}/${pra?.total ?? 0} leçons). C'est le moment de regarder tes chiffres dans ton tableau de bord et de noter dans ton rapport ce qui coince.`) +
        (pra?.next.length ? list(lessonItems(pra.next.slice(0, 3))) : p("Pratique terminée : place à l'autonomie encadrée.")) +
        button("Mon tableau de bord", "/equipe")
      );
    },
  },
  {
    key: "j28",
    day: 28,
    subject: (m) => `${first(m)}, un mois dans l'équipe`,
    founder: true,
    body: (m, pr) => {
      const aut = phase(pr, "autonomie");
      return (
        title(roleTitle(m), "Un mois : passage en autonomie") +
        p(`Tu as terminé <strong>${pr.done.size} leçon${pr.done.size > 1 ? "s" : ""} sur ${pr.lessons.length}</strong> et envoyé <strong>${pr.reports}</strong> rapport${pr.reports > 1 ? "s" : ""}. À partir de maintenant, tu organises ta semaine en autonomie, avec un point hebdomadaire.`) +
        (aut?.next.length ? list(lessonItems(aut.next)) : "") +
        p(`Santamaria va caler avec toi le point du premier mois. Prépare tes chiffres et une idée d'amélioration.`) +
        button("Ma formation", "/equipe/formation")
      );
    },
  },
  {
    key: "j90",
    day: 90,
    subject: (m) => `${first(m)}, l'évaluation des 3 mois`,
    founder: true,
    body: (m, pr) => {
      const ev = phase(pr, "evaluation");
      return (
        title(roleTitle(m), "Trois mois : ton évaluation") +
        p(`C'est l'heure du bilan des 3 mois : ce qui marche, ce qui reste à travailler, et la suite de la collaboration.`) +
        (ev?.next.length ? list(lessonItems(ev.next)) : "") +
        p(`Ton rapport de la semaine sert de base à l'échange, soigne-le.`) +
        button("Ouvrir mon espace", "/equipe")
      );
    },
  },
];

function daysBetween(fromIso: string, today: string): number {
  const a = Date.parse(`${parisDate(new Date(fromIso))}T12:00:00Z`);
  const b = Date.parse(`${today}T12:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

async function progressFor(admin: ReturnType<typeof createAdminClient>, m: Member): Promise<Progress> {
  const lessons = trainingFor(m.role_key);
  const [{ data: doneRows }, { count: reports }, { count: records }] = await Promise.all([
    admin.from("staff_training_progress").select("lesson_key").eq("staff_id", m.user_id),
    admin.from("staff_records").select("id", { count: "exact", head: true }).eq("staff_id", m.user_id).eq("kind", "report"),
    admin.from("staff_records").select("id", { count: "exact", head: true }).eq("staff_id", m.user_id).neq("kind", "report"),
  ]);
  const done = new Set(((doneRows ?? []) as { lesson_key: string }[]).map((r) => r.lesson_key));
  const byPhase = PHASES.map((ph) => {
    const list = lessons.filter((l) => l.phase === ph.key);
    return { key: ph.key, label: ph.label, total: list.length, done: list.filter((l) => done.has(l.key)).length, next: list.filter((l) => !done.has(l.key)) };
  });
  return { lessons, done, byPhase, reports: reports ?? 0, records: records ?? 0 };
}

/**
 * Envoie les étapes dues (une étape manquée pendant un week-end part au
 * prochain passage, dans la limite de 3 jours). Chaque étape n'est envoyée
 * qu'une fois : la notification de l'étape sert de marqueur.
 */
export async function runOnboarding(today: string): Promise<{ sent: number }> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("staff_members")
    .select("user_id, owner_id, role_key, full_name, email, contract_signed_at")
    .eq("status", "actif")
    .not("contract_signed_at", "is", null);
  const members = (data ?? []) as Member[];
  let sent = 0;

  for (const m of members) {
    const age = daysBetween(m.contract_signed_at, today);
    const due = STEPS.filter((s) => age >= s.day && age <= s.day + 3);
    if (due.length === 0) continue;
    const { data: already } = await admin
      .from("notifications")
      .select("type")
      .eq("user_id", m.user_id)
      .in("type", due.map((s) => `staff_onboarding_${s.key}`));
    const sentKeys = new Set(((already ?? []) as { type: string }[]).map((r) => r.type));
    const todo = due.filter((s) => !sentKeys.has(`staff_onboarding_${s.key}`));
    if (todo.length === 0) continue;

    const pr = await progressFor(admin, m);
    // Une seule étape à la fois : la plus récente due.
    const step = todo[todo.length - 1];
    const ok = await sendBrevoEmail({ to: m.email, subject: step.subject(m), htmlContent: wrapBrandedEmail(step.body(m, pr)) });
    if (!ok) continue;
    sent++;
    // Marqueur d'envoi, aussi visible dans la cloche de la recrue.
    await notifyUser(m.user_id, { type: `staff_onboarding_${step.key}`, title: step.subject(m), body: "Ton point d'étape est dans ta boîte mail.", url: "/equipe/formation" }).catch(() => {});
    // Étapes sautées (plusieurs dues d'un coup) : marquées pour ne jamais repartir.
    for (const s of todo.slice(0, -1)) {
      await admin.from("notifications").insert({ user_id: m.user_id, type: `staff_onboarding_${s.key}`, title: s.subject(m), body: "Étape passée.", url: "/equipe/formation" }).then(() => {}, () => {});
    }

    if (step.founder) {
      const lines = [
        `<strong>${escapeHtml(m.full_name)}</strong> (${escapeHtml(roleTitle(m))}), jour ${age} dans l'équipe.`,
        ...pr.byPhase.filter((b) => b.total > 0).map((b) => `${escapeHtml(b.label)} : ${b.done}/${b.total} leçons`),
        `${pr.reports} rapport(s) envoyé(s), ${pr.records} fiche(s) dans son espace.`,
        step.key === "j28" ? "Cale le point du premier mois avec lui ou elle." : step.key === "j90" ? "C'est l'évaluation des 3 mois." : "",
        `<a href="${APP_URL}/dashboard/coach/admin/equipe/${m.user_id}" style="color:#E01E1E">Ouvrir sa fiche</a>`,
      ].filter(Boolean);
      await notifyAdmin(`Intégration : ${m.full_name}, jour ${age}`, lines);
      await notifyUser(m.owner_id, { type: "staff", title: `Intégration de ${m.full_name}`, body: `Jour ${age} : ${pr.done.size}/${pr.lessons.length} leçons, ${pr.reports} rapport(s).`, url: `/dashboard/coach/admin/equipe/${m.user_id}` }).catch(() => {});
    }
  }
  return { sent };
}
