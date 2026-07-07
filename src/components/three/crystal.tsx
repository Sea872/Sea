"use client";

import { MeshTransmissionMaterial } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import type { Mesh } from "three";

/**
 * A crystal glass blob. MeshTransmissionMaterial gives real refraction (light
 * bends through it), chromatic aberration (rainbow edges), and reflections, so
 * it reads as a genuine 3D glass object rather than a flat shader. It eases
 * toward the cursor and turns slowly on its own.
 */
export function Crystal() {
  const ref = useRef<Mesh>(null);
  const { pointer, viewport } = useThree();

  useFrame((state, delta) => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = state.clock.elapsedTime;
    // Ease toward the cursor (a fraction of the viewport) plus a gentle idle bob.
    const targetX = pointer.x * viewport.width * 0.2;
    const targetY = pointer.y * viewport.height * 0.2 + Math.sin(t * 0.6) * 0.15;
    const k = Math.min(delta * 3, 0.12);
    mesh.position.x += (targetX - mesh.position.x) * k;
    mesh.position.y += (targetY - mesh.position.y) * k;
    mesh.rotation.x += delta * 0.12;
    mesh.rotation.y += delta * 0.16;
  });

  return (
    <mesh ref={ref} scale={1.7}>
      <icosahedronGeometry args={[1, 16]} />
      <MeshTransmissionMaterial
        samples={8}
        resolution={512}
        transmission={1}
        thickness={1.6}
        roughness={0.06}
        ior={1.42}
        chromaticAberration={0.09}
        anisotropicBlur={0.12}
        distortion={0.4}
        distortionScale={0.35}
        temporalDistortion={0.15}
        backside
        backsideThickness={1.0}
        color="#ffffff"
        attenuationColor="#9fd8ff"
        attenuationDistance={3}
      />
    </mesh>
  );
}
