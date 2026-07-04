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

    const toUv = (event: PointerEvent): { x: number; y: number } => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (event.clientX - rect.left) / rect.width,
        y: 1 - (event.clientY - rect.top) / rect.height,
      };
    };

    const onPointerMove = (event: PointerEvent) => {
      const { x, y } = toUv(event);
      lastMove = performance.now();
      if (lastX >= 0) {
        const dx = x - lastX;
        const dy = y - lastY;
        const speed = Math.hypot(dx, dy);
        if (speed > 0.0004) {
          // Faster strokes displace more water, in a wider wake.
          const strength = -Math.min(speed * 30, 1.1);
          const radius = 0.015 + Math.min(speed * 0.5, 0.03);
          surface.splash((x + lastX) / 2, (y + lastY) / 2, radius, strength);
        }
      }
      lastX = x;
      lastY = y;
    };

    const onPointerDown = (event: PointerEvent) => {
      const { x, y } = toUv(event);
      lastMove = performance.now();
      surface.splash(x, y, 0.05, -1.8);
    };

    const onPointerLeave = () => {
      lastX = -1;
      lastY = -1;
    };

    host.addEventListener("pointermove", onPointerMove);
    host.addEventListener("pointerdown", onPointerDown);
    host.addEventListener("pointerleave", onPointerLeave);

    // Ambient raindrops keep the surface alive when the pointer rests.
    const rain = window.setInterval(
      () => {
        if (performance.now() - lastMove < 3000) return;
        surface.splash(0.1 + Math.random() * 0.8, 0.15 + Math.random() * 0.7, 0.012, -0.5);
      },
      2600 + Math.random() * 900,
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
