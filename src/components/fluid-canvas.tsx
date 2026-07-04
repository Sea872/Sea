"use client";

import { useEffect, useRef } from "react";

import { createFluidSurface } from "@/lib/fluid";

/**
 * Site-wide fluid cursor trail. A fixed, full-viewport canvas sits behind all
 * content; pointer movement anywhere on the page stirs swirling dye into the
 * simulation. Falls back to a static gradient without WebGL2 or when the
 * visitor prefers reduced motion.
 */
export function FluidCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const surface = createFluidSurface(canvas);
    if (!surface) return;

    let lastX = -1;
    let lastY = -1;

    const toUv = (event: PointerEvent): { x: number; y: number } => ({
      x: event.clientX / window.innerWidth,
      y: 1 - event.clientY / window.innerHeight,
    });

    const onPointerMove = (event: PointerEvent) => {
      const { x, y } = toUv(event);
      if (lastX >= 0) {
        const dx = x - lastX;
        const dy = y - lastY;
        const traveled = Math.hypot(dx, dy);
        // Space injections out along the stroke and scale the dye with
        // speed, so the wake stays a thin watery trace instead of flooding.
        if (traveled > 0.004) {
          const power = Math.min(0.04 + traveled * 6, 0.13);
          surface.splat(x, y, dx, dy, power);
          lastX = x;
          lastY = y;
        }
      } else {
        lastX = x;
        lastY = y;
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      const { x, y } = toUv(event);
      surface.burst(x, y);
    };

    const onPointerLeave = () => {
      lastX = -1;
      lastY = -1;
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    document.documentElement.addEventListener("pointerleave", onPointerLeave);

    // A soft opening swirl so the page never loads dead still.
    const openingTimer = window.setTimeout(() => {
      surface.burst(0.5, 0.62);
    }, 350);

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
