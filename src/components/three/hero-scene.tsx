"use client";

import { Environment, Lightformer, Sparkles } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";

import { IridescentOrb } from "@/components/three/iridescent-orb";

/**
 * The 3D hero scene: an iridescent orb floating in dark space, lit by coloured
 * light panels (a self-contained environment, no external HDR) whose
 * reflections drive the thin-film rainbow. Drifting sparkles add depth and
 * bloom makes the highlights glow.
 */
export function HeroScene() {
  return (
    <Canvas
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ position: [0, 0, 6.5], fov: 45, near: 0.1, far: 100 }}
    >
      <ambientLight intensity={0.35} />
      <pointLight position={[6, 4, 6]} intensity={40} color="#a6e4ff" />
      <pointLight position={[-6, -2, 4]} intensity={22} color="#c9a6ff" />

      <IridescentOrb />

      <Sparkles
        count={70}
        scale={[14, 10, 6]}
        size={2.2}
        speed={0.25}
        color="#8fdcff"
        opacity={0.5}
      />

      {/* Coloured light panels build the reflections without a network HDR. */}
      <Environment resolution={256}>
        <Lightformer intensity={2.2} position={[0, 3, 3]} scale={[7, 7, 1]} color="#bfe9ff" />
        <Lightformer intensity={1.6} position={[-5, 1, -2]} scale={[5, 9, 1]} color="#b79bff" />
        <Lightformer intensity={1.8} position={[5, -2, 2]} scale={[7, 4, 1]} color="#5fe6d6" />
        <Lightformer intensity={1.2} position={[0, -4, -3]} scale={[10, 4, 1]} color="#2a6cff" />
      </Environment>

      <EffectComposer>
        <Bloom
          intensity={1.15}
          luminanceThreshold={0.6}
          luminanceSmoothing={0.3}
          radius={0.75}
          mipmapBlur
        />
        <Vignette offset={0.3} darkness={0.72} />
      </EffectComposer>
    </Canvas>
  );
}
