"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  X, Columns2, ChevronsLeftRight, Repeat2, Pencil, Circle, Eraser, Share2,
  ChevronLeft, ChevronRight, CalendarDays, ZoomOut, ArrowLeftRight,
} from "lucide-react";
import { useT } from "@/components/i18n/I18nProvider";
import DrawLayer, { type DrawLayerHandle, type DrawTool } from "./DrawLayer";
import SocialProofSheet from "./SocialProofSheet";
import {
  type PhotoSet, angleLabel, daysBetween, durationLabel, findWeeksBefore, formatSetDate, weekIndex,
} from "@/lib/photo-sets";

// Comparateur de photos physique plein écran (2026-10-14). Retour direct du
// fondateur : « simple bouton pour switch, les traits disparaissent après
// 5 s, un seul bouton pour comparer la semaine avec la semaine 6, un seul
// bouton pour un post Insta avec le logo ». Même composant côté client
// (ses propres photos) et côté coach (photos d'un client).

export type ComparatorAudience = "self" | "coach";
type ViewMode = "duo" | "slider" | "flip";
type Side = "before" | "after";

interface Zoom { s: number; x: number; y: number }
const NO_ZOOM: Zoom = { s: 1, x: 0, y: 0 };
const MAX_ZOOM = 4;

// Couleurs de dessin : uniquement des variables d'ambiance, lues telles
// quelles par le canvas au moment du tracé.
const DRAW_COLORS = ["--ep-accent", "--ep-yellow", "--ep-info", "--ep-hi"] as const;

const RELATIVE_CHIPS: { label: string; weeks: number | "start" }[] = [
  { label: "S-1", weeks: 1 },
  { label: "S-4", weeks: 4 },
  { label: "S-6", weeks: 6 },
  { label: "Début", weeks: "start" },
];

