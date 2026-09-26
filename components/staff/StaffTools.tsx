import { Wallet, AlertTriangle, ShieldCheck, Target, ListChecks } from "lucide-react";
import { SUBSCRIPTION_PLANS } from "@/lib/subscription-plans";
import { COACH_PLATFORM_PLANS } from "@/lib/coach-platform-plan";
import { POLES } from "@/lib/org-roles";
import { FORMATION_PAYMENT_URL } from "@/lib/stripe-products";
import { parisDate, type StaffRecord } from "@/lib/staff-kpis";
import { KINDS } from "@/lib/staff-roles";
import CopyField from "@/components/staff/CopyField";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://ep-coaching.vercel.app";

interface Offer {
  name: string;
  price: string;
  forWho: string;
  includes: string[];
  link: string | null;
  linkLabel: string;
  warning?: string;
}

// Onglet "Offres et paiement" des sales. Interne à l'équipe : les prix du
// coaching et des formations ne s'affichent jamais publiquement, ils se
// donnent ici, en appel.
export function OffersPanel() {
  const physique = SUBSCRIPTION_PLANS.find((p) => p.id === "physique");
  const business = SUBSCRIPTION_PLANS.find((p) => p.id === "business");
  const offers: Offer[] = [
    {
      name: "Coaching individuel physique",
      price: physique?.priceLabel ?? "200€ / mois",
      forWho: "Quelqu'un qui veut transformer son physique avec un vrai suivi humain, et qui a déjà essayé seul sans tenir.",
      includes: ["Programme d'entraînement et nutrition construits sur sa situation", "Bilan chaque semaine et ajustements", "Messagerie directe avec son coach", "Toute l'appli EP Coaching"],
      link: physique?.url ?? null,
      linkLabel: "Lien de paiement",
    },
    {
      name: "Coaching business",
      price: business?.priceLabel ?? "500€ / mois",
      forWho: "Un coach qui veut lancer ou développer son activité, accompagné par Santamaria en personne.",
      includes: ["Accompagnement individuel par Santamaria", "Offre, acquisition, vente et organisation", "L'appli EP Coaching pour suivre ses propres clients"],
      link: business?.url ?? null,
      linkLabel: "Lien de paiement",
    },
    ...COACH_PLATFORM_PLANS.map((p) => ({
      name: `Appli EP Coaching pour coachs, ${p.label}`,
      price: p.priceLabel,
      forWho: p.id === "premium" ? "Un coach qui veut l'appli complète avec l'IA illimitée et les formations incluses." : "Un coach qui veut suivre ses clients dans l'appli, sans accompagnement.",
      includes: [p.sublabel],
      link: `${APP_URL}/auth/coach`,
      linkLabel: "Page d'inscription coach",
      warning: "Envoie toujours la page d'inscription, jamais le lien Stripe direct : sans inscription, le paiement passe mais aucun compte n'est activé.",
    })),
    {
      name: "Formation à l'unité",
      price: "100€ l'unité",
      forWho: "Quelqu'un qui veut apprendre un sujet précis sans suivi individuel. Incluse dans l'appli Premium.",
      includes: ["Accès à vie à la formation choisie"],
      link: FORMATION_PAYMENT_URL,
      linkLabel: "Lien de paiement",
      warning: "Demande au prospect quelle formation il veut et note-la dans sa fiche : le lien est le même pour toutes, c'est Santamaria qui ouvre l'accès à la bonne.",
    },
  ];

  return (
    <div>
      <div className="ep-card" style={{ padding: "12px 15px", marginBottom: 14, display: "flex", gap: 10, alignItems: "flex-start", borderColor: "rgba(250,204,21,0.3)" }}>
        <AlertTriangle size={16} style={{ color: "#facc15", flexShrink: 0, marginTop: 2 }} />
        <p style={{ fontSize: 12.5, color: "rgba(245,237,237,0.75)", margin: 0, lineHeight: 1.6 }}>
          Les prix du coaching et des formations ne sont jamais publiés (site, réseaux, messages publics). Tu les donnes en appel, une fois le besoin qualifié. Quand le prospect paie avec l&apos;email de sa fiche, la vente se close seule dans ton CRM.
        </p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 10 }}>
        {offers.map((o) => (
          <div key={o.name} className="ep-card" style={{ padding: "15px 16px" }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
              <p style={{ fontSize: 14, fontWeight: 900, color: "#F5EDED", margin: 0 }}>{o.name}</p>
              <p style={{ fontSize: 14, fontWeight: 900, color: "#facc15", margin: 0, whiteSpace: "nowrap" }}>
                <Wallet size={12} style={{ display: "inline", marginRight: 4, verticalAlign: "-1px" }} />
                {o.price}
              </p>
            </div>
            <p style={{ fontSize: 12, color: "rgba(245,237,237,0.6)", margin: "0 0 8px", lineHeight: 1.55 }}>{o.forWho}</p>
            <ul style={{ margin: "0 0 10px", paddingLeft: 16 }}>
              {o.includes.map((i) => (
                <li key={i} style={{ fontSize: 12, color: "rgba(245,237,237,0.7)", lineHeight: 1.55 }}>{i}</li>
              ))}
            </ul>
            {o.link && <CopyField label={o.linkLabel} value={o.link} />}
            {o.warning && <p style={{ fontSize: 11.5, color: "#facc15", margin: "8px 0 0", lineHeight: 1.5 }}>{o.warning}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function weekStart(date: string): string {
  const d = new Date(`${date}T12:00:00`);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}

// Livrables rangés par semaine de deadline : en retard, cette semaine, les
// 5 suivantes, puis sans date.
export function EditorialCalendar({ records }: { records: StaffRecord[] }) {
  const today = parisDate(new Date());
  const thisWeek = weekStart(today);
  const items = records.filter((r) => r.kind === "deliverable");
  const stage = (s: string) => KINDS.deliverable.stages.find((x) => x.value === s);
  const late = items.filter((r) => r.occurred_on && r.occurred_on < today && r.status !== "livre" && r.status !== "publie");
  const weeks: { key: string; label: string; list: StaffRecord[] }[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(`${thisWeek}T12:00:00`);
    d.setDate(d.getDate() + i * 7);
    const key = d.toISOString().slice(0, 10);
    const end = new Date(d);
    end.setDate(end.getDate() + 6);
    weeks.push({
      key,
      label: i === 0 ? "Cette semaine" : `Semaine du ${d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`,
      list: items.filter((r) => r.occurred_on && weekStart(r.occurred_on) === key && !late.includes(r)).sort((a, b) => (a.occurred_on ?? "").localeCompare(b.occurred_on ?? "")),
    });
  }
  const undated = items.filter((r) => !r.occurred_on && r.status !== "publie");

  const Row = ({ r }: { r: StaffRecord }) => {
    const st = stage(r.status);
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderTop: "1px solid rgba(245,237,237,0.05)" }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: "#E01E1E", minWidth: 58 }}>
          {r.occurred_on ? new Date(`${r.occurred_on}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" }) : ""}
        </span>
        <span style={{ flex: 1, fontSize: 12.5, color: "#F5EDED", fontWeight: 600 }}>{r.title}</span>
        <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", color: st?.color ?? "#999" }}>{st?.label ?? r.status}</span>
      </div>
    );
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 10 }}>
      {late.length > 0 && (
        <section className="ep-card" style={{ padding: "13px 15px", borderColor: "rgba(248,113,113,0.35)" }}>
          <p className="ep-label" style={{ margin: "0 0 6px", color: "#f87171" }}>En retard ({late.length})</p>
          {late.map((r) => <Row key={r.id} r={r} />)}
        </section>
      )}
      {weeks.map((w) => (
        <section key={w.key} className="ep-card" style={{ padding: "13px 15px" }}>
          <p className="ep-label" style={{ margin: "0 0 6px" }}>{w.label} ({w.list.length})</p>
          {w.list.length === 0 ? <p style={{ fontSize: 12, color: "rgba(245,237,237,0.35)", margin: "6px 0 0" }}>Rien de prévu.</p> : w.list.map((r) => <Row key={r.id} r={r} />)}
        </section>
      ))}
      {undated.length > 0 && (
        <section className="ep-card" style={{ padding: "13px 15px" }}>
          <p className="ep-label" style={{ margin: "0 0 6px" }}>Sans date ({undated.length})</p>
          {undated.map((r) => <Row key={r.id} r={r} />)}
        </section>
      )}
    </div>
  );
}

// Scorecards : la méthode "avant de voir un candidat, on écrit la mission,
// les résultats attendus et les non-négociables". Une par poste.
export function ScorecardsPanel({ onlyPoleKeys }: { onlyPoleKeys?: string[] }) {
  const poles = onlyPoleKeys ? POLES.filter((p) => onlyPoleKeys.includes(p.key)) : POLES;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {poles.flatMap((pole) =>
        pole.roles.map((r) => (
          <details key={r.key} className="ep-card" style={{ padding: "12px 15px" }}>
            <summary style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 8, listStyle: "none" }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: pole.color }} />
              <span style={{ fontSize: 13.5, fontWeight: 800, color: "#F5EDED" }}>{r.title}</span>
              <span style={{ fontSize: 11, color: "rgba(245,237,237,0.4)" }}>{pole.name}</span>
            </summary>
            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
              <div>
                <p className="ep-label" style={{ margin: "0 0 6px", display: "flex", gap: 6, alignItems: "center" }}><Target size={11} /> Mission</p>
                <p style={{ fontSize: 12.5, color: "rgba(245,237,237,0.75)", margin: 0, lineHeight: 1.6 }}>{r.mission}</p>
                <p style={{ fontSize: 11.5, color: "rgba(245,237,237,0.45)", margin: "6px 0 0" }}>Rattachement : {r.reportsTo}</p>
              </div>
              <div>
                <p className="ep-label" style={{ margin: "0 0 6px", display: "flex", gap: 6, alignItems: "center" }}><ListChecks size={11} /> Résultats attendus</p>
                <ul style={{ margin: 0, paddingLeft: 16 }}>{r.tasks.map((t) => <li key={t} style={{ fontSize: 12.5, color: "rgba(245,237,237,0.75)", lineHeight: 1.55 }}>{t}</li>)}</ul>
              </div>
              <div>
                <p className="ep-label" style={{ margin: "0 0 6px", display: "flex", gap: 6, alignItems: "center" }}><ShieldCheck size={11} /> Non négociable</p>
                <ul style={{ margin: 0, paddingLeft: 16 }}>{r.nonNegotiable.map((t) => <li key={t} style={{ fontSize: 12.5, color: "rgba(245,237,237,0.75)", lineHeight: 1.55 }}>{t}</li>)}</ul>
                <p style={{ fontSize: 11.5, color: "rgba(245,237,237,0.45)", margin: "8px 0 0", lineHeight: 1.5 }}>
                  Mise en situation : donne au candidat une vraie tâche du poste (un lead à qualifier, un texte à écrire, un ticket à traiter) et note-la sur ces critères.
                </p>
              </div>
            </div>
          </details>
        ))
      )}
    </div>
  );
}
