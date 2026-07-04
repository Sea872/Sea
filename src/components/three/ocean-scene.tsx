"use client";

import { Canvas } from "@react-three/fiber";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";

import { Ocean } from "@/components/three/ocean";

/**
 * The 3D ocean scene: a low camera skimming the water toward a hazy horizon,
 * with bloom on the sun glints and a vignette for cinematic framing.
 */
export function OceanScene() {
  return (
    <Canvas
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      camera={{ position: [0, 10, 42], fov: 40, near: 0.1, far: 400 }}
      onCreated={({ camera, scene }) => {
        camera.lookAt(0, 1, -35);
        scene.background = new THREE.Color("#081d30");
      }}
    >
      <Ocean />
      <EffectComposer>
        <Bloom
          intensity={0.9}
          luminanceThreshold={0.55}
          luminanceSmoothing={0.25}
          radius={0.7}
          mipmapBlur
        />
        <Vignette offset={0.28} darkness={0.72} />
      </EffectComposer>
    </Canvas>
  );
}
