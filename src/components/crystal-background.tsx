"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

// The 3D scene is browser-only and heavy, so load it lazily and never on the
// server. A static gradient shows first (and stays as the fallback).
const CrystalScene = dynamic(
  () => import("@/components/three/crystal-scene").then((m) => m.CrystalScene),
  { ssr: false },
);

/**
 * Site-wide 3D crystal background. Renders the WebGL scene when supported and
 * the visitor has not asked for reduced motion; otherwise it stays a calm
 * static gradient.
 */
export function CrystalBackground() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const probe = document.createElement("canvas");
    if (!probe.getContext("webgl2")) return;
    // Client-only WebGL gate: enable after mount so the server render (static
    // gradient) and the first client render match before hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnabled(true);
  }, []);

  return (
    <div aria-hidden="true" className="fixed inset-0 -z-10">
      {/* Static deep gradient: first paint and reduced-motion fallback. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,#0a1e33_0%,#050d19_55%,#02060e_100%)]" />
      {enabled && (
        <div className="absolute inset-0">
          <CrystalScene />
        </div>
      )}
    </div>
  );
}
