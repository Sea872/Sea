"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { MAX_RIPPLES, OCEAN_FRAGMENT, OCEAN_VERTEX } from "@/lib/ocean-shaders";

// Plane dimensions (local units) and tessellation.
const PLANE_W = 260;
const PLANE_H = 220;
const SEG_W = 220;
const SEG_H = 180;

// Only spawn a new ripple once the cursor has moved this far across the water.
const SPAWN_DISTANCE = 3.2;

/**
 * The interactive ocean surface: a tessellated plane displaced in the vertex
 * shader. The cursor is raycast against the water plane every frame and, when
 * it has travelled far enough, drops a ripple that radiates outward.
 */
export function Ocean() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { camera, raycaster } = useThree();

  // Ring buffer of ripples (xy = position, z = start time, w = strength).
  const ripples = useMemo(
    () => Array.from({ length: MAX_RIPPLES }, () => new THREE.Vector4(0, 0, -1000, 0)),
    [],
  );
  const rippleCursor = useRef(0);
  const timeRef = useRef(0);
  const lastSpawn = useRef({ x: Infinity, y: Infinity });
  const clickPending = useRef(false);

  // Cursor position in normalized device coords, updated from window events so
  // ripples follow the pointer even over the page content above the canvas.
  const ndc = useRef(new THREE.Vector2(0, 0));
  const pointerMoved = useRef(false);

  const waterPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const hit = useMemo(() => new THREE.Vector3(), []);

  const uniforms = useMemo(
    () => ({
      u_time: { value: 0 },
      u_ripples: { value: ripples },
      u_cameraPos: { value: new THREE.Vector3() },
      u_sunDir: { value: new THREE.Vector3(-0.3, 0.6, -0.75).normalize() },
      u_deepColor: { value: new THREE.Color("#02131f") },
      u_shallowColor: { value: new THREE.Color("#0a4763") },
      u_skyColor: { value: new THREE.Color("#0a2338") },
      u_sunColor: { value: new THREE.Color("#a6e4ff") },
    }),
    [ripples],
  );

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      ndc.current.set(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1,
      );
      pointerMoved.current = true;
    };
    const onDown = () => {
      clickPending.current = true;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
    };
  }, []);

  const spawn = (x: number, y: number, strength: number) => {
    const r = ripples[rippleCursor.current % MAX_RIPPLES];
    r.set(x, y, timeRef.current, strength);
    rippleCursor.current += 1;
    lastSpawn.current = { x, y };
  };

  useFrame((state) => {
    const material = materialRef.current;
    if (!material) return;

    const t = state.clock.elapsedTime;
    timeRef.current = t;
    material.uniforms.u_time.value = t;
    material.uniforms.u_cameraPos.value.copy(camera.position);

    const click = clickPending.current;
    clickPending.current = false;
    const moved = pointerMoved.current;
    pointerMoved.current = false;
    if (!moved && !click) return;

    // Raycast the cursor onto the water plane (cheap: a single math plane).
    raycaster.setFromCamera(ndc.current, camera);
    if (!raycaster.ray.intersectPlane(waterPlane, hit)) return;

    // World (x, y=0, z) maps back to the plane's local coordinates.
    const lx = hit.x;
    const ly = -hit.z;
    if (Math.abs(lx) > PLANE_W / 2 || Math.abs(ly) > PLANE_H / 2) return;

    if (click) {
      spawn(lx, ly, 2.0);
      return;
    }
    const dx = lx - lastSpawn.current.x;
    const dy = ly - lastSpawn.current.y;
    if (Math.hypot(dx, dy) > SPAWN_DISTANCE) {
      spawn(lx, ly, 0.9);
    }
  });

  return (
    <mesh rotation-x={-Math.PI / 2} frustumCulled={false}>
      <planeGeometry args={[PLANE_W, PLANE_H, SEG_W, SEG_H]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={OCEAN_VERTEX}
        fragmentShader={OCEAN_FRAGMENT}
        uniforms={uniforms}
      />
    </mesh>
  );
}
