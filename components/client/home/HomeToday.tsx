import Link from "next/link";
import { getT } from "@/lib/i18n-server";
import { AGENDA_PRESETS, AGENDA_ICON_MAP } from "@/lib/agenda-presets";
import { KIND_STYLE, formatSteps } from "@/lib/agenda-engine";
import { withAlpha } from "@/lib/theme-color";
import { shortHour } from "@/lib/program-week";
import { dayStrip, minutesLabel, pickNow, type HomeBlock, type HomeDayData, type HomeTodo } from "@/lib/client-home";
import { HomeStartSession } from "@/components/client/home/HomeClient";
import MoveSession from "@/components/ui/MoveSession";
import { isoWeekday } from "@/lib/program-week";
import {
  Apple, ArrowRight, CalendarPlus, CheckCircle2, ChevronRight, Circle, ClipboardCheck, ClipboardList, Clock, Droplet,
  Dumbbell, Footprints, ListChecks, MessageCircle, Moon, Sparkles, Trophy, UtensilsCrossed, type LucideIcon,
} from "lucide-react";

// Sections de l'accueil « Aujourd'hui » (refonte 2026-10-21) : maintenant,
// la journée en une bande, séance et nutrition du jour, puis ce qui attend.
// Données calculées par lib/client-home.ts ; ici, uniquement l'affichage.

const C = "/dashboard/client";

const KIND_ICON: Record<string, LucideIcon> = {
  seance: Dumbbell,
  repas: UtensilsCrossed,
  trajet: Footprints,
  travail: AGENDA_ICON_MAP.travail,
  autre: Sparkles,
};

export function blockColor(b: Pick<HomeBlock, "icon" | "kind">): string {
  const preset = AGENDA_PRESETS.find((p) => p.key === b.icon);
  return preset?.color ?? KIND_STYLE[b.kind]?.color ?? "rgba(var(--ep-ink-rgb),0.45)";
}

function blockIcon(b: Pick<HomeBlock, "icon" | "kind" | "label">): LucideIcon {
  if (/r[ée]veil/i.test(b.label)) return Moon;
  return (b.icon && AGENDA_ICON_MAP[b.icon]) || KIND_ICON[b.kind] || Clock;
}

function fmt(n: number): string {
  return Math.round(n).toLocaleString("fr-FR").replace(/ | /g, " ");
}

function IconTile({ icon: Icon, color, size = 34 }: { icon: LucideIcon; color: string; size?: number }) {
  return (
    <span
      style={{
        width: size, height: size, borderRadius: 10, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: withAlpha(color, "1f"), border: `1px solid ${withAlpha(color, "38")}`,
      }}
    >
      <Icon size={Math.round(size * 0.47)} strokeWidth={1.9} style={{ color }} />
    </span>
  );
}

// ── En-tête ──────────────────────────────────────────────────────────────

