"use client";

import { Float, MeshDistortMaterial } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * The floating centerpiece: a morphing icosphere with thin-film iridescence.
 * An outer group eases its rotation toward the cursor (the aether-style
 * "the object watches you" feel) while an inner Float adds idle drift, so the
 * two motions compose without fighting.
 */
export function IridescentOrb() {
  const group = useRef<THREE.Group>(null);
  const pointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    // Clamp delta so a tab regaining focus does not snap the rotation.
    const dt = Math.min(delta, 1 / 30);
    const targetY = pointer.current.x * 0.6;
    const targetX = -pointer.current.y * 0.4;
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, targetY, 3, dt);
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, targetX, 3, dt);
  });

  return (
    <group ref={group}>
      <Float speed={1.4} rotationIntensity={0.5} floatIntensity={0.9}>
        <mesh castShadow={false} receiveShadow={false}>
          <icosahedronGeometry args={[2, 20]} />
          <MeshDistortMaterial
            color="#0a3a5c"
            distort={0.38}
            speed={1.6}
            roughness={0.08}
            metalness={0.9}
            iridescence={1}
            iridescenceIOR={1.32}
            iridescenceThicknessRange={[120, 480]}
            clearcoat={1}
            clearcoatRoughness={0.12}
            envMapIntensity={1.4}
          />
        </mesh>
      </Float>
    </group>
  );
}
