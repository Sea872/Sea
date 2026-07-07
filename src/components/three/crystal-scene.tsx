"use client";

import { Environment, Lightformer } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import * as THREE from "three";

import { Crystal } from "@/components/three/crystal";

/**
 * Soft coloured discs behind the glass. The transmission material refracts
 * these, which is what turns the crystal iridescent instead of just dark.
 */
function Backdrop() {
  return (
    <group position={[0, 0, -4]}>
      <mesh position={[-2.6, 1.4, 0]}>
        <circleGeometry args={[2.6, 48]} />
        <meshBasicMaterial color="#1b6ea8" transparent opacity={0.55} />
      </mesh>
      <mesh position={[2.8, -0.6, -0.6]}>
        <circleGeometry args={[2.3, 48]} />
        <meshBasicMaterial color="#6d3bd6" transparent opacity={0.5} />
      </mesh>
      <mesh position={[0.4, -2.6, -1.2]}>
        <circleGeometry args={[2.8, 48]} />
        <meshBasicMaterial color="#128f86" transparent opacity={0.45} />
      </mesh>
    </group>
  );
}

/**
 * The 3D crystal scene: a glass blob in dark space, lit and reflected by
 * coloured light panels, with bloom on the brightest highlights.
 */
export function CrystalScene() {
  return (
    <Canvas
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      camera={{ position: [0, 0, 6], fov: 42, near: 0.1, far: 100 }}
      onCreated={({ scene }) => {
        scene.background = new THREE.Color("#050b16");
      }}
    >
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={1.2} />

      <Backdrop />
      <Crystal />

      {/* Coloured light panels build the reflections and refractions. */}
      <Environment resolution={256}>
        <Lightformer intensity={2.2} position={[0, 3, 4]} scale={[8, 8, 1]} color="#bfe9ff" />
        <Lightformer intensity={1.8} position={[-5, 1, -1]} scale={[5, 9, 1]} color="#b79bff" />
        <Lightformer intensity={1.6} position={[5, -2, 2]} scale={[7, 4, 1]} color="#5fe6d6" />
        <Lightformer intensity={1.2} position={[0, -5, -2]} scale={[10, 5, 1]} color="#2a6cff" />
      </Environment>

      <EffectComposer>
        <Bloom
          intensity={0.5}
          luminanceThreshold={0.6}
          luminanceSmoothing={0.3}
          radius={0.6}
          mipmapBlur
        />
      </EffectComposer>
    </Canvas>
  );
}
