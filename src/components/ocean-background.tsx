"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

// The 3D scene is heavy and browser-only, so load it lazily and never on the
// server. A static gradient shows first (and stays as the fallback).
const OceanScene = dynamic(
  () => import("@/components/three/ocean-scene").then((m) => m.OceanScene),
  { ssr: false },
);

/**
 * Site-wide 3D ocean background. Renders the WebGL scene when it is supported
 * and the visitor has not asked for reduced motion; otherwise it stays a calm
 * static deep-sea gradient.
 */
export function OceanBackground() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const probe = document.createElement("canvas");
    if (!probe.getContext("webgl2")) return;
    // Client-only WebGL gate: must enable after mount so the server render
    // (static gradient) and first client render match before hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnabled(true);
  }, []);

  return (
    <div aria-hidden="true" className="fixed inset-0 -z-10">
      {/* Static deep-sea gradient: first paint and reduced-motion fallback. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_80%,#0a2a44_0%,#04121f_55%,#020814_100%)]" />
      {enabled && (
        <div className="absolute inset-0">
          <OceanScene />
        </div>
      )}
    </div>
  );
}
