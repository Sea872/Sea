"use client";

import { useEffect, useRef } from "react";

import { createWaterSurface } from "@/lib/water";
import { waveConfig } from "@/lib/wave-config";

/**
 * Site-wide water surface. A fixed, full-viewport canvas sits behind all
 * content and runs a wave-equation simulation: the cursor is a disturbance
 * source injecting energy, and the wavefront propagates outward by itself
 * while the "water" only oscillates locally. Falls back to a static gradient
 * without WebGL2 or when the visitor prefers reduced motion.
 */
export function WaveCanvas() {
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
    let lastSplatX = -1;
    let lastSplatY = -1;
    let lastSplatTime = 0;

    const toUv = (event: PointerEvent): { x: number; y: number } => ({
      x: event.clientX / window.innerWidth,
      y: 1 - event.clientY / window.innerHeight,
    });

    const onPointerMove = (event: PointerEvent) => {
      const { x, y } = toUv(event);
      const now = performance.now();
      lastMove = now;
      if (lastX >= 0) {
        const speed = Math.hypot(x - lastX, y - lastY);
        const traveled = lastSplatX < 0 ? 1 : Math.hypot(x - lastSplatX, y - lastSplatY);
        // The cursor is a disturbance source: press the surface at well
        // separated points so each press radiates one broad wavefront
        // instead of a chain of interfering ripples.
        if (speed > 0.0006 && traveled > waveConfig.strokeSpacing && now - lastSplatTime > 90) {
          const strength = -Math.min(0.35 + speed * 14, waveConfig.strokeStrength);
          const radius = waveConfig.strokeRadius + Math.min(speed * 0.8, 0.06);
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
      surface.splash(x, y, waveConfig.clickRadius, -waveConfig.clickStrength);
    };

    const onPointerLeave = () => {
      lastX = -1;
      lastY = -1;
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    document.documentElement.addEventListener("pointerleave", onPointerLeave);

    // A single opening drop so the page never loads dead still.
    const openingTimer = window.setTimeout(() => {
      surface.splash(0.5, 0.6, 0.11, -1.6);
    }, 400);

    // Sparse, soft raindrops while the pointer rests.
    const rain = window.setInterval(
      () => {
        if (performance.now() - lastMove < 3500) return;
        surface.splash(0.1 + Math.random() * 0.8, 0.15 + Math.random() * 0.7, 0.05, -0.8);
      },
      4200 + Math.random() * 1600,
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
      window.clearTimeout(openingTimer);
      window.clearTimeout(resizeTimer);
      window.clearInterval(rain);
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
      {/* Static deep-sea gradient: fallback and first paint before WebGL kicks in. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_85%,#062033_0%,#03101d_55%,#020617_100%)]" />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
