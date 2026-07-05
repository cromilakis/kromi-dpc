"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Campo 3D de partículas del hero (Fase 2 del spec scroll-motion): un "espacio
 * de datos" monocromo (ink) que gira suave, hace parallax hacia el puntero y se
 * dispersa/gira con el scroll — la relectura 3D del cifrado binario. Un solo
 * THREE.Points (miles de puntos en una BufferGeometry) = liviano. Se monta solo
 * en cliente (dynamic ssr:false) y con motion permitido (ver hero-background).
 */

const COUNT = 1600;

function Field() {
  const ref = useRef<THREE.Points>(null);
  const { pointer } = useThree();

  const geometry = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 15;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 7;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, []);

  useFrame((_, delta) => {
    const p = ref.current;
    if (!p) return;
    const d = Math.min(delta, 0.05); // clamp para saltos de frame
    p.rotation.y += d * 0.05;
    // Parallax suave hacia el puntero.
    p.rotation.x = THREE.MathUtils.lerp(p.rotation.x, pointer.y * 0.18, 0.04);
    p.rotation.z = THREE.MathUtils.lerp(p.rotation.z, pointer.x * -0.06, 0.04);
    // Parallax por scroll: el campo se hunde y se acerca al bajar (efecto profundidad).
    const s = window.scrollY || 0;
    p.position.y = s * 0.0016;
    p.position.z = Math.min(s * 0.0012, 3);
  });

  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial
        color="#1c1d1f"
        size={0.032}
        sizeAttenuation
        transparent
        opacity={0.5}
        depthWrite={false}
      />
    </points>
  );
}

export default function HeroScene() {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 8], fov: 62 }}
      gl={{ alpha: true, antialias: true }}
      style={{ position: "absolute", inset: 0 }}
    >
      <Field />
    </Canvas>
  );
}