export function HomeHeader({
  eyebrow,
  title,
  meta,
  tools,
}: {
  eyebrow: string;
  title: string;
  meta?: React.ReactNode;
  tools?: React.ReactNode;
}) {
  return (
    <header className="animate-fade-up" style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 18 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p className="ep-section-title" style={{ marginBottom: 4, lineHeight: "16px" }}>{eyebrow}</p>
        <h1 className="ep-h1" style={{ fontSize: 30, overflowWrap: "anywhere" }}>{title}</h1>
        {meta && (
          <div style={{ marginTop: 7, display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4px 10px", fontSize: 12, fontWeight: 600, color: "rgba(var(--ep-ink-rgb),0.5)" }}>
            {meta}
          </div>
        )}
      </div>
      {tools}
    </header>
  );
}

// ── Maintenant + la journée ──────────────────────────────────────────────

async function BlockCta({ block, day, primary }: { block: HomeBlock; day: HomeDayData; primary: boolean }) {
  const t = await getT();
  const session = day.training.today;
  if (block.action === "seance" && session) {
    return (
      <>
        <HomeStartSession session={session} />
        {session.state !== "done" && (
          <div style={{ marginTop: 4, display: "flex", justifyContent: "center" }}>
            <MoveSession dayId={session.dayId} days={day.training.schedule} todayDow={isoWeekday(day.date)} />
          </div>
        )}
      </>
    );
  }
  const label =
    block.action === "seance" ? t("Voir mon programme")
    : block.action === "repas" ? t("Ouvrir le repas")
    : block.action === "bilan" ? t("Remplir mon bilan")
    : t("Voir dans l'agenda");
  // Bloc sans raccourci propre (travail, trajet...) : un simple lien, pas un gros bouton.
  if (block.action === "agenda") {
    return (
      <Link href={block.href} style={{ display: "inline-flex", alignItems: "center", gap: 4, minHeight: 32, fontSize: 12, fontWeight: 800, color: "rgba(var(--ep-ink-rgb),0.6)", textDecoration: "none" }}>
        {label}
        <ArrowRight size={13} />
      </Link>
    );
  }
  const strong = primary;
  return (
    <Link
      href={block.href}
      className="w-full flex items-center justify-center gap-2 rounded-xl font-black uppercase tracking-wider"
      style={{
        height: 44, fontSize: 12, textDecoration: "none",
        ...(strong
          ? { background: "var(--ep-accent)", color: "var(--ep-strong)" }
          : { background: "rgba(var(--ep-ink-rgb),0.05)", color: "rgba(var(--ep-ink-rgb),0.8)", border: "1px solid rgba(var(--ep-line-rgb),0.3)" }),
      }}
    >
      {label}
      <ArrowRight size={14} />
    </Link>
  );
}

/** Ce que le bloc représente : séance du programme, repas de la diète, pas. */
async function BlockDetail({ block, day }: { block: HomeBlock; day: HomeDayData }) {
  const t = await getT();
  const parts: string[] = [];
  if (block.action === "seance" && day.training.today) {
    const s = day.training.today;
    // Le titre du bloc dit souvent déjà « Séance : Push ».
    if (!block.label.toLowerCase().includes(s.dayLabel.toLowerCase())) parts.push(s.dayLabel);
    parts.push(`${s.exercises} ${s.exercises > 1 ? t("exercices") : t("exercice")}`);
    if (s.minutes) parts.push(`≈\u00a0${minutesLabel(s.minutes)}`);
  } else if (block.action === "repas" && block.mealSlot) {
    const m = day.nutrition.bySlot[block.mealSlot];
    if (m) parts.push(`${fmt(m.kcal)} kcal`, `${fmt(m.prot)} g ${t("de protéines")}`);
  } else if (block.steps) {
    parts.push(`≈\u00a0${formatSteps(block.steps).replace(/ /g, "\u00a0")}\u00a0${t("pas")}`);
  }
  if (parts.length === 0) return null;
  return <p style={{ margin: "6px 0 0", fontSize: 12.5, fontWeight: 600, color: "rgba(var(--ep-ink-rgb),0.6)" }}>{parts.join(" · ")}</p>;
}

async function TaskList({ block }: { block: HomeBlock }) {
  const t = await getT();
  if (block.tasks.length === 0) return null;
  const shown = block.tasks.slice(0, 4);
  return (
    <ul style={{ listStyle: "none", margin: "12px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 7 }}>
      {shown.map((task, i) => (
        <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, lineHeight: 1.35 }}>
          {task.done ? (
            <CheckCircle2 size={15} strokeWidth={2} style={{ color: "var(--ep-ok)", flexShrink: 0, marginTop: 1 }} />
          ) : (
            <Circle size={15} strokeWidth={1.8} style={{ color: "rgba(var(--ep-ink-rgb),0.3)", flexShrink: 0, marginTop: 1 }} />
          )}
          <span style={{ minWidth: 0, overflowWrap: "anywhere", color: task.done ? "rgba(var(--ep-ink-rgb),0.4)" : "rgba(var(--ep-ink-rgb),0.85)", textDecoration: task.done ? "line-through" : "none" }}>
            {task.text}
          </span>
        </li>
      ))}
      {block.tasks.length > shown.length && (
        <li style={{ fontSize: 11.5, fontWeight: 700, color: "rgba(var(--ep-ink-rgb),0.4)", paddingLeft: 23 }}>
          +{block.tasks.length - shown.length} {t("autres")}
        </li>
      )}
    </ul>
  );
}

function DayBar({ day }: { day: HomeDayData }) {
  const strip = dayStrip(day.blocks, day.now);
  if (!strip) return null;
  return (
    <div aria-hidden style={{ marginBottom: 16 }}>
      <div style={{ position: "relative", height: 8, borderRadius: 999, background: "rgba(var(--ep-ink-rgb),0.06)", overflow: "hidden" }}>
        {strip.segments.filter((s) => !s.marker).map((s) => (
          <span
            key={s.id}
            style={{
              position: "absolute", top: 0, bottom: 0, left: `${s.left}%`, width: `${s.width}%`,
              background: blockColor(s), opacity: s.past ? 0.28 : 0.85,
              borderRight: "1.5px solid var(--ep-bg)",
            }}
          />
        ))}
      </div>
      <div style={{ position: "relative", height: 14, marginTop: 4, fontSize: 10, fontWeight: 700, color: "rgba(var(--ep-ink-rgb),0.38)", fontVariantNumeric: "tabular-nums" }}>
        <span style={{ position: "absolute", left: 0 }}>{strip.from}</span>
        <span style={{ position: "absolute", right: 0 }}>{strip.to}</span>
        {strip.nowPct != null && (
          <span
            style={{
              position: "absolute", top: -16, left: `${strip.nowPct}%`, transform: "translateX(-50%)",
              width: 3, height: 14, borderRadius: 2, background: "var(--ep-ink)", boxShadow: "0 0 0 2px var(--ep-bg)",
            }}
          />
        )}
      </div>
    </div>
  );
}

export async function NowCard({ day, agendaHref = `${C}/agenda` }: { day: HomeDayData; agendaHref?: string }) {
  const t = await getT();
  const now = pickNow(day.blocks, day.now);
  const focus = now.current ?? now.next;
  const count = day.blocks.filter((b) => !b.marker).length;

  // Rien dans l'agenda aujourd'hui : le prochain repas de la diète tient lieu
  // de « maintenant », et une invitation à poser sa journée.
  if (count === 0) {
    const meal = day.nutrition.next;
    return (
      <section className="animate-fade-up stagger-1" style={{ marginBottom: 16 }}>
        <div className="ep-card-hero" style={{ padding: 18 }}>
          <p className="ep-label" style={{ margin: "0 0 10px", color: "rgba(var(--ep-accent-rgb),0.75)" }}>{t("Maintenant")}</p>
          {meal ? (
            <>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "rgba(var(--ep-ink-rgb),0.5)" }}>
                {meal.when === "now" ? t("C'est l'heure") : meal.when === "late" ? t("Pas encore noté") : `${t("Vers")} ${meal.time}`}
              </p>
              <p style={{ margin: "2px 0 0", fontSize: 21, fontWeight: 900, letterSpacing: "-0.02em", color: "var(--ep-ink)" }}>{t(meal.label)}</p>
              <p style={{ margin: "6px 0 14px", fontSize: 12.5, fontWeight: 600, color: "rgba(var(--ep-ink-rgb),0.6)" }}>
                {fmt(meal.kcal)} kcal · {fmt(meal.prot)} g {t("de protéines")}
              </p>
              <Link href={`${C}/nutrition?repas=${meal.slot}`} className="w-full flex items-center justify-center gap-2 rounded-xl font-black uppercase tracking-wider" style={{ height: 44, fontSize: 12, textDecoration: "none", background: "var(--ep-accent)", color: "var(--ep-strong)" }}>
                {t("Ouvrir le repas")}
                <ArrowRight size={14} />
              </Link>
              <div className="ep-divider-subtle" style={{ margin: "16px 0 12px" }} />
            </>
          ) : (
            <p style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 800, color: "var(--ep-ink)", lineHeight: 1.35 }}>
              {t("Ta journée n'est pas encore posée.")}
            </p>
          )}
          <Link href={agendaHref} style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <CalendarPlus size={17} strokeWidth={1.8} style={{ color: "var(--ep-accent)", flexShrink: 0 }} />
            <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, lineHeight: 1.4, color: "rgba(var(--ep-ink-rgb),0.65)" }}>
              {t("Pose ta journée type dans l'agenda (repas, séance, travail) : l'appli te dira quoi faire à chaque moment.")}
            </span>
            <ChevronRight size={15} style={{ color: "rgba(var(--ep-ink-rgb),0.3)", flexShrink: 0 }} />
          </Link>
        </div>
      </section>
    );
  }

  const color = focus ? blockColor(focus) : "var(--ep-ok)";
  return (
    <section className="animate-fade-up stagger-1" style={{ marginBottom: 16 }}>
      <div className="ep-card-hero" style={{ padding: 18 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
          <p className="ep-label" style={{ margin: 0, color: "rgba(var(--ep-accent-rgb),0.75)" }}>{t("Ta journée")}</p>
          <Link href={agendaHref} style={{ display: "inline-flex", alignItems: "center", gap: 2, fontSize: 11.5, fontWeight: 700, color: "rgba(var(--ep-ink-rgb),0.5)", textDecoration: "none", minHeight: 24 }}>
            {t("Agenda")}
            <ChevronRight size={13} />
          </Link>
        </div>
        <DayBar day={day} />

        {focus ? (
          <>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <IconTile icon={blockIcon(focus)} color={color} size={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, display: "flex", flexWrap: "wrap", alignItems: "center", gap: "2px 8px", fontSize: 11.5, fontWeight: 800 }}>
                  {now.current ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color }}>
                      <span className="animate-pulse" style={{ width: 7, height: 7, borderRadius: 999, background: color }} />
                      {t("En cours")}
                    </span>
                  ) : (
                    <span style={{ color: "rgba(var(--ep-ink-rgb),0.55)" }}>{t("À venir")}</span>
                  )}
                  {now.minutesLeft != null && (
                    <span style={{ color: "rgba(var(--ep-ink-rgb),0.45)", fontWeight: 600 }}>
                      {now.current ? `${t("encore")} ${minutesLabel(now.minutesLeft)}` : `${t("dans")} ${minutesLabel(now.minutesLeft)}`}
                    </span>
                  )}
                </p>
                <p style={{ margin: "3px 0 0", fontSize: 20, fontWeight: 900, letterSpacing: "-0.02em", lineHeight: 1.15, color: "var(--ep-ink)", overflowWrap: "anywhere" }}>
                  {focus.label}
                </p>
                <p style={{ margin: "3px 0 0", fontSize: 12, fontWeight: 700, color: "rgba(var(--ep-ink-rgb),0.45)", fontVariantNumeric: "tabular-nums" }}>
                  {focus.start === focus.end ? focus.start : `${focus.start} – ${focus.end}`}
                </p>

              </div>
            </div>
            {now.progress != null && (
              <div style={{ height: 4, borderRadius: 999, background: "rgba(var(--ep-ink-rgb),0.07)", marginTop: 12, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.round(now.progress * 100)}%`, background: color, borderRadius: 999 }} />
              </div>
            )}
            <BlockDetail block={focus} day={day} />
            {now.during && (
              <p style={{ margin: "8px 0 0", fontSize: 11.5, fontWeight: 700, lineHeight: 1.4, color: "var(--ep-ok)" }}>
                <Footprints size={12} strokeWidth={2} style={{ display: "inline", verticalAlign: "-2px", marginRight: 5 }} />
                {t("En ce moment")} : {now.during.label}
                {now.during.steps ? ` · ≈\u00a0${formatSteps(now.during.steps).replace(/ /g, "\u00a0")}\u00a0${t("pas")}` : ""}
              </p>
            )}
            <TaskList block={focus} />
            <div style={{ marginTop: focus.action === "agenda" ? 8 : 14 }}>
              <BlockCta block={focus} day={day} primary />
            </div>
          </>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <IconTile icon={Moon} color="var(--ep-violet)" size={40} />
            <div>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: "var(--ep-ink)" }}>{t("Plus rien de prévu aujourd'hui")}</p>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "rgba(var(--ep-ink-rgb),0.5)" }}>{t("Bonne soirée, demain se prépare dans l'agenda.")}</p>
            </div>
          </div>
        )}

        {now.later.length > 0 && (
          <>
            <div className="ep-divider-subtle" style={{ margin: "16px 0 6px" }} />
            <p className="ep-label" style={{ margin: "0 0 2px" }}>{t("Ensuite")}</p>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {now.later.map((b) => {
                const Icon = blockIcon(b);
                const c = blockColor(b);
                return (
                  <Link key={b.id} href={b.href} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 40, textDecoration: "none" }}>
                    <span style={{ width: 40, flexShrink: 0, fontSize: 12, fontWeight: 800, color: "rgba(var(--ep-ink-rgb),0.55)", fontVariantNumeric: "tabular-nums" }}>{b.start}</span>
                    <Icon size={14} strokeWidth={2} style={{ color: c, flexShrink: 0 }} />
                    <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, color: "rgba(var(--ep-ink-rgb),0.85)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.label}</span>
                    <ChevronRight size={14} style={{ color: "rgba(var(--ep-ink-rgb),0.25)", flexShrink: 0 }} />
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

// ── Séance et nutrition du jour ─────────────────────────────────────────

function MiniHead({ icon: Icon, label, color }: { icon: LucideIcon; label: string; color: string }) {
  return (
    <p style={{ margin: "0 0 8px", display: "flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(var(--ep-ink-rgb),0.45)" }}>
      <Icon size={13} strokeWidth={2} style={{ color }} />
      {label}
    </p>
  );
}

const miniTitle: React.CSSProperties = { margin: 0, fontSize: 17, fontWeight: 900, letterSpacing: "-0.02em", lineHeight: 1.15, color: "var(--ep-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
const miniMeta: React.CSSProperties = { margin: "4px 0 0", fontSize: 11.5, fontWeight: 600, lineHeight: 1.35, color: "rgba(var(--ep-ink-rgb),0.5)" };

export async function TrainingMini({ day, coached }: { day: HomeDayData; coached: boolean }) {
  const t = await getT();
  const hero = pickNow(day.blocks, day.now);
  // La séance est déjà le bloc mis en avant (avec son bouton) : pas de second « Démarrer ».
  const heroIsSession = (hero.current ?? hero.next)?.action === "seance";
  const tr = day.training;
  const s = tr.today;
  const secondaryBtn = (href: string, label: string) => (
    <Link href={href} className="w-full flex items-center justify-center gap-1.5 rounded-xl font-black uppercase tracking-wider" style={{ height: 38, fontSize: 11, textDecoration: "none", color: "rgba(var(--ep-ink-rgb),0.75)", background: "rgba(var(--ep-ink-rgb),0.05)", border: "1px solid rgba(var(--ep-line-rgb),0.3)" }}>
      {label}
    </Link>
  );
  let body: React.ReactNode;
  if (s) {
    const meta = [s.time ? shortHour(s.time) : tr.free ? t("cette semaine") : null, `${s.exercises} ${t("exos")}`, s.minutes ? `≈ ${minutesLabel(s.minutes)}` : null].filter(Boolean).join(" · ");
    body = (
      <>
        <Link href={`${C}/program`} style={{ textDecoration: "none", display: "block" }}>
          <p style={miniTitle}>{s.dayLabel}</p>
          <p style={miniMeta}>{meta}</p>
        </Link>
        <div style={{ marginTop: "auto", paddingTop: 12 }}>
          {heroIsSession && s.state !== "done" ? secondaryBtn(`${C}/program`, t("Voir les exos")) : <HomeStartSession session={s} compact />}
          {s.state !== "done" && (
            <div style={{ display: "flex", justifyContent: "center" }}>
              <MoveSession dayId={s.dayId} days={tr.schedule} todayDow={isoWeekday(day.date)} />
            </div>
          )}
        </div>
      </>
    );
  } else if (tr.hasProgram && tr.next) {
    body = (
      <>
        <p style={miniTitle}>{t("Repos")}</p>
        <p style={miniMeta}>
          {t("Prochaine")} : <b style={{ color: "rgba(var(--ep-ink-rgb),0.75)" }}>{tr.next.label}</b>, {t(tr.next.when)}
          {tr.next.time ? ` ${shortHour(tr.next.time)}` : ""}
        </p>
        <div style={{ marginTop: "auto", paddingTop: 12 }}>{secondaryBtn(`${C}/program`, t("Programme"))}</div>
      </>
    );
  } else if (tr.hasProgram) {
    body = (
      <>
        <p style={miniTitle}>{t("Semaine bouclée")}</p>
        <p style={miniMeta}>{t("Toutes tes séances sont faites.")}</p>
        <div style={{ marginTop: "auto", paddingTop: 12 }}>{secondaryBtn(`${C}/program`, t("Programme"))}</div>
      </>
    );
  } else {
    body = (
      <>
        <p style={{ ...miniTitle, whiteSpace: "normal" }}>{coached ? t("En préparation") : t("Pas de programme")}</p>
        <p style={miniMeta}>{coached ? t("Ton coach prépare ton programme.") : t("Choisis un programme prêt à l'emploi.")}</p>
        <div style={{ marginTop: "auto", paddingTop: 12 }}>{secondaryBtn(coached ? `${C}/logbook` : `${C}/program`, coached ? t("Séance libre") : t("Choisir"))}</div>
      </>
    );
  }
  return (
    <div className="ep-card" style={{ padding: 14, display: "flex", flexDirection: "column", minWidth: 0 }}>
      <MiniHead icon={Dumbbell} label={t("Séance")} color="var(--ep-accent)" />
      {body}
    </div>
  );
}

function Meter({ value, max, color, height = 5 }: { value: number; max: number; color: string; height?: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div style={{ height, borderRadius: 999, background: "rgba(var(--ep-ink-rgb),0.07)", overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 999 }} />
    </div>
  );
}

export async function NutritionMini({ day, coached = false }: { day: HomeDayData; coached?: boolean }) {
  const t = await getT();
  const n = day.nutrition;
  const href = n.next ? `${C}/nutrition?repas=${n.next.slot}` : `${C}/nutrition`;
  return (
    <Link href={href} className="ep-card" style={{ padding: 14, display: "flex", flexDirection: "column", minWidth: 0, textDecoration: "none" }}>
      <MiniHead icon={Apple} label={t("Nutrition")} color="var(--ep-warn)" />
      {n.target ? (
        <>
          <p style={{ margin: 0, fontSize: 17, fontWeight: 900, letterSpacing: "-0.02em", color: "var(--ep-ink)", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
            {fmt(n.eaten.kcal)}
            <span style={{ fontSize: 11.5, fontWeight: 700, color: "rgba(var(--ep-ink-rgb),0.45)", letterSpacing: 0 }}> / {fmt(n.target.kcal)} kcal</span>
          </p>
          <div style={{ margin: "6px 0 8px" }}>
            <Meter value={n.eaten.kcal} max={n.target.kcal} color="var(--ep-warn)" />
          </div>
          {n.target.prot > 0 && (
            <>
              <p style={{ margin: "0 0 4px", fontSize: 11.5, fontWeight: 700, color: "rgba(var(--ep-ink-rgb),0.6)", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                {t("Prot.")} {fmt(n.eaten.prot)} / {fmt(n.target.prot)} g
              </p>
              <Meter value={n.eaten.prot} max={n.target.prot} color="var(--ep-ok)" height={4} />
            </>
          )}
          <p style={{ ...miniMeta, marginTop: "auto", paddingTop: 10, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {n.next ? (
              <>
                {n.next.when === "late" ? t("À cocher") : n.next.when === "now" ? t("Maintenant") : t("Prochain")} : <b style={{ color: "rgba(var(--ep-ink-rgb),0.8)" }}>{t(n.next.label)}</b> · {n.next.time}
              </>
            ) : n.hasPlan ? (
              <span style={{ color: "var(--ep-ok)", fontWeight: 800 }}>{t("Tous les repas sont cochés")}</span>
            ) : (
              t("Note tes repas du jour")
            )}
          </p>
        </>
      ) : (
        <>
          <p style={{ ...miniTitle, whiteSpace: "normal" }}>{coached ? t("En préparation") : t("Pas encore d'objectif")}</p>
          <p style={miniMeta}>{coached ? t("Ton coach prépare ta diète.") : t("Calcule tes besoins pour suivre tes kcal.")}</p>
          <span style={{ marginTop: "auto", paddingTop: 10, fontSize: 11.5, fontWeight: 800, color: "var(--ep-accent)", display: "inline-flex", alignItems: "center", gap: 4 }}>
            {coached ? t("Noter un repas") : t("Calculer")} <ArrowRight size={12} />
          </span>
        </>
      )}
    </Link>
  );
}

export function TodayPair({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-fade-up stagger-2" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(146px, 1fr))", gap: 10, marginBottom: 16 }}>
      {children}
    </div>
  );
}

// ── À faire ─────────────────────────────────────────────────────────────

const TODO_STYLE: Record<HomeTodo["kind"], { icon: LucideIcon; color: string }> = {
  message: { icon: MessageCircle, color: "var(--ep-accent)" },
  tache: { icon: ListChecks, color: "var(--ep-info)" },
  checkin: { icon: ClipboardList, color: "var(--ep-violet)" },
  bilan: { icon: ClipboardCheck, color: "var(--ep-warn)" },
  victoire: { icon: Trophy, color: "var(--ep-gold)" },
  cycle: { icon: Droplet, color: "var(--ep-pink)" },
};

export async function TodoList({ todos }: { todos: HomeTodo[] }) {
  const t = await getT();
  return (
    <section className="animate-fade-up stagger-3" style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
        <p className="ep-section-title" style={{ margin: 0 }}>{t("À faire")}</p>
        {todos.length > 0 && <span style={{ fontSize: 11, fontWeight: 800, color: "rgba(var(--ep-ink-rgb),0.35)" }}>{todos.length}</span>}
      </div>
      {todos.length === 0 ? (
        <div className="ep-card" style={{ padding: "13px 14px", display: "flex", alignItems: "center", gap: 10 }}>
          <CheckCircle2 size={18} strokeWidth={1.9} style={{ color: "var(--ep-ok)", flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "rgba(var(--ep-ink-rgb),0.7)" }}>{t("Rien en attente, tout est à jour.")}</p>
        </div>
      ) : (
        <div className="ep-card" style={{ padding: "4px 0" }}>
          {todos.map((todo, i) => {
            const st = TODO_STYLE[todo.kind];
            return (
              <Link
                key={todo.key}
                href={todo.href}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", minHeight: 52, textDecoration: "none", borderTop: i ? "1px solid rgba(var(--ep-line-rgb),0.14)" : "none" }}
              >
                <IconTile icon={st.icon} color={st.color} size={32} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 800, lineHeight: 1.3, color: "var(--ep-ink)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{t(todo.label)}</p>
                  {todo.sub && <p style={{ margin: "1px 0 0", fontSize: 11.5, color: todo.urgent ? st.color : "rgba(var(--ep-ink-rgb),0.45)", fontWeight: todo.urgent ? 700 : 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t(todo.sub)}</p>}
                </div>
                <ChevronRight size={15} style={{ color: "rgba(var(--ep-ink-rgb),0.25)", flexShrink: 0 }} />
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ── Raccourcis (bas de page) ─────────────────────────────────────────────

export async function Shortcuts({ items, title }: { items: { href: string; label: string; icon: LucideIcon }[]; title: string }) {
  const t = await getT();
  return (
    <section className="animate-fade-up stagger-5" style={{ marginBottom: 16 }}>
      <p className="ep-section-title" style={{ marginBottom: 8 }}>{t(title)}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {items.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            style={{
              display: "inline-flex", alignItems: "center", gap: 7, minHeight: 38, padding: "0 13px", borderRadius: 999,
              background: "rgba(var(--ep-s1-rgb),0.7)", border: "1px solid rgba(var(--ep-line-rgb),0.25)",
              fontSize: 12.5, fontWeight: 700, color: "rgba(var(--ep-ink-rgb),0.8)", textDecoration: "none",
            }}
          >
            <Icon size={14} strokeWidth={1.9} style={{ color: "var(--ep-accent)" }} />
            {t(label)}
          </Link>
        ))}
      </div>
    </section>
  );
}
