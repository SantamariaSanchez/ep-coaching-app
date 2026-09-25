"use client";

import { useState } from "react";

const eur = (v: number) => `${Math.round(v).toLocaleString("fr-FR")} €`;

function Field({ label, value, onChange, suffix }: { label: string; value: string; onChange: (v: string) => void; suffix: string }) {
  return (
    <label style={{ display: "block" }}>
      <span style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(245,237,237,0.45)", marginBottom: 5 }}>{label}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <input type="number" min={0} inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} className="ep-input" aria-label={label} />
        <span style={{ fontSize: 12, color: "rgba(245,237,237,0.5)", minWidth: 16 }}>{suffix}</span>
      </span>
    </label>
  );
}

function Out({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  return (
    <div className="ep-card" style={{ padding: "12px 14px" }}>
      <p style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(245,237,237,0.4)", margin: "0 0 4px" }}>{label}</p>
      <p style={{ fontSize: 19, fontWeight: 900, margin: 0, color: tone === "good" ? "#4ade80" : tone === "bad" ? "#f87171" : "#F5EDED" }}>{value}</p>
    </div>
  );
}

// Outil du Growth Manager : ce que donne un budget, et le budget qu'il faut
// pour un objectif de ventes, à partir de ses propres taux.
export default function Calculator() {
  const [budget, setBudget] = useState("500");
  const [cpl, setCpl] = useState("8");
  const [conversion, setConversion] = useState("5");
  const [basket, setBasket] = useState("200");
  const [goal, setGoal] = useState("5");

  const b = Number(budget) || 0;
  const c = Number(cpl) || 0;
  const conv = (Number(conversion) || 0) / 100;
  const basketValue = Number(basket) || 0;
  const leads = c > 0 ? b / c : 0;
  const sales = leads * conv;
  const revenue = sales * basketValue;
  const roas = b > 0 ? revenue / b : 0;
  const neededBudget = conv > 0 ? ((Number(goal) || 0) / conv) * c : 0;

  return (
    <div>
      <div className="ep-card-hero" style={{ padding: "16px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 12, marginBottom: 14 }}>
        <Field label="Budget" value={budget} onChange={setBudget} suffix="€" />
        <Field label="Coût par lead" value={cpl} onChange={setCpl} suffix="€" />
        <Field label="Leads qui achètent" value={conversion} onChange={setConversion} suffix="%" />
        <Field label="Panier moyen" value={basket} onChange={setBasket} suffix="€" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 10, marginBottom: 22 }}>
        <Out label="Leads attendus" value={Math.round(leads).toLocaleString("fr-FR")} />
        <Out label="Ventes attendues" value={sales.toFixed(1)} />
        <Out label="CA généré" value={eur(revenue)} tone="good" />
        <Out label="ROAS" value={roas.toFixed(2)} tone={roas >= 1 ? "good" : "bad"} />
      </div>
      <div className="ep-card" style={{ padding: "16px", display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 14 }}>
        <div style={{ width: 200 }}>
          <Field label="Objectif de ventes" value={goal} onChange={setGoal} suffix="" />
        </div>
        <p style={{ fontSize: 13, color: "rgba(245,237,237,0.7)", margin: 0, lineHeight: 1.6 }}>
          Budget nécessaire avec tes taux actuels : <strong style={{ color: "#F5EDED", fontSize: 16 }}>{eur(neededBudget)}</strong>
        </p>
      </div>
    </div>
  );
}
