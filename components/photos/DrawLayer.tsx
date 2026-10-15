"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";

// Calque de dessin du comparateur photo : trait libre ou cercle (pour
// entourer une zone). Chaque trait reste net 4 s puis s'efface en fondu, et
// disparaît à 5 s : on pointe un détail à l'oral, l'écran se nettoie seul.

export type DrawTool = "pen" | "circle";

export interface DrawLayerHandle {
  clear: () => void;
}

interface Stroke {
  tool: DrawTool;
  color: string;
  points: { x: number; y: number }[];
  /** Fin du tracé (ms), null tant que le doigt est posé. */
  doneAt: number | null;
}

export const STROKE_LIFETIME_MS = 5000;
const FADE_FROM_MS = 4000;

function strokeAlpha(s: Stroke, now: number): number {
  if (s.doneAt == null) return 1;
  const age = now - s.doneAt;
  if (age <= FADE_FROM_MS) return 1;
  return Math.max(0, 1 - (age - FADE_FROM_MS) / (STROKE_LIFETIME_MS - FADE_FROM_MS));
}

function readShadow(): string {
  if (typeof document === "undefined") return "rgba(0,0,0,0.45)";
  const rgb = getComputedStyle(document.documentElement).getPropertyValue("--ep-shade-rgb").trim();
  return rgb ? `rgba(${rgb}, 0.45)` : "rgba(0,0,0,0.45)";
}

const DrawLayer = forwardRef<DrawLayerHandle, { tool: DrawTool | null; color: string }>(function DrawLayer(
  { tool, color },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const activeRef = useRef<{ pointerId: number; stroke: Stroke } | null>(null);
  const rafRef = useRef<number | null>(null);
  const shadowRef = useRef<string>("rgba(0,0,0,0.45)");

  const paint = useCallback(() => {
    rafRef.current = null;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const now = Date.now();
    strokesRef.current = strokesRef.current.filter((s) => s.doneAt == null || now - s.doneAt < STROKE_LIFETIME_MS);
    for (const s of strokesRef.current) {
      const alpha = strokeAlpha(s, now);
      if (alpha <= 0 || s.points.length === 0) continue;
      ctx.globalAlpha = alpha;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      const path = new Path2D();
      if (s.tool === "circle") {
        const a = s.points[0];
        const b = s.points[s.points.length - 1];
        const rx = Math.max(6, Math.abs(b.x - a.x) / 2);
        const ry = Math.max(6, Math.abs(b.y - a.y) / 2);
        path.ellipse((a.x + b.x) / 2, (a.y + b.y) / 2, rx, ry, 0, 0, Math.PI * 2);
      } else {
        path.moveTo(s.points[0].x, s.points[0].y);
        if (s.points.length === 1) path.lineTo(s.points[0].x + 0.1, s.points[0].y + 0.1);
        for (let i = 1; i < s.points.length; i++) path.lineTo(s.points[i].x, s.points[i].y);
      }
      // Liseré sombre sous le trait : reste visible sur peau claire comme foncée.
      ctx.strokeStyle = shadowRef.current;
      ctx.lineWidth = 8;
      ctx.stroke(path);
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 4.5;
      ctx.stroke(path);
    }
    ctx.globalAlpha = 1;
    if (strokesRef.current.length > 0) rafRef.current = requestAnimationFrame(paint);
  }, []);

  const schedule = useCallback(() => {
    if (rafRef.current == null) rafRef.current = requestAnimationFrame(paint);
  }, [paint]);

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    schedule();
  }, [schedule]);

  useEffect(() => {
    shadowRef.current = readShadow();
    resize();
    const canvas = canvasRef.current;
    const ro = typeof ResizeObserver !== "undefined" && canvas ? new ResizeObserver(resize) : null;
    if (ro && canvas) ro.observe(canvas);
    return () => {
      ro?.disconnect();
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [resize]);

  useImperativeHandle(ref, () => ({
    clear: () => {
      strokesRef.current = [];
      activeRef.current = null;
      schedule();
    },
  }), [schedule]);

  function localPoint(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function finish(e: React.PointerEvent<HTMLCanvasElement>) {
    const active = activeRef.current;
    if (!active || active.pointerId !== e.pointerId) return;
    active.stroke.doneAt = Date.now();
    activeRef.current = null;
    schedule();
  }

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      onPointerDown={(e) => {
        if (!tool || activeRef.current) return;
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
        const stroke: Stroke = { tool, color, points: [localPoint(e)], doneAt: null };
        strokesRef.current.push(stroke);
        activeRef.current = { pointerId: e.pointerId, stroke };
        schedule();
      }}
      onPointerMove={(e) => {
        const active = activeRef.current;
        if (!active || active.pointerId !== e.pointerId) return;
        const p = localPoint(e);
        if (active.stroke.tool === "circle") {
          active.stroke.points = [active.stroke.points[0], p];
        } else {
          active.stroke.points.push(p);
        }
        schedule();
      }}
      onPointerUp={finish}
      onPointerCancel={finish}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 5,
        touchAction: "none",
        pointerEvents: tool ? "auto" : "none",
        cursor: tool ? "crosshair" : "default",
      }}
    />
  );
});

export default DrawLayer;
