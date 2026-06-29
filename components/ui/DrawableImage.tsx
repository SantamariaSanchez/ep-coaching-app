"use client";

import { useRef, useEffect, useCallback } from "react";

interface Point {
  x: number;
  y: number;
  t: number;
}

interface Stroke {
  points: Point[];
  color: string;
}

const FADE_MS = 5000;
const FADE_START_MS = 4400; // begin fading out the last ~600ms before removal

export default function DrawableImage({
  src,
  alt,
  drawMode,
  color = "#ff3b3b",
}: {
  src: string;
  alt: string;
  drawMode: boolean;
  color?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const drawingRef = useRef(false);
  const rafRef = useRef<number | undefined>(undefined);

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    const ctx = canvas.getContext("2d");
    ctx?.scale(dpr, dpr);
  }, []);

  useEffect(() => {
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [resize]);

  useEffect(() => {
    function loop() {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      const dpr = window.devicePixelRatio || 1;
      if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
        const now = Date.now();

        strokesRef.current = strokesRef.current
          .map((s) => ({ ...s, points: s.points.filter((p) => now - p.t < FADE_MS) }))
          .filter((s) => s.points.length > 1);

        for (const stroke of strokesRef.current) {
          for (let i = 1; i < stroke.points.length; i++) {
            const p0 = stroke.points[i - 1];
            const p1 = stroke.points[i];
            const age = now - p1.t;
            const opacity = age > FADE_START_MS ? Math.max(0, 1 - (age - FADE_START_MS) / (FADE_MS - FADE_START_MS)) : 1;
            ctx.beginPath();
            ctx.globalAlpha = opacity;
            ctx.strokeStyle = stroke.color;
            ctx.lineWidth = 3;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(p1.x, p1.y);
            ctx.stroke();
          }
        }
        ctx.globalAlpha = 1;
      }
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  function getPos(e: React.PointerEvent<HTMLCanvasElement>): Point {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top, t: Date.now() };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawMode) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    strokesRef.current.push({ points: [getPos(e)], color });
  }
  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawMode || !drawingRef.current) return;
    const stroke = strokesRef.current[strokesRef.current.length - 1];
    stroke?.points.push(getPos(e));
  }
  function handlePointerUp() {
    drawingRef.current = false;
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-[3/4] bg-black/40 rounded-lg overflow-hidden"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- Google Drive thumbnail URLs aren't a known next/image remote pattern */}
      <img src={src} alt={alt} className="absolute inset-0 w-full h-full object-contain" draggable={false} />
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ touchAction: drawMode ? "none" : "auto", cursor: drawMode ? "crosshair" : "default" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
    </div>
  );
}