function cssVar(name: string): string {
  if (typeof document === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function clampZoom(z: Zoom, w: number, h: number): Zoom {
  const s = Math.min(MAX_ZOOM, Math.max(1, z.s));
  const mx = (w * (s - 1)) / 2;
  const my = (h * (s - 1)) / 2;
  return { s, x: Math.min(mx, Math.max(-mx, z.x)), y: Math.min(my, Math.max(-my, z.y)) };
}

interface Props {
  sets: PhotoSet[];
  audience: ComparatorAudience;
  /** Prénom du client (côté coach), pour la mention d'accord avant publication. */
  subjectName?: string | null;
  /** Séance affichée en « Après » à l'ouverture (par défaut la plus récente). */
  initialAfterId?: string;
  onClose: () => void;
}

export default function PhotoComparator({ sets, audience, subjectName, initialAfterId, onClose }: Props) {
  const t = useT();
  const last = sets.length - 1;
  const found = initialAfterId ? sets.findIndex((s) => s.id === initialAfterId) : -1;
  const startAfter = found >= 0 ? found : last;
  const [afterIdx, setAfterIdx] = useState(startAfter);
  const [beforeIdx, setBeforeIdx] = useState(() => {
    const after = startAfter;
    // Coach : la revue de la semaine se fait d'abord contre la semaine
    // d'avant. Soi-même : le chemin parcouru depuis le début.
    if (audience === "coach") return findWeeksBefore(sets, after, 1) ?? (after > 0 ? after - 1 : 0);
    return 0;
  });
  const [angle, setAngle] = useState(0);
  const [view, setView] = useState<ViewMode>("duo");
  const [flipSide, setFlipSide] = useState<Side>("after");
  const [split, setSplit] = useState(50);
  const [zoom, setZoom] = useState<Zoom>(NO_ZOOM);
  const [tool, setTool] = useState<DrawTool | null>(null);
  const [colorIdx, setColorIdx] = useState(0);
  const [picker, setPicker] = useState<Side | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [swipe, setSwipe] = useState<{ side: Side; dx: number } | null>(null);
  // Pendant un geste, l'image suit le doigt sans animation.
  const [touching, setTouching] = useState(false);
  const drawRef = useRef<DrawLayerHandle>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState({ w: 0, h: 0 });

  const before = sets[beforeIdx] ?? sets[0];
  const after = sets[afterIdx] ?? sets[last];
  const angleCount = Math.max(1, Math.min(before.urls.length, after.urls.length));
  const a = Math.min(angle, angleCount - 1);
  const beforeUrl = before.urls[a] ?? before.urls[0];
  const afterUrl = after.urls[a] ?? after.urls[0];
  const gapDays = Math.abs(daysBetween(before.date, after.date));
  const firstDate = sets[0].date;
  const drawColor = `var(${DRAW_COLORS[colorIdx]})`;

  // Verrouille le défilement de la page derrière + Échap pour fermer.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  // Taille de la scène, pour calibrer les cadres photo.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => setStage({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Précharge les séances voisines : le switch de date reste instantané.
  useEffect(() => {
    const urls = [beforeIdx - 1, beforeIdx + 1, afterIdx - 1, afterIdx + 1]
      .filter((i) => i >= 0 && i <= last)
      .map((i) => sets[i].urls[a] ?? sets[i].urls[0]);
    for (const u of urls) {
      const img = new Image();
      img.decoding = "async";
      img.src = u;
    }
  }, [beforeIdx, afterIdx, a, last, sets]);

  // Cadre photo : côte à côte, chaque cadre fait la moitié de la largeur et
  // reste entre 0,52 et 0,75 de ratio (photo en pied lisible sans trop
  // rogner). Curseur / bascule : un seul grand cadre 3:4.
  const frame = useMemo(() => {
    const W = stage.w;
    const H = stage.h;
    if (!W || !H) return { w: 0, h: 0 };
    if (view === "duo") {
      const w = Math.min((W - 6) / 2, H * 0.75);
      return { w, h: Math.min(H, w / 0.52) };
    }
    const h = Math.min(H, (W / 3) * 4);
    return { w: (h / 4) * 3, h };
  }, [stage, view]);

  const resetZoom = useCallback(() => setZoom(NO_ZOOM), []);

  function step(side: Side, dir: -1 | 1) {
    if (side === "before") setBeforeIdx((i) => Math.min(last, Math.max(0, i + dir)));
    else setAfterIdx((i) => Math.min(last, Math.max(0, i + dir)));
  }

  function setRelative(weeks: number | "start") {
    const idx = weeks === "start" ? 0 : findWeeksBefore(sets, afterIdx, weeks);
    if (idx != null) setBeforeIdx(idx);
  }

  // ── Gestes : pincer pour zoomer (synchronisé sur les deux photos),
  // glisser pour changer de date (côte à côte), déplacer le curseur, taper
  // pour basculer avant/après.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{
    kind: "none" | "pinch" | "pan" | "swipe" | "split" | "tap";
    side: Side | null;
    startX: number;
    startY: number;
    startTime: number;
    zoom0: Zoom;
    dist0: number;
    mid0: { x: number; y: number };
    center: { x: number; y: number };
  }>({ kind: "none", side: null, startX: 0, startY: 0, startTime: 0, zoom0: NO_ZOOM, dist0: 0, mid0: { x: 0, y: 0 }, center: { x: 0, y: 0 } });

  function paneCenter(target: EventTarget | null): { side: Side | null; center: { x: number; y: number }; rect: DOMRect | null } {
    const el = (target as HTMLElement | null)?.closest?.("[data-pane]") as HTMLElement | null;
    if (!el) return { side: null, center: { x: 0, y: 0 }, rect: null };
    const r = el.getBoundingClientRect();
    return { side: (el.dataset.pane as Side) ?? null, center: { x: r.left + r.width / 2, y: r.top + r.height / 2 }, rect: r };
  }

  function updateSplit(clientX: number) {
    const el = stageRef.current?.querySelector("[data-pane]") as HTMLElement | null;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setSplit(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (tool) return;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    setTouching(true);
    const g = gesture.current;
    const pane = paneCenter(e.target);
    if (pointers.current.size === 2) {
      const [p1, p2] = [...pointers.current.values()];
      g.kind = "pinch";
      g.zoom0 = zoom;
      g.dist0 = Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1;
      g.mid0 = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      if (pane.rect) g.center = pane.center;
      setSwipe(null);
      return;
    }
    if (pointers.current.size > 2) return;
    g.side = pane.side;
    g.center = pane.center;
    g.startX = e.clientX;
    g.startY = e.clientY;
    g.startTime = Date.now();
    g.zoom0 = zoom;
    if (view === "slider") {
      g.kind = "split";
      updateSplit(e.clientX);
    } else if (zoom.s > 1.01) {
      g.kind = "pan";
    } else if (view === "duo") {
      g.kind = "swipe";
    } else {
      g.kind = "tap";
    }
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (g.kind === "pinch" && pointers.current.size >= 2) {
      const [p1, p2] = [...pointers.current.values()];
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      const s = Math.min(MAX_ZOOM, Math.max(1, g.zoom0.s * (dist / g.dist0)));
      // Le point sous les doigts reste sous les doigts.
      const ux = (g.mid0.x - g.center.x - g.zoom0.x) / g.zoom0.s;
      const uy = (g.mid0.y - g.center.y - g.zoom0.y) / g.zoom0.s;
      setZoom(clampZoom({ s, x: mid.x - g.center.x - ux * s, y: mid.y - g.center.y - uy * s }, frame.w, frame.h));
      return;
    }
    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;
    if (g.kind === "split") updateSplit(e.clientX);
    else if (g.kind === "pan") setZoom(clampZoom({ s: g.zoom0.s, x: g.zoom0.x + dx, y: g.zoom0.y + dy }, frame.w, frame.h));
    else if (g.kind === "swipe" && g.side && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) setSwipe({ side: g.side, dx });
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(e.pointerId)) return;
    const g = gesture.current;
    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;
    pointers.current.delete(e.pointerId);
    if (g.kind === "pinch") {
      // Un doigt reste posé : on enchaîne sur un déplacement.
      if (pointers.current.size === 1) {
        const [p] = [...pointers.current.values()];
        g.kind = "pan";
        g.startX = p.x;
        g.startY = p.y;
        g.zoom0 = zoom;
      } else {
        g.kind = "none";
        setTouching(false);
      }
      return;
    }
    if (pointers.current.size > 0) return;
    setTouching(false);
    if (g.kind === "swipe" && g.side) {
      if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy) * 1.3) step(g.side, dx < 0 ? 1 : -1);
      setSwipe(null);
    } else if (g.kind === "tap" && Math.abs(dx) < 10 && Math.abs(dy) < 10 && Date.now() - g.startTime < 400) {
      setFlipSide((s) => (s === "after" ? "before" : "after"));
    }
    g.kind = "none";
  }

  function onPointerCancel(e: React.PointerEvent<HTMLDivElement>) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) {
      gesture.current.kind = "none";
      setSwipe(null);
      setTouching(false);
    }
  }

  const imgStyle = (extraX = 0): React.CSSProperties => ({
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transform: `translate3d(${zoom.x + extraX}px, ${zoom.y}px, 0) scale(${zoom.s})`,
    transformOrigin: "center center",
    transition: touching ? "none" : "transform 180ms var(--ep-ease-out)",
    userSelect: "none",
    pointerEvents: "none",
    WebkitUserSelect: "none",
  });

  function paneBox(children: React.ReactNode, side: Side | "single") {
    return (
      <div
        data-pane={side === "single" ? "after" : side}
        style={{
          position: "relative",
          width: frame.w,
          height: frame.h,
          overflow: "hidden",
          borderRadius: 14,
          background: "var(--ep-s2)",
          flexShrink: 0,
        }}
      >
        {children}
      </div>
    );
  }

  function tag(text: string, strong: boolean, pos: "left" | "right" | "center" = "left") {
    return (
      <span
        style={{
          position: "absolute",
          top: 8,
          ...(pos === "left" ? { left: 8 } : pos === "right" ? { right: 8 } : { left: "50%", transform: "translateX(-50%)" }),
          zIndex: 3,
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          padding: "4px 9px",
          borderRadius: 999,
          color: strong ? "var(--ep-strong)" : "var(--ep-ink)",
          background: strong ? undefined : "rgba(var(--ep-page-rgb),0.72)",
          pointerEvents: "none",
          whiteSpace: "nowrap",
        }}
        className={strong ? "bg-(--ep-accent)" : undefined}
      >
        {text}
      </span>
    );
  }

  const stageContent = (() => {
    if (!frame.w) return null;
    if (view === "duo") {
      return (
        <div style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>
          {paneBox(
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={beforeUrl} alt={t("Avant")} draggable={false} style={imgStyle(swipe?.side === "before" ? swipe.dx * 0.5 : 0)} />
              {tag(`${t("Avant")} · ${t("Sem.")} ${weekIndex(firstDate, before.date)}`, false)}
            </>,
            "before"
          )}
          {paneBox(
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={afterUrl} alt={t("Après")} draggable={false} style={imgStyle(swipe?.side === "after" ? swipe.dx * 0.5 : 0)} />
              {tag(`${t("Après")} · ${t("Sem.")} ${weekIndex(firstDate, after.date)}`, true, "right")}
            </>,
            "after"
          )}
        </div>
      );
    }
    if (view === "slider") {
      return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>
          {paneBox(
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={afterUrl} alt={t("Après")} draggable={false} style={imgStyle()} />
              <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 ${100 - split}% 0 0)`, pointerEvents: "none" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={beforeUrl} alt={t("Avant")} draggable={false} style={imgStyle()} />
              </div>
              <div style={{ position: "absolute", top: 0, bottom: 0, left: `${split}%`, width: 2, transform: "translateX(-1px)", background: "var(--ep-accent)", zIndex: 2, pointerEvents: "none" }} />
              <div
                className="bg-(--ep-accent)"
                style={{
                  position: "absolute", top: "50%", left: `${split}%`, transform: "translate(-50%, -50%)",
                  width: 40, height: 40, borderRadius: "50%", zIndex: 2,
                  display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none",
                  boxShadow: "0 2px 10px rgba(var(--ep-shade-rgb),0.45)",
                }}
              >
                <ChevronsLeftRight size={18} style={{ color: "var(--ep-strong)" }} />
              </div>
              {tag(`${t("Avant")} · ${t("Sem.")} ${weekIndex(firstDate, before.date)}`, false)}
              {tag(`${t("Après")} · ${t("Sem.")} ${weekIndex(firstDate, after.date)}`, true, "right")}
            </>,
            "single"
          )}
        </div>
      );
    }
    const showingAfter = flipSide === "after";
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>
        {paneBox(
          <>
            {/* Les deux images restent montées : la bascule est instantanée. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={beforeUrl} alt={t("Avant")} draggable={false} style={{ ...imgStyle(), opacity: showingAfter ? 0 : 1, transition: "opacity 90ms linear" }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={afterUrl} alt={t("Après")} draggable={false} style={{ ...imgStyle(), opacity: showingAfter ? 1 : 0, transition: "opacity 90ms linear" }} />
            {tag(
              `${showingAfter ? t("Après") : t("Avant")} · ${formatSetDate(showingAfter ? after.date : before.date)}`,
              showingAfter,
              "center"
            )}
          </>,
          "single"
        )}
      </div>
    );
  })();

  const btnBase =
    "inline-flex items-center justify-center gap-1.5 rounded-xl border text-[11px] font-bold uppercase tracking-wider transition-colors";
  const btnIdle = "border-(--ep-line)/25 bg-(--ep-s1) text-(--ep-ink)/75";
  const btnOn = "border-(--ep-accent)/60 bg-(--ep-accent)/15 text-(--ep-accent)";

  function dateCard(side: Side) {
    const set = side === "before" ? before : after;
    const idx = side === "before" ? beforeIdx : afterIdx;
    return (
      <div className="flex items-stretch rounded-xl border border-(--ep-line)/20 bg-(--ep-s1) overflow-hidden min-w-0">
        <button
          type="button"
          onClick={() => step(side, -1)}
          disabled={idx <= 0}
          aria-label={side === "before" ? t("Avant : séance plus ancienne") : t("Après : séance plus ancienne")}
          className="w-11 min-h-11 flex items-center justify-center text-(--ep-ink)/70 disabled:opacity-25"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          type="button"
          onClick={() => setPicker(side)}
          className="flex-1 min-w-0 flex flex-col items-center justify-center py-1 text-center"
          aria-label={side === "before" ? t("Choisir la photo Avant") : t("Choisir la photo Après")}
        >
          <span className={`text-[9px] font-black uppercase tracking-wide whitespace-nowrap truncate max-w-full ${side === "after" ? "text-(--ep-accent)" : "text-(--ep-ink)/45"}`}>
            {side === "before" ? t("Avant") : t("Après")}
          </span>
          <span className="text-[13px] font-bold text-(--ep-strong) whitespace-nowrap truncate max-w-full">{formatSetDate(set.date)}</span>
        </button>
        <button
          type="button"
          onClick={() => step(side, 1)}
          disabled={idx >= last}
          aria-label={side === "before" ? t("Avant : séance plus récente") : t("Après : séance plus récente")}
          className="w-11 min-h-11 flex items-center justify-center text-(--ep-ink)/70 disabled:opacity-25"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    );
  }

  const overlay = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("Comparateur photo")}
      className="fixed inset-0 flex flex-col bg-(--ep-page) text-(--ep-ink)"
      style={{
        zIndex: 1000,
        paddingTop: "max(8px, env(safe-area-inset-top))",
        paddingBottom: "max(10px, env(safe-area-inset-bottom))",
      }}
    >
      {/* En-tête */}
      <div className="flex items-center gap-2 px-3 pb-2">
        <button
          type="button"
          onClick={onClose}
          aria-label={t("Fermer le comparateur")}
          className="w-11 h-11 rounded-xl flex items-center justify-center border border-(--ep-line)/25 bg-(--ep-s1) text-(--ep-ink)"
        >
          <X size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-widest text-(--ep-ink)/45 truncate">
            {audience === "coach" && subjectName ? `${t("Photos de")} ${subjectName}` : t("Mes photos")}
          </p>
          <p className="text-[15px] font-black uppercase tracking-tight text-(--ep-strong) truncate">
            {gapDays === 0 ? t("Même séance") : durationLabel(gapDays)}
          </p>
        </div>
        <div className="flex rounded-xl border border-(--ep-line)/25 bg-(--ep-s1) p-0.5" role="group" aria-label={t("Affichage")}>
          {([
            { key: "duo", icon: Columns2, label: t("Côte à côte") },
            { key: "slider", icon: ChevronsLeftRight, label: t("Curseur") },
            { key: "flip", icon: Repeat2, label: t("Bascule") },
          ] as const).map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => { setView(key); resetZoom(); }}
              aria-label={label}
              aria-pressed={view === key}
              title={label}
              className={`w-11 h-10 rounded-[10px] flex items-center justify-center transition-colors ${view === key ? "bg-(--ep-accent) text-(--ep-strong)" : "text-(--ep-ink)/60"}`}
            >
              <Icon size={18} />
            </button>
          ))}
        </div>
      </div>

      {/* Scène */}
      <div className="relative flex-1 min-h-0 mx-3">
        <div
          ref={stageRef}
          className="absolute inset-0"
          style={{ touchAction: "none" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
        >
          {stageContent}
        </div>
        <DrawLayer ref={drawRef} tool={tool} color={cssVar(DRAW_COLORS[colorIdx]) || "currentColor"} />
        {zoom.s > 1.01 && !tool && (
          <button
            type="button"
            onClick={resetZoom}
            className="absolute right-2 bottom-2 z-10 h-11 px-3 rounded-xl flex items-center gap-1.5 text-[11px] font-bold bg-(--ep-page)/85 border border-(--ep-line)/25 text-(--ep-ink)"
          >
            <ZoomOut size={15} /> {t("Taille réelle")}
          </button>
        )}
        {view === "flip" && !tool && (
          <button
            type="button"
            onClick={() => setFlipSide((s) => (s === "after" ? "before" : "after"))}
            className="absolute left-1/2 -translate-x-1/2 bottom-3 z-10 h-12 px-5 rounded-full flex items-center gap-2 text-[12px] font-black uppercase tracking-wider bg-(--ep-accent) text-(--ep-strong) shadow-lg"
          >
            <ArrowLeftRight size={16} /> {flipSide === "after" ? t("Voir avant") : t("Voir après")}
          </button>
        )}
        {tool && (
          <p className="absolute left-1/2 -translate-x-1/2 top-2 z-10 text-[10px] font-semibold px-3 py-1.5 rounded-full bg-(--ep-page)/85 text-(--ep-ink)/80 pointer-events-none whitespace-nowrap">
            {tool === "circle" ? t("Glisse pour entourer") : t("Dessine")} · {t("effacé après 5 s")}
          </p>
        )}
      </div>

      {/* Dates : flèches, glisser sur la photo, ou tap pour choisir */}
      <div className="grid grid-cols-2 gap-1.5 px-3 pt-2">
        {dateCard("before")}
        {dateCard("after")}
      </div>

      {/* Raccourcis de comparaison (relatifs à la photo Après) */}
      <div className="flex gap-1.5 px-3 pt-2 overflow-x-auto no-scrollbar">
        {RELATIVE_CHIPS.map(({ label, weeks }) => {
          const idx = weeks === "start" ? (afterIdx > 0 ? 0 : null) : findWeeksBefore(sets, afterIdx, weeks);
          const active = idx != null && idx === beforeIdx;
          return (
            <button
              key={label}
              type="button"
              disabled={idx == null}
              onClick={() => setRelative(weeks)}
              className={`${btnBase} h-11 px-3.5 flex-shrink-0 disabled:opacity-30 ${active ? btnOn : btnIdle}`}
            >
              {t(label)}
            </button>
          );
        })}
        <button type="button" onClick={() => setPicker("before")} className={`${btnBase} ${btnIdle} h-11 px-3 flex-shrink-0`} aria-label={t("Choisir une autre semaine")}>
          <CalendarDays size={15} /> {t("Autre")}
        </button>
      </div>

      {/* Angle */}
      {angleCount > 1 && (
        <div className="flex gap-1.5 px-3 pt-2" role="group" aria-label={t("Angle")}>
          {Array.from({ length: angleCount }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => { setAngle(i); resetZoom(); }}
              aria-pressed={a === i}
              className={`${btnBase} h-11 flex-1 ${a === i ? btnOn : btnIdle}`}
            >
              {t(angleLabel(i, angleCount))}
            </button>
          ))}
        </div>
      )}

      {/* Outils + post */}
      <div className="flex items-center gap-1.5 px-3 pt-2">
        <button
          type="button"
          onClick={() => setTool((v) => (v === "pen" ? null : "pen"))}
          aria-pressed={tool === "pen"}
          aria-label={t("Dessiner")}
          className={`${btnBase} w-11 h-11 ${tool === "pen" ? btnOn : btnIdle}`}
        >
          <Pencil size={17} />
        </button>
        <button
          type="button"
          onClick={() => setTool((v) => (v === "circle" ? null : "circle"))}
          aria-pressed={tool === "circle"}
          aria-label={t("Entourer")}
          className={`${btnBase} w-11 h-11 ${tool === "circle" ? btnOn : btnIdle}`}
        >
          <Circle size={17} />
        </button>
        <button
          type="button"
          onClick={() => setColorIdx((i) => (i + 1) % DRAW_COLORS.length)}
          aria-label={t("Changer de couleur")}
          className={`${btnBase} ${btnIdle} w-11 h-11`}
        >
          <span style={{ width: 20, height: 20, borderRadius: "50%", background: drawColor, boxShadow: "0 0 0 2px rgba(var(--ep-ink-rgb),0.25)" }} />
        </button>
        <button
          type="button"
          onClick={() => drawRef.current?.clear()}
          aria-label={t("Effacer les traits")}
          className={`${btnBase} ${btnIdle} w-11 h-11`}
        >
          <Eraser size={17} />
        </button>
        <button
          type="button"
          onClick={() => { setTool(null); setShareOpen(true); }}
          className="ml-auto inline-flex items-center justify-center gap-1.5 h-11 px-3.5 rounded-xl bg-(--ep-accent) text-(--ep-strong) text-[11px] font-black uppercase tracking-wider"
        >
          <Share2 size={16} /> {t("Post preuve sociale")}
        </button>
      </div>

      {picker && (
        <SetPicker
          sets={sets}
          angle={a}
          selected={picker === "before" ? beforeIdx : afterIdx}
          side={picker}
          firstDate={firstDate}
          onPick={(i) => {
            if (picker === "before") setBeforeIdx(i);
            else setAfterIdx(i);
            setPicker(null);
          }}
          onClose={() => setPicker(null)}
        />
      )}

      {shareOpen && (
        <SocialProofSheet
          beforeUrl={beforeUrl}
          afterUrl={afterUrl}
          beforeDate={before.date}
          afterDate={after.date}
          audience={audience}
          subjectName={subjectName}
          onClose={() => setShareOpen(false)}
        />
      )}
    </div>
  );

  return createPortal(overlay, document.body);
}

// ── Choix d'une séance (n'importe quelle semaine) ─────────────────────────

function SetPicker({
  sets, angle, selected, side, firstDate, onPick, onClose,
}: {
  sets: PhotoSet[];
  angle: number;
  selected: number;
  side: Side;
  firstDate: string;
  onPick: (i: number) => void;
  onClose: () => void;
}) {
  const t = useT();
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selected}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [selected]);
  return (
    <div className="fixed inset-0 flex flex-col justify-end" style={{ zIndex: 1010 }}>
      <button type="button" aria-label={t("Fermer")} onClick={onClose} className="absolute inset-0 bg-(--ep-shade)/55" />
      <div
        className="relative rounded-t-2xl border-t border-(--ep-line)/25 bg-(--ep-bg) px-3 pt-3"
        style={{ paddingBottom: "max(14px, env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-black uppercase tracking-widest text-(--ep-strong)">
            {side === "before" ? t("Photo Avant") : t("Photo Après")}
          </p>
          <button type="button" onClick={onClose} aria-label={t("Fermer")} className="w-11 h-11 flex items-center justify-center text-(--ep-ink)/60">
            <X size={18} />
          </button>
        </div>
        <div ref={listRef} className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {sets.map((s, i) => (
            <button
              key={s.id}
              type="button"
              data-idx={i}
              onClick={() => onPick(i)}
              className={`flex-shrink-0 w-[84px] rounded-xl overflow-hidden border text-left ${i === selected ? "border-(--ep-accent) ring-2 ring-(--ep-accent)/40" : "border-(--ep-line)/20"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.urls[angle] ?? s.urls[0]} alt="" loading="lazy" className="w-full aspect-[3/4] object-cover bg-(--ep-s2)" />
              <span className="block px-1.5 pt-1 text-[9px] font-black uppercase tracking-wider text-(--ep-ink)/50">
                {t("Sem.")} {weekIndex(firstDate, s.date)}
              </span>
              <span className="block px-1.5 pb-1.5 text-[11px] font-bold text-(--ep-strong)">{formatSetDate(s.date)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
