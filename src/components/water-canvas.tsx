"use client";

import { useEffect, useRef } from "react";

import { createWaterSurface } from "@/lib/water";

/**
 * Full-bleed interactive water surface. Renders behind its parent's content;
 * pointer events are read from the parent element so text and buttons layered
 * above the canvas still drive the ripples.
 */
export function WaterCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const surface = createWaterSurface(canvas);
    if (!surface) return;

    const host = canvas.parentElement ?? canvas;
    let lastX = -1;
    let lastY = -1;
    let lastMove = performance.now();
    let lastSplatX = -1;
    let lastSplatY = -1;
    let lastSplatTime = 0;

    const toUv = (event: PointerEvent): { x: number; y: number } => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (event.clientX - rect.left) / rect.width,
        y: 1 - (event.clientY - rect.top) / rect.height,
      };
    };

    const onPointerMove = (event: PointerEvent) => {
      const { x, y } = toUv(event);
      const now = performance.now();
      lastMove = now;
      if (lastX >= 0) {
        const speed = Math.hypot(x - lastX, y - lastY);
        const traveled = lastSplatX < 0 ? 1 : Math.hypot(x - lastSplatX, y - lastSplatY);
        // Space splats out by distance and time so a stroke leaves one
        // smooth broad wake instead of a chain of tiny ripples.
        if (speed > 0.0006 && traveled > 0.015 && now - lastSplatTime > 55) {
          const strength = -Math.min(speed * 12, 0.65);
          const radius = 0.03 + Math.min(speed * 0.6, 0.05);
          surface.splash((x + lastX) / 2, (y + lastY) / 2, radius, strength);
          lastSplatX = x;
          lastSplatY = y;
          lastSplatTime = now;
        }
      }
      lastX = x;
      lastY = y;
    };

    const onPointerDown = (event: PointerEvent) => {
      const { x, y } = toUv(event);
      lastMove = performance.now();
      surface.splash(x, y, 0.06, -1.2);
    };

    const onPointerLeave = () => {
      lastX = -1;
      lastY = -1;
    };

    host.addEventListener("pointermove", onPointerMove);
    host.addEventListener("pointerdown", onPointerDown);
    host.addEventListener("pointerleave", onPointerLeave);

    // Sparse, soft raindrops keep the surface alive when the pointer rests.
    const rain = window.setInterval(
      () => {
        if (performance.now() - lastMove < 3500) return;
        surface.splash(0.1 + Math.random() * 0.8, 0.15 + Math.random() * 0.7, 0.018, -0.35);
      },
      4200 + Math.random() * 1600,
    );

    const observer = new IntersectionObserver(
      ([entry]) => surface.setActive(entry.isIntersecting && !document.hidden),
      { threshold: 0 },
    );
    observer.observe(canvas);

    const onVisibility = () => surface.setActive(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);

    const resizer = new ResizeObserver(() => surface.resize());
    resizer.observe(canvas);

    return () => {
      window.clearInterval(rain);
      observer.disconnect();
      resizer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      host.removeEventListener("pointermove", onPointerMove);
      host.removeEventListener("pointerdown", onPointerDown);
      host.removeEventListener("pointerleave", onPointerLeave);
      surface.destroy();
    };
  }, []);

  return (
    <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden">
      {/* Static deep-sea gradient: fallback and first paint before WebGL kicks in. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_80%,#07243a_0%,#04101f_55%,#020617_100%)]" />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
