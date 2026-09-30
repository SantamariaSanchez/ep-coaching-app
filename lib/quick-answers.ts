import { createAdminClient } from "@/lib/supabase-admin";
import { todayInParis } from "@/lib/dates";
import { computePayroll } from "@/lib/staff-pay";

// Réponses rapides de la recherche (2026-09-30, "si je veux savoir mon
// poids sur la semaine, bam c'est hyper simple") : quelques chiffres clés
// calculés pour la personne connectée, trouvés en tapant un mot
// ("poids", "calories", "leads"...). Toujours sur userId, lu depuis la
// session par la route appelante.

export interface QuickAnswer {
  key: string;
  keywords: string[];
  title: string;
  value: string;
  detail: string | null;
  href: string;
}

function shift(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function mondayOf(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7;
  return shift(date, -dow);
}

const avg = (l: number[]) => (l.length ? l.reduce((a, b) => a + b, 0) / l.length : null);
const fr = (n: number, digits = 0) => n.toLocaleString("fr-FR", { maximumFractionDigits: digits, minimumFractionDigits: digits });

export async function getQuickAnswers(userId: string, role: "coach" | "client", isFounder: boolean): Promise<QuickAnswer[]> {
  const admin = createAdminClient();
  const today = todayInParis();
  const monday = mondayOf(today);
  const prevMonday = shift(monday, -7);
  const base = role === "coach" ? "/dashboard/coach/moi" : "/dashboard/client";
  const weekHref = `${base}/semaine`;

  const [{ data: logs }, { data: foods }, { data: sessions }] = await Promise.all([
    admin.from("daily_logs").select("log_date, weight_morning, sleep_hours, steps").eq("client_id", userId).gte("log_date", prevMonday).lte("log_date", today),
    admin.from("food_logs").select("logged_at, calories").eq("client_id", userId).gte("logged_at", monday).lte("logged_at", today),
    admin.from("sessions").select("id").eq("client_id", userId).eq("is_completed", true).gte("session_date", monday).lte("session_date", today),
  ]);
  const rows = (logs ?? []) as { log_date: string; weight_morning: number | null; sleep_hours: number | null; steps: number | null }[];
  const week = rows.filter((r) => r.log_date >= monday);
  const prev = rows.filter((r) => r.log_date < monday);
  const nums = (l: typeof rows, k: "weight_morning" | "sleep_hours" | "steps") => l.map((r) => r[k]).filter((v): v is number => typeof v === "number");

  const out: QuickAnswer[] = [];

  const w = avg(nums(week, "weight_morning"));
  const wPrev = avg(nums(prev, "weight_morning"));
  out.push({
    key: "poids",
    keywords: ["poids", "pesée", "kg", "balance", "masse"],
    title: "Mon poids cette semaine",
    value: w !== null ? `${fr(w, 1)} kg en moyenne` : "Pas encore de pesée",
    detail: w !== null && wPrev !== null ? `${w - wPrev > 0 ? "+" : ""}${fr(w - wPrev, 1)} kg par rapport à la semaine dernière` : null,
    href: weekHref,
  });

  const byDay = new Map<string, number>();
  for (const f of (foods ?? []) as { logged_at: string; calories: number | null }[]) byDay.set(f.logged_at, (byDay.get(f.logged_at) ?? 0) + Number(f.calories ?? 0));
  const kcalDays = [...byDay.values()].filter((v) => v > 0);
  const total = kcalDays.reduce((a, b) => a + b, 0);
  out.push({
    key: "calories",
    keywords: ["calories", "kcal", "manger", "mangé", "nutrition", "repas", "macros"],
    title: "Mes calories cette semaine",
    value: kcalDays.length ? `${fr(total)} kcal au total` : "Aucun repas noté cette semaine",
    detail: kcalDays.length ? `${fr(total / kcalDays.length)} kcal par jour en moyenne sur ${kcalDays.length} jour${kcalDays.length > 1 ? "s" : ""}` : null,
    href: role === "coach" ? "/dashboard/coach/moi/nutrition" : "/dashboard/client/nutrition",
  });

  const sleep = avg(nums(week, "sleep_hours"));
  out.push({
    key: "sommeil",
    keywords: ["sommeil", "dormi", "dormir", "nuit"],
    title: "Mon sommeil cette semaine",
    value: sleep !== null ? `${Math.floor(sleep)} h ${String(Math.round((sleep % 1) * 60)).padStart(2, "0")} par nuit` : "Pas encore noté",
    detail: null,
    href: `${base}/tracking`,
  });

  const steps = avg(nums(week, "steps"));
  out.push({
    key: "pas",
    keywords: ["pas", "marche", "steps", "neat"],
    title: "Mes pas cette semaine",
    value: steps !== null ? `${fr(steps)} pas par jour` : "Pas encore notés",
    detail: null,
    href: `${base}/steps`,
  });

  const count = (sessions ?? []).length;
  out.push({
    key: "seances",
    keywords: ["séance", "seance", "entraînement", "entrainement", "training", "muscu"],
    title: "Mes séances cette semaine",
    value: `${count} séance${count > 1 ? "s" : ""} terminée${count > 1 ? "s" : ""}`,
    detail: null,
    href: role === "coach" ? "/dashboard/coach/moi/programme" : "/dashboard/client/program",
  });

  if (role !== "coach") return out;

  // ── Coach ──────────────────────────────────────────────────────────────
  const { data: clients } = await admin.from("profiles").select("id, subscription_status").eq("coach_id", userId).eq("role", "client").neq("id", userId);
  const list = (clients ?? []) as { id: string; subscription_status: string | null }[];
  const paying = list.filter((c) => c.subscription_status === "active").length;
  out.push({
    key: "clients",
    keywords: ["clients", "client", "membres", "payants", "portefeuille"],
    title: "Mes clients",
    value: `${paying} client${paying > 1 ? "s" : ""} payant${paying > 1 ? "s" : ""}`,
    detail: `${list.length} personne${list.length > 1 ? "s" : ""} suivie${list.length > 1 ? "s" : ""} au total`,
    href: "/dashboard/coach/clients",
  });
  if (list.length) {
    const { count: waiting } = await admin
      .from("check_ins")
      .select("id", { count: "exact", head: true })
      .is("coach_replied_at", null)
      .gte("week_start", shift(today, -21))
      .in("client_id", list.map((c) => c.id));
    out.push({
      key: "bilans",
      keywords: ["bilan", "bilans", "check-in", "checkin", "répondre", "retours"],
      title: "Bilans hebdo à traiter",
      value: `${waiting ?? 0} en attente de ta réponse`,
      detail: null,
      href: "/dashboard/coach/prioritaires",
    });
  }

  // Paie de l'équipe (staff), si le coach en a une.
  try {
    const pay = await computePayroll(userId);
    if (pay.lines.length) {
      const top = [...pay.lines].sort((a, b) => b.total - a.total).slice(0, 3);
      out.push({
        key: "paie",
        keywords: ["paie", "payer", "salaire", "rémunération", "remuneration", "commission", "head", "closer", "setter", "équipe", "equipe"],
        title: "Paie de l'équipe ce mois",
        value: `${fr(pay.total)} € au total`,
        detail: top.map((l) => `${l.name} (${l.roleTitle}) : ${fr(l.total)} €`).join(" · "),
        href: "/dashboard/coach/mon-equipe",
      });
    }
  } catch {
    // Pas d'équipe ou lecture impossible : pas de réponse rapide.
  }

  if (isFounder) {
    const { data: leads } = await admin.from("leads").select("lead_magnet_slug, created_at").gte("created_at", `${shift(today, -30)}T00:00:00Z`);
    const bySlug = new Map<string, number>();
    for (const l of (leads ?? []) as { lead_magnet_slug: string | null }[]) {
      const k = l.lead_magnet_slug ?? "autre";
      bySlug.set(k, (bySlug.get(k) ?? 0) + 1);
    }
    const top = [...bySlug.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
    out.push({
      key: "leads",
      keywords: ["leads", "lead", "prospects", "vidéo", "video", "youtube", "reel", "acquisition", "ressource"],
      title: "Mes leads (30 derniers jours)",
      value: `${(leads ?? []).length} lead${(leads ?? []).length > 1 ? "s" : ""}`,
      detail: top.length ? `Top : ${top.map(([k, n]) => `${k} (${n})`).join(", ")}` : null,
      href: "/dashboard/coach/admin/leads",
    });
  }
  return out;
}
