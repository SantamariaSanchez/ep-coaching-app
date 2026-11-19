import Link from "next/link";
import { getT } from "@/lib/i18n-server";
import { formatKg, type FirstMonth } from "@/lib/first-month";

// « Ton premier mois » : ce qui a déjà changé, en chiffres réels (jour 21 à
// 45). Une victoire de travail, jamais une remarque sur le corps.
export default async function FirstMonthCard({ data }: { data: FirstMonth | null }) {
  if (!data) return null;
  const t = await getT();
  return (
    <section className="ep-card animate-fade-up" style={{ padding: 16, marginBottom: 16 }}>
      <p className="ep-section-title" style={{ marginBottom: 6 }}>{t("Ton premier mois")}</p>
      <p style={{ margin: "0 0 12px", fontSize: 14, lineHeight: 1.45 }}>
        {t("Jour {day}. Tu as fait {n} séance(s), sur {w} semaine(s) différentes. Ça, c'est déjà un résultat.", { day: data.day, n: data.sessionsDone, w: data.activeWeeks })}
      </p>
      {data.liftsUp.length > 0 && (
        <ul style={{ margin: "0 0 12px", paddingLeft: 18, display: "grid", gap: 4, fontSize: 13.5 }}>
          {data.liftsUp.map((l) => (
            <li key={l.name}>
              {t("{name} : de {from} à {to}", { name: l.name, from: formatKg(l.from), to: formatKg(l.to) })}
            </li>
          ))}
        </ul>
      )}
      {data.bilanDays > 0 && (
        <p style={{ margin: "0 0 12px", fontSize: 13, opacity: 0.8 }}>{t("{n} bilan(s) du matin remplis.", { n: data.bilanDays })}</p>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px" }}>
        <Link href="/dashboard/client/progress" style={{ fontSize: 13, fontWeight: 700, color: "var(--ep-violet)" }}>
          {t("Voir ma progression")}
        </Link>
        {/* Moment fort du parcours : c'est là qu'on demande une recommandation (transcripts Hormozi). */}
        <Link href="/dashboard/client/profile#parrainage" style={{ fontSize: 13, fontWeight: 700, color: "var(--ep-violet)" }}>
          {t("Une amie veut s'y mettre aussi ? Invite-la")}
        </Link>
      </div>
    </section>
  );
}
