"use client";

import { useEffect, useRef } from "react";

import { createWaterSurface } from "@/lib/water";

/**
 * Site-wide interactive water surface (the original wave effect). A fixed,
 * full-viewport canvas sits behind all content; pointer movement anywhere on
 * the page pushes the water and radiates ripples. Falls back to a static
 * gradient without WebGL2 or when the visitor prefers reduced motion.
 */
export function WaterBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const surface = createWaterSurface(canvas);
    if (!surface) return;

    let lastX = -1;
    let lastY = -1;
    let lastMove = performance.now();

    const toUv = (event: PointerEvent): { x: number; y: number } => ({
      x: event.clientX / window.innerWidth,
      y: 1 - event.clientY / window.innerHeight,
    });

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

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    document.documentElement.addEventListener("pointerleave", onPointerLeave);

    // Ambient raindrops keep the surface alive when the pointer rests.
    const rain = window.setInterval(
      () => {
        if (performance.now() - lastMove < 3000) return;
        surface.splash(0.1 + Math.random() * 0.8, 0.15 + Math.random() * 0.7, 0.012, -0.5);
      },
      2600 + Math.random() * 900,
    );

    const onVisibility = () => surface.setActive(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);

    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => surface.resize(), 180);
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.clearInterval(rain);
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      document.documentElement.removeEventListener("pointerleave", onPointerLeave);
      surface.destroy();
    };
  }, []);

  return (
    <div aria-hidden="true" className="fixed inset-0 -z-10">
      {/* Static light gradient: fallback and first paint before WebGL kicks in. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,#eef2f7_0%,#dfe6ee_60%,#d3dce7_100%)]" />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
