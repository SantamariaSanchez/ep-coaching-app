import Link from "next/link";
import {
  CalendarDays, Utensils, Dumbbell, Radio, BarChart3, Users, Clapperboard, ClipboardCheck, ShoppingBasket, Medal, ChevronRight,
  TrendingUp, TrendingDown, Minus, MessageCircle, Eye,
} from "lucide-react";
import { getT } from "@/lib/i18n-server";
import {
  loadAgenda, loadMeal, loadWorkout, loadLive, loadSocial, loadDesk, loadContent, loadBody, loadShopping, loadPrep,
} from "@/lib/home-widgets";

// Widgets de l'accueil (2026-10-08). Règles : une carte = une info utile
// tout de suite (pas un bouton), le chiffre clé en gros, une ligne
// d'explication en clair, toute la carte cliquable vers l'écran complet.
// Chaque widget charge ses propres données dans sa Suspense : l'accueil
// s'affiche immédiatement et se remplit bloc par bloc.

const fr = (n: number) => Math.round(n).toLocaleString("fr-FR");

function Card({ href, icon: Icon, title, aside, children, tone = "#F06060" }: { href: string; icon: React.ElementType; title: string; aside?: React.ReactNode; children: React.ReactNode; tone?: string }) {
  return (
    <Link href={href} className="ep-card ep-press" style={{ display: "block", padding: "12px 14px 13px", textDecoration: "none", color: "#F5EDED", minWidth: 0 }}>
      <span style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
        <Icon size={14} style={{ color: tone, flexShrink: 0 }} strokeWidth={2.2} />
        <span style={{ flex: 1, minWidth: 0, fontSize: 10.5, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(245,237,237,0.5)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</span>
        {aside}
        <ChevronRight size={14} style={{ color: "rgba(245,237,237,0.22)", flexShrink: 0 }} />
      </span>
      {children}
    </Link>
  );
}

const big: React.CSSProperties = { display: "block", fontSize: 17, fontWeight: 900, letterSpacing: "-0.02em", lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
const sub: React.CSSProperties = { display: "block", fontSize: 12, color: "rgba(245,237,237,0.55)", lineHeight: 1.45, marginTop: 3 };
const line: React.CSSProperties = { display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, lineHeight: 1.5, minWidth: 0 };

export function WidgetSkeleton({ h = 96 }: { h?: number }) {
  return <div className="ep-skeleton" style={{ height: h, borderRadius: 16 }} />;
}

// ── Agenda ─────────────────────────────────────────────────────────────────
export async function AgendaW({ userId, href }: { userId: string; href: string }) {
  const [t, a] = await Promise.all([getT(), loadAgenda(userId)]);
  if (!a.current && !a.upcoming.length) {
    return (
      <Card href={href} icon={CalendarDays} title={t("Agenda")}>
        <span style={big}>{a.total ? t("Journée terminée") : t("Rien de prévu aujourd'hui")}</span>
        <span style={sub}>{t("Touche pour organiser ta journée")}</span>
      </Card>
    );
  }
  return (
    <Card href={href} icon={CalendarDays} title={t("Agenda")}>
      {a.current && (
        <span style={{ display: "block", marginBottom: a.upcoming.length ? 9 : 0 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 7, height: 7, borderRadius: 99, background: "#E01E1E", boxShadow: "0 0 8px rgba(224,30,30,0.8)", flexShrink: 0 }} />
            <span style={{ ...big, flex: 1, minWidth: 0 }}>{a.current.label}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(245,237,237,0.5)", flexShrink: 0 }}>{t("jusqu'à")} {a.current.end}</span>
          </span>
          <span style={{ display: "block", height: 3, borderRadius: 99, background: "rgba(245,237,237,0.08)", marginTop: 7, overflow: "hidden" }}>
            <span style={{ display: "block", height: "100%", width: `${Math.round(a.current.progress * 100)}%`, background: "linear-gradient(90deg, #890404, #E01E1E)", borderRadius: 99 }} />
          </span>
        </span>
      )}
      {a.upcoming.map((b) => (
        <span key={`${b.start}${b.label}`} style={line}>
          <span style={{ width: 40, flexShrink: 0, fontSize: 12, fontWeight: 800, color: "rgba(245,237,237,0.45)", fontVariantNumeric: "tabular-nums" }}>{b.start}</span>
          <span style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: 600 }}>{b.label}</span>
        </span>
      ))}
    </Card>
  );
}

// ── Repas ──────────────────────────────────────────────────────────────────
export async function MealW({ userId, href }: { userId: string; href: string }) {
  const [t, m] = await Promise.all([getT(), loadMeal(userId)]);
  if (!m) {
    return (
      <Card href={href} icon={Utensils} title={t("Repas")} tone="#4ade80">
        <span style={big}>{t("Pas encore de plan")}</span>
        <span style={sub}>{t("Calcule tes besoins en 1 minute")}</span>
      </Card>
    );
  }
  if (!m.slot) {
    return (
      <Card href={href} icon={Utensils} title={t("Repas")} tone="#4ade80">
        <span style={big}>{t("Journée bouclée")}</span>
        <span style={sub}>{t("Tous les repas du plan sont passés")}</span>
      </Card>
    );
  }
  return (
    <Card href={href} icon={Utensils} title={t(m.label)} tone="#4ade80" aside={<span style={{ fontSize: 11.5, fontWeight: 800, color: "rgba(245,237,237,0.55)" }}>{fr(m.kcal)} kcal</span>}>
      {m.foods.slice(0, 4).map((f) => (
        <span key={f.name} style={line}>
          <span style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.name}</span>
          <span style={{ fontWeight: 900, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>{fr(f.grams)} g</span>
        </span>
      ))}
      {m.foods.length > 4 && <span style={sub}>{t("+ {n} autre(s)", { n: m.foods.length - 4 })}</span>}
    </Card>
  );
}

// ── Séance ─────────────────────────────────────────────────────────────────
export async function WorkoutW({ userId, href }: { userId: string; href: string }) {
  const [t, w] = await Promise.all([getT(), loadWorkout(userId)]);
  if (!w) {
    return (
      <Card href={href} icon={Dumbbell} title={t("Séance")}>
        <span style={big}>{t("Pas encore de programme")}</span>
        <span style={sub}>{t("Crée le tien ou pars d'un modèle")}</span>
      </Card>
    );
  }
  const when = w.when.replace("aujourd'hui", t("aujourd'hui")).replace("demain", t("demain"));
  return (
    <Card href={href} icon={Dumbbell} title={t("Séance")} aside={when ? <span style={{ fontSize: 11.5, fontWeight: 800, color: w.isToday ? "#F06060" : "rgba(245,237,237,0.55)" }}>{when}</span> : undefined}>
      <span style={big}>{w.label}</span>
      {w.exercises.length > 0 ? (
        <span style={{ display: "block", marginTop: 5 }}>
          {w.exercises.slice(0, 4).map((e) => (
            <span key={e.name} style={line}>
              <span style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "rgba(245,237,237,0.8)" }}>{e.name}</span>
              {e.sets != null && <span style={{ fontWeight: 800, color: "rgba(245,237,237,0.6)", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{e.sets} × {e.reps ?? "?"}</span>}
            </span>
          ))}
        </span>
      ) : (
        <span style={sub}>{t("Touche pour voir ta séance")}</span>
      )}
    </Card>
  );
}

// ── Live ───────────────────────────────────────────────────────────────────
export async function LiveW({ userId, role, coachId, href }: { userId: string; role: "coach" | "client"; coachId: string | null; href: string }) {
  const [t, l] = await Promise.all([getT(), loadLive(userId, role, coachId)]);
  if (!l) {
    if (role === "client") return null;
    return (
      <Card href={href} icon={Radio} title={t("Live")} tone="#c084fc">
        <span style={big}>{t("Aucun live prévu")}</span>
        <span style={sub}>{t("Planifie le prochain")}</span>
      </Card>
    );
  }
  const d = new Date(l.startsAt);
  const when = l.isNow ? t("En cours") : d.toLocaleString("fr-FR", { weekday: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
  return (
    <Card href={href} icon={Radio} title={t("Live")} tone="#c084fc" aside={<span style={{ fontSize: 11.5, fontWeight: 800, color: l.isNow ? "#f87171" : "rgba(245,237,237,0.55)" }}>{when}</span>}>
      <span style={big}>{l.title}</span>
    </Card>
  );
}

// ── Stats réseaux ──────────────────────────────────────────────────────────
function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const w = 96;
  const h = 34;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - (max === min ? h / 2 : ((v - min) / (max - min)) * (h - 4) - 2)}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden style={{ flexShrink: 0 }}>
      <polyline points={pts} fill="none" stroke="#E01E1E" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export async function StatsW({ userId, href }: { userId: string; href: string }) {
  const [t, s] = await Promise.all([getT(), loadSocial(userId)]);
  if (!s) return null;
  const up = s.delta7 > 0;
  const Trend = s.delta7 > 0 ? TrendingUp : s.delta7 < 0 ? TrendingDown : Minus;
  return (
    <Card href={href} icon={BarChart3} title={t("Stats réseaux")}>
      <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 26, fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.05 }}>{fr(s.followers)}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, color: up ? "#4ade80" : s.delta7 < 0 ? "#fb923c" : "rgba(245,237,237,0.5)", marginTop: 3 }}>
            <Trend size={13} /> {s.delta7 > 0 ? "+" : ""}{fr(s.delta7)} {t("abonnés en 7 jours")}
          </span>
        </span>
        <Sparkline values={s.series} />
      </span>
      <span style={{ ...sub, display: "flex", alignItems: "center", gap: 6 }}>
        <Eye size={12} /> {fr(s.views7)} {t("vues cette semaine")}
      </span>
      {s.staleSince && (
        <span style={{ ...sub, color: "#fbbf24" }}>{t("Données du {d} : synchro à relancer", { d: new Date(`${s.staleSince}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long" }) })}</span>
      )}
      {s.best && (
        <span style={{ ...sub, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {t("Meilleur post")} : <b style={{ color: "#F5EDED" }}>{fr(s.best.views)} {t("vues")}</b> · {s.best.caption}
        </span>
      )}
    </Card>
  );
}

// ── Clients ────────────────────────────────────────────────────────────────
export async function DeskW({ userId, isOwner, href }: { userId: string; isOwner: boolean; href: string }) {
  const [t, d] = await Promise.all([getT(), loadDesk(userId, isOwner)]);
  if (!d) return null;
  const todo = d.unread + d.pendingBilans;
  return (
    <Card href={href} icon={Users} title={t("Clients")} aside={todo ? <span style={{ fontSize: 11, fontWeight: 900, color: "#fff", background: "#E01E1E", borderRadius: 99, padding: "1px 7px" }}>{todo}</span> : undefined}>
      <span style={{ display: "block", fontSize: 24, fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.05 }}>{fr(d.members)}</span>
      <span style={sub}>{isOwner ? t("membres") : t("clients")}{d.newMembers7 ? ` · +${d.newMembers7} ${t("en 7 j")}` : ""}</span>
      {isOwner && <span style={sub}>{t("{n} lead(s) en 7 j", { n: d.leads7 })} · {t("{n} au total", { n: d.leadsTotal })}</span>}
      {d.unread > 0 && (
        <span style={{ ...sub, display: "flex", alignItems: "center", gap: 5, color: "#F06060", fontWeight: 700 }}>
          <MessageCircle size={12} /> {t("{n} message(s) non lu(s)", { n: d.unread })}
        </span>
      )}
      {d.pendingBilans > 0 && <span style={{ ...sub, color: "#fbbf24", fontWeight: 700 }}>{t("{n} bilan(s) à corriger", { n: d.pendingBilans })}</span>}
    </Card>
  );
}

// ── Contenu ────────────────────────────────────────────────────────────────
export async function ContentW({ userId, href }: { userId: string; href: string }) {
  const [t, c] = await Promise.all([getT(), loadContent(userId)]);
  if (!c) return null;
  return (
    <Card href={href} icon={Clapperboard} title={t("Contenu")} tone="#fb923c">
      <span style={{ display: "block", fontSize: 24, fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.05 }}>{fr(c.toFilm)}</span>
      <span style={sub}>{t("scripts prêts à tourner")}</span>
      {(c.newToday > 0 || c.filmed > 0) && (
        <span style={sub}>{[c.newToday ? t("+{n} aujourd'hui", { n: c.newToday }) : "", c.filmed ? t("{n} à monter", { n: c.filmed }) : ""].filter(Boolean).join(" · ")}</span>
      )}
    </Card>
  );
}

// ── Bilan du jour ──────────────────────────────────────────────────────────
export async function BodyW({ userId, href }: { userId: string; href: string }) {
  const [t, b] = await Promise.all([getT(), loadBody(userId)]);
  if (!b) return null;
  const Trend = b.trend7 == null ? Minus : b.trend7 > 0 ? TrendingUp : b.trend7 < 0 ? TrendingDown : Minus;
  return (
    <Card href={href} icon={ClipboardCheck} title={t("Bilan du jour")} tone="#60a5fa" aside={<span style={{ fontSize: 11.5, fontWeight: 800, color: b.doneToday ? "#4ade80" : "#fbbf24" }}>{b.doneToday ? t("Fait ✓") : t("À faire")}</span>}>
      {b.weight != null ? (
        <>
          <span style={{ display: "block", fontSize: 24, fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.05 }}>{b.weight.toLocaleString("fr-FR")} kg</span>
          {b.trend7 != null && (
            <span style={{ ...sub, display: "flex", alignItems: "center", gap: 5 }}>
              <Trend size={13} /> {b.trend7 > 0 ? "+" : ""}{b.trend7.toLocaleString("fr-FR")} kg {t("sur 7 jours (moyenne)")}
            </span>
          )}
        </>
      ) : (
        <>
          <span style={big}>{t("30 secondes")}</span>
          <span style={sub}>{t("Poids, sommeil, ressenti : de quoi suivre ta progression")}</span>
        </>
      )}
    </Card>
  );
}

// ── Courses ────────────────────────────────────────────────────────────────
export async function ShoppingW({ userId, href }: { userId: string; href: string }) {
  const [t, s] = await Promise.all([getT(), loadShopping(userId)]);
  if (!s) {
    return (
      <Card href={href} icon={ShoppingBasket} title={t("Courses")} tone="#4ade80">
        <span style={big}>{t("Ta liste de courses")}</span>
        <span style={sub}>{t("Faite à partir de ton plan, le stock baisse tout seul")}</span>
      </Card>
    );
  }
  return (
    <Card href={href} icon={ShoppingBasket} title={t("Courses")} tone="#4ade80">
      <span style={big}>{s.low.length ? t("{n} à racheter", { n: s.low.length }) : t("Stock à jour")}</span>
      {s.low.length > 0 && <span style={{ ...sub, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.low.slice(0, 4).join(", ")}</span>}
    </Card>
  );
}

// ── Prépa (compétition) ────────────────────────────────────────────────────
export async function PrepW({ userId, href }: { userId: string; href: string }) {
  const [t, p] = await Promise.all([getT(), loadPrep(userId)]);
  if (!p) return null;
  const photoDays = p.photoDays;
  return (
    <Card href={href} icon={Medal} title={t("Ma prépa")} tone="#fbbf24">
      <span style={big}>{p.phase ?? t("Construis ta road map")}</span>
      {p.daysLeft != null && <span style={sub}>{t("{n} jour(s) avant la fin de la phase", { n: Math.max(0, p.daysLeft) })}</span>}
      <span style={sub}>{photoDays == null ? t("Aucune photo de suivi pour l'instant") : photoDays === 0 ? t("Photos faites aujourd'hui ✓") : t("Dernières photos il y a {n} j", { n: photoDays })}</span>
    </Card>
  );
}
