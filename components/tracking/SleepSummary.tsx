import { getT } from "@/lib/i18n-server";
import { Moon, Clock, Sparkles } from "lucide-react";

export interface SleepNight {
  date: string;
  hours: number | null;
  bedtime: string | null; // "HH:MM"
  rating: number | null;
}

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  // Une heure de coucher après minuit compte comme « tard », pas comme tôt.
  return (h < 12 ? h + 24 : h) * 60 + m;
};
const fmtMin = (min: number) => {
  const m = Math.round(min) % (24 * 60);
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

// Le sommeil en un coup d'œil (2026-10-08) : pas de saisie ici, les nuits
// viennent du bilan du jour (ou de la bague Oura). Trois chiffres et une
// phrase qui dit ce que ça veut dire et quoi faire.
export default async function SleepSummary({ nights }: { nights: SleepNight[] }) {
  const t = await getT();
  const withHours = nights.filter((n) => n.hours != null && n.hours > 0);
  const last7 = withHours.slice(-7);
  const prev7 = withHours.slice(-14, -7);
  const avg = (xs: SleepNight[]) => (xs.length ? xs.reduce((s, n) => s + (n.hours ?? 0), 0) / xs.length : null);
  const avg7 = avg(last7);
  const avgPrev = avg(prev7);
  const beds = nights.slice(-14).filter((n) => n.bedtime).map((n) => toMin(n.bedtime!));
  const bedAvg = beds.length ? beds.reduce((s, v) => s + v, 0) / beds.length : null;
  const spread = beds.length >= 3 && bedAvg != null ? Math.sqrt(beds.reduce((s, v) => s + (v - bedAvg) ** 2, 0) / beds.length) : null;
  const short = last7.filter((n) => (n.hours ?? 0) < 7).length;

  if (!withHours.length) {
    return (
      <div className="rounded-2xl p-4 border border-[#890404]/25 bg-[#120000]/80">
        <p className="text-sm font-bold text-white">{t("Pas encore de nuit enregistrée")}</p>
        <p className="text-[12.5px] text-[#F5EDED]/55 mt-1 leading-relaxed">
          {t("Ton sommeil se remplit tout seul avec ton bilan du matin (ou ta bague Oura). Rien à saisir ici : reviens dans quelques jours pour voir tes tendances.")}
        </p>
      </div>
    );
  }

  // Verdict : le point le plus important d'abord.
  let verdict: string;
  if (avg7 != null && avg7 < 6.5) verdict = t("Tu dors trop peu : {h} h en moyenne. En dessous de 7 h, la faim augmente, la récup et la force baissent. Priorité numéro un : avancer ton coucher de 30 minutes.", { h: avg7.toFixed(1).replace(".", ",") });
  else if (spread != null && spread > 60) verdict = t("Ta durée est correcte, mais tes horaires bougent beaucoup (plus d'une heure d'écart d'un soir à l'autre). Un coucher régulier compte autant que la durée.");
  else if (avg7 != null && avg7 < 7) verdict = t("Presque bon : {h} h en moyenne. Encore 20 à 30 minutes par nuit et tu es dans la zone idéale (7 à 9 h).", { h: avg7.toFixed(1).replace(".", ",") });
  else verdict = t("Bon sommeil : {h} h en moyenne, dans la zone idéale. Garde ces horaires, c'est là que se font la récup et les progrès.", { h: (avg7 ?? 0).toFixed(1).replace(".", ",") });

  const delta = avg7 != null && avgPrev != null ? avg7 - avgPrev : null;

  return (
    <div className="rounded-2xl p-4 border border-[#818cf8]/20" style={{ background: "linear-gradient(160deg, rgba(49,46,129,0.22), rgba(17,0,0,0.85))" }}>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/45 flex items-center gap-1"><Moon size={11} /> {t("7 nuits")}</p>
          <p className="text-2xl font-black text-white tabular-nums">{avg7 != null ? `${avg7.toFixed(1).replace(".", ",")} h` : "N/A"}</p>
          {delta != null && Math.abs(delta) >= 0.1 && (
            <p className="text-[11px] font-bold" style={{ color: delta > 0 ? "#4ade80" : "#fb923c" }}>{delta > 0 ? "+" : ""}{delta.toFixed(1).replace(".", ",")} h {t("vs avant")}</p>
          )}
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/45 flex items-center gap-1"><Clock size={11} /> {t("Coucher")}</p>
          <p className="text-2xl font-black text-white tabular-nums">{bedAvg != null ? fmtMin(bedAvg) : "N/A"}</p>
          {spread != null && <p className="text-[11px] text-[#F5EDED]/50">± {Math.round(spread)} min</p>}
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/45">{t("Nuits courtes")}</p>
          <p className="text-2xl font-black tabular-nums" style={{ color: short >= 3 ? "#fb923c" : "#fff" }}>{short}/{last7.length}</p>
          <p className="text-[11px] text-[#F5EDED]/50">{t("moins de 7 h")}</p>
        </div>
      </div>
      <p className="mt-3 flex gap-2 text-[13px] leading-relaxed text-[#F5EDED]/80">
        <Sparkles size={14} className="text-[#a5b4fc] shrink-0 mt-0.5" />
        <span>{verdict}</span>
      </p>
      {/* 14 dernières nuits en barres : la tendance se lit sans graphique compliqué. */}
      <div className="flex items-end gap-1 h-14 mt-3" aria-hidden>
        {nights.slice(-14).map((n) => {
          const h = n.hours ?? 0;
          return (
            <div key={n.date} className="flex-1 rounded-sm" style={{ height: h ? `${Math.max(12, Math.min(100, ((h - 4) / 6) * 100))}%` : "6%", background: !h ? "rgba(245,237,237,0.08)" : h < 7 ? "rgba(251,146,60,0.7)" : "rgba(129,140,248,0.75)" }} title={`${n.date} : ${h || "?"} h`} />
          );
        })}
      </div>
      <p className="text-[10px] text-[#F5EDED]/35 mt-1">{t("14 dernières nuits. Orange : moins de 7 h.")}</p>
    </div>
  );
}

// Comprendre son sommeil : l'essentiel, sans jargon.
export async function SleepUnderstand() {
  const t = await getT();
  const items = [
    ["Pourquoi c'est la base", "C'est pendant le sommeil profond que ton corps répare les muscles et libère l'hormone de croissance. Mal dormir, c'est perdre une partie de ta séance."],
    ["Sommeil et faim", "Une nuit courte augmente la faim et l'envie de sucre le lendemain. Si tu sèches, dormir est aussi important que compter tes calories."],
    ["La règle des horaires", "Se coucher et se lever à la même heure, même le week-end, règle ton horloge interne. Tu t'endors plus vite et tu te réveilles moins fatigué."],
    ["Les 3 ennemis du soir", "La caféine après 14 h, les écrans lumineux dans le lit et un gros repas juste avant de dormir. Garde 2 à 3 heures entre ton dernier repas et le coucher."],
    ["Chambre idéale", "Noire, silencieuse et fraîche (autour de 18 °C). Un bruit de fond régulier aide si tu as un environnement bruyant."],
  ];
  return (
    <section>
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/40 mb-2">{t("Comprendre ton sommeil")}</p>
      <div className="rounded-2xl border border-[#890404]/25 bg-[#120000]/80 divide-y divide-[#890404]/15">
        {items.map(([title, body]) => (
          <details key={title} className="group px-4 py-3">
            <summary className="list-none cursor-pointer flex items-center justify-between text-[13.5px] font-bold text-white">
              {t(title)}
              <span className="text-[#F5EDED]/35 group-open:rotate-45 transition-transform text-lg leading-none">+</span>
            </summary>
            <p className="text-[12.5px] text-[#F5EDED]/60 leading-relaxed mt-2">{t(body)}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
