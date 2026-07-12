"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Center,
  Environment,
  Lightformer,
  OrbitControls,
  useGLTF,
} from "@react-three/drei";
import * as THREE from "three";

/**
 * Malla de seguridad de los 14 dominios (sección DOMINIOS de la landing): a la
 * izquierda la lista de dominios; a la derecha una malla de energía (WebGL) que
 * envuelve un núcleo de información. Al elegir un dominio, su color tiñe la luz
 * interior, la cúpula, los nodos (40% encendidos) y sus conexiones/lásers.
 *
 * Textos por props (i18n desde el server component). Colores y geometría son
 * decisiones visuales y viven aquí. Respeta prefers-reduced-motion (fallback
 * estático) y monta el canvas solo al entrar en viewport.
 */

export interface MeshDomain {
  label: string;
  title: string;
  desc: string;
}

const MODEL_URL = "/models/ipad-pro.glb";

// Un color por dominio (mismo orden i18n): tinte de luz interior, nodos y aristas.
const DOMAIN_COLORS = [
  "#6ea8ff",
  "#5fd0c4",
  "#8ad66a",
  "#d8c85f",
  "#e0975a",
  "#e0655f",
  "#e06fae",
  "#b070e0",
  "#7d7be0",
  "#5fb0e0",
  "#e05f7a",
  "#9bd05f",
  "#e0b25f",
  "#5fd0a0",
];
const IDLE_GLOW = "#c7d3ea";

const NODE_COUNT = 84;
const RADIUS = 1.8;
const LINK_THRESHOLD = 0.95;

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

const VERTEX_SHADER = /* glsl */ `
  attribute float aOn;
  attribute float aPhase;
  uniform float uTime;
  uniform float uSize;
  varying float vGlow;
  void main() {
    float sel = aOn;
    vGlow = sel;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float pulse = 0.5 + 0.5 * sin(uTime * 2.2 + aPhase);
    float size = uSize * (1.0 + sel * (0.4 + pulse * 0.6));
    gl_PointSize = size * (16.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;
const FRAGMENT_SHADER = /* glsl */ `
  precision mediump float;
  uniform float uActiveMode;
  uniform vec3 uIdle;
  uniform vec3 uDim;
  uniform vec3 uGlow;
  varying float vGlow;
  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    float soft = smoothstep(0.5, 0.0, d);
    vec3 base = (uActiveMode > 0.5) ? uDim : uIdle;
    vec3 col = mix(base, uGlow, vGlow);
    float baseAlpha = (uActiveMode > 0.5) ? 0.16 : 0.55;
    float alpha = soft * mix(baseAlpha, 1.0, vGlow);
    gl_FragColor = vec4(col, alpha);
  }
`;

const SHELL_VERTEX = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;
const SHELL_FRAGMENT = /* glsl */ `
  precision mediump float;
  uniform vec3 uColor;
  uniform float uPower;
  uniform float uOpacity;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    float f = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), uPower);
    gl_FragColor = vec4(uColor, f * uOpacity);
  }
`;

const PULSE_VERTEX = /* glsl */ `
  attribute vec3 aStart;
  attribute vec3 aEnd;
  attribute float aSpeed;
  attribute float aPhase;
  uniform float uTime;
  uniform float uSize;
  varying float vT;
  void main() {
    float t = fract(uTime * aSpeed + aPhase);
    vT = t;
    vec3 pos = mix(aStart, aEnd, t);
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = uSize * (16.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;
const PULSE_FRAGMENT = /* glsl */ `
  precision mediump float;
  uniform vec3 uColor;
  varying float vT;
  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    float soft = smoothstep(0.5, 0.0, d);
    float fade = sin(vT * 3.14159);
    gl_FragColor = vec4(uColor, soft * fade * 0.9);
  }
`;

function Mesh({ active }: { active: number | null }) {
  const group = useRef<THREE.Group>(null);
  const mat = useRef<THREE.ShaderMaterial>(null);
  const lines = useRef<THREE.LineSegments>(null);
  const beams = useRef<THREE.LineSegments>(null);
  const beamMat = useRef<THREE.LineBasicMaterial>(null);
  const beamPositions = useMemo(() => new Float32Array(NODE_COUNT * 6), []);
  const litCount = useRef(0);
  const shellMat = useRef<THREE.ShaderMaterial>(null);
  const pulseMat = useRef<THREE.ShaderMaterial>(null);

  const {
    positions,
    phases,
    pairs,
    linePositions,
    pulseStart,
    pulseEnd,
    pulseSpeed,
    pulsePhase,
  } = useMemo(() => {
    const pos: THREE.Vector3[] = [];
    const phases = new Float32Array(NODE_COUNT);
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < NODE_COUNT; i++) {
      const y = 1 - (i / (NODE_COUNT - 1)) * 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = golden * i;
      pos.push(
        new THREE.Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r).multiplyScalar(RADIUS),
      );
      phases[i] = (i * 12.9898) % (Math.PI * 2);
    }
    const pairs: [number, number][] = [];
    for (let i = 0; i < NODE_COUNT; i++) {
      for (let j = i + 1; j < NODE_COUNT; j++) {
        if (pos[i].distanceTo(pos[j]) < LINK_THRESHOLD) pairs.push([i, j]);
      }
    }
    const linePositions = new Float32Array(pairs.length * 6);
    const pulseStart = new Float32Array(pairs.length * 3);
    const pulseEnd = new Float32Array(pairs.length * 3);
    const pulseSpeed = new Float32Array(pairs.length);
    const pulsePhase = new Float32Array(pairs.length);
    pairs.forEach(([i, j], k) => {
      linePositions.set(
        [pos[i].x, pos[i].y, pos[i].z, pos[j].x, pos[j].y, pos[j].z],
        k * 6,
      );
      const [a, b] = k % 2 === 0 ? [i, j] : [j, i];
      pulseStart.set([pos[a].x, pos[a].y, pos[a].z], k * 3);
      pulseEnd.set([pos[b].x, pos[b].y, pos[b].z], k * 3);
      pulseSpeed[k] = 0.12 + (k % 5) * 0.04;
      pulsePhase[k] = (k * 0.37) % 1;
    });
    return {
      positions: pos,
      phases,
      pairs,
      linePositions,
      pulseStart,
      pulseEnd,
      pulseSpeed,
      pulsePhase,
    };
  }, []);

  const pointPositions = useMemo(() => {
    const arr = new Float32Array(NODE_COUNT * 3);
    positions.forEach((p, i) => arr.set([p.x, p.y, p.z], i * 3));
    return arr;
  }, [positions]);

  const lineColors = useMemo(
    () => new Float32Array(pairs.length * 6),
    [pairs.length],
  );

  // 40% de nodos encendidos por selección, pseudo-aleatorio pero estable por dominio.
  const aOn = useMemo(() => {
    const arr = new Float32Array(NODE_COUNT);
    if (active === null) return arr;
    for (let i = 0; i < NODE_COUNT; i++) {
      const s = Math.sin(i * 127.1 + active * 311.7 + 0.5) * 43758.5453;
      const r = s - Math.floor(s);
      arr[i] = r < 0.4 ? 1 : 0;
    }
    return arr;
  }, [active]);

  const uniforms = useMemo(
    () => ({
      uActiveMode: { value: 0 },
      uTime: { value: 0 },
      uSize: { value: 2.9 },
      uIdle: { value: new THREE.Color("#a7bbdd") },
      uDim: { value: new THREE.Color("#454f66") },
      uGlow: { value: new THREE.Color("#ffffff") },
    }),
    [],
  );
  const shellUniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(IDLE_GLOW) },
      uPower: { value: 3.2 },
      uOpacity: { value: 0.5 },
    }),
    [],
  );
  const pulseUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSize: { value: 3.2 },
      uColor: { value: new THREE.Color(IDLE_GLOW) },
    }),
    [],
  );

  useEffect(() => {
    const glowHex = active !== null ? DOMAIN_COLORS[active] : "#ffffff";
    if (mat.current) {
      mat.current.uniforms.uActiveMode.value = active === null ? 0 : 1;
      mat.current.uniforms.uGlow.value.set(glowHex);
    }
    if (shellMat.current) shellMat.current.uniforms.uColor.value.set(glowHex);
    if (pulseMat.current) pulseMat.current.uniforms.uColor.value.set(glowHex);

    const on = aOn;
    const glow = new THREE.Color(glowHex);
    const idle = new THREE.Color("#8ea2c6");
    const dim = new THREE.Color("#333c50");
    pairs.forEach(([i, j], k) => {
      const lit = on[i] === 1 && on[j] === 1;
      const c = lit ? glow : active === null ? idle : dim;
      const a = lit ? 0.75 : active === null ? 0.2 : 0.08;
      lineColors.set([c.r * a, c.g * a, c.b * a, c.r * a, c.g * a, c.b * a], k * 6);
    });
    if (lines.current) {
      const attr = lines.current.geometry.getAttribute("color");
      if (attr) attr.needsUpdate = true;
    }

    if (beamMat.current) beamMat.current.color.set(glowHex);
    let n = 0;
    positions.forEach((p, i) => {
      if (on[i] === 1) {
        beamPositions.set([p.x, p.y, p.z, 0, 0, 0], n * 6);
        n++;
      }
    });
    litCount.current = n;
    if (beams.current) {
      const attr = beams.current.geometry.getAttribute("position");
      if (attr) attr.needsUpdate = true;
      beams.current.geometry.setDrawRange(0, n * 2);
    }
  }, [active, aOn, pairs, lineColors, positions, beamPositions]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (mat.current) mat.current.uniforms.uTime.value = t;
    if (pulseMat.current) pulseMat.current.uniforms.uTime.value = t;
    if (shellMat.current) {
      shellMat.current.uniforms.uOpacity.value =
        0.4 + 0.18 * (0.5 + 0.5 * Math.sin(t * 1.6));
    }
    if (beamMat.current) {
      beamMat.current.opacity =
        litCount.current > 0
          ? 0.35 + 0.25 * (0.5 + 0.5 * Math.sin(t * 2.6))
          : 0;
    }
  });

  return (
    <group ref={group}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[pointPositions, 3]} />
          <bufferAttribute attach="attributes-aOn" args={[aOn, 1]} />
          <bufferAttribute attach="attributes-aPhase" args={[phases, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={mat}
          uniforms={uniforms}
          vertexShader={VERTEX_SHADER}
          fragmentShader={FRAGMENT_SHADER}
          transparent
          depthWrite={false}
        />
      </points>
      <mesh>
        <sphereGeometry args={[RADIUS * 1.04, 48, 48]} />
        <shaderMaterial
          ref={shellMat}
          uniforms={shellUniforms}
          vertexShader={SHELL_VERTEX}
          fragmentShader={SHELL_FRAGMENT}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.FrontSide}
        />
      </mesh>
      <lineSegments ref={lines}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[linePositions, 3]} />
          <bufferAttribute attach="attributes-color" args={[lineColors, 3]} />
        </bufferGeometry>
        <lineBasicMaterial
          vertexColors
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </lineSegments>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[pulseStart, 3]} />
          <bufferAttribute attach="attributes-aStart" args={[pulseStart, 3]} />
          <bufferAttribute attach="attributes-aEnd" args={[pulseEnd, 3]} />
          <bufferAttribute attach="attributes-aSpeed" args={[pulseSpeed, 1]} />
          <bufferAttribute attach="attributes-aPhase" args={[pulsePhase, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={pulseMat}
          uniforms={pulseUniforms}
          vertexShader={PULSE_VERTEX}
          fragmentShader={PULSE_FRAGMENT}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      <lineSegments ref={beams}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[beamPositions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial
          ref={beamMat}
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </lineSegments>
    </group>
  );
}

function useRadialTexture() {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext("2d")!;
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, "rgba(255,255,255,0.95)");
    g.addColorStop(0.28, "rgba(255,255,255,0.42)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}

function InteriorGlow({ active }: { active: number | null }) {
  const tex = useRadialTexture();
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const target = useMemo(
    () => new THREE.Color(active !== null ? DOMAIN_COLORS[active] : IDLE_GLOW),
    [active],
  );
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const pulse = 0.5 + 0.5 * Math.sin(t * 1.8);
    const targetOpacity = active !== null ? 0.72 + pulse * 0.3 : 0.34;
    if (mat.current) {
      mat.current.opacity += (targetOpacity - mat.current.opacity) * 0.05;
      mat.current.color.lerp(target, 0.08);
    }
    if (mesh.current) {
      const s = (active !== null ? 4.4 : 3.7) + pulse * 0.3;
      mesh.current.scale.setScalar(s);
      // Billboard: siempre de frente a la cámara (aunque se orbite la escena).
      mesh.current.quaternion.copy(state.camera.quaternion);
    }
  });
  return (
    <mesh ref={mesh} position={[0, 0, -0.1]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        ref={mat}
        map={tex}
        color={IDLE_GLOW}
        transparent
        opacity={0.26}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  );
}

function CenterModel() {
  const { scene } = useGLTF(MODEL_URL);
  const model = useMemo(() => scene.clone(true), [scene]);
  const grp = useRef<THREE.Group>(null);
  const fitScale = useMemo(() => {
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    return 1.15 / maxDim;
  }, [model]);
  useFrame((state, delta) => {
    if (!grp.current) return;
    grp.current.rotation.y += delta * 0.18;
    grp.current.position.y = Math.sin(state.clock.elapsedTime * 0.7) * 0.05;
  });
  return (
    <group ref={grp} scale={fitScale}>
      <Center>
        <primitive object={model} />
      </Center>
    </group>
  );
}
useGLTF.preload(MODEL_URL);

function CenterLight({ active }: { active: number | null }) {
  const light = useRef<THREE.PointLight>(null);
  const target = useMemo(
    () => new THREE.Color(active !== null ? DOMAIN_COLORS[active] : "#dfe8f7"),
    [active],
  );
  useFrame((state) => {
    if (!light.current) return;
    light.current.color.lerp(target, 0.08);
    const pulse = 0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 1.8);
    const ti = active !== null ? 3.6 + pulse * 1.6 : 1;
    light.current.intensity += (ti - light.current.intensity) * 0.06;
  });
  return <pointLight ref={light} position={[0, 0, 0.6]} intensity={1} distance={7} decay={1.4} />;
}

export function DomainsMesh({
  domains,
  phrase,
  emptyPrompt,
}: {
  domains: MeshDomain[];
  phrase: string;
  emptyPrompt: string;
}) {
  const reduced = useReducedMotion();
  const [active, setActive] = useState<number | null>(0);
  const wrap = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (reduced || !wrap.current) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(wrap.current);
    return () => io.disconnect();
  }, [reduced]);

  return (
    <div className="grid gap-16 lg:grid-cols-[minmax(0,280px)_1fr]">
      <ul className="flex flex-col gap-4">
        {domains.map((domain, i) => {
          const on = active === i;
          return (
            <li key={domain.label}>
              <button
                type="button"
                onClick={() => setActive(on ? null : i)}
                className={
                  "flex w-full items-center gap-8 rounded-buttons border px-12 py-8 text-left text-body-sm transition-colors " +
                  (on
                    ? "border-ink bg-ink text-white"
                    : "border-stone bg-white text-carbon hover:border-carbon")
                }
              >
                <span className="tabular-nums text-caption opacity-60">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="font-medium">{domain.label}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <div
        ref={wrap}
        className="relative min-h-[560px] overflow-hidden rounded-cards bg-ink"
      >
        {reduced ? (
          <div className="flex h-full min-h-[560px] items-center justify-center text-caption text-white/40">
            {emptyPrompt}
          </div>
        ) : inView ? (
          <Canvas
            camera={{ position: [0, 0, 8.5], fov: 45 }}
            dpr={[1, 2]}
            gl={{ alpha: true }}
          >
            <hemisphereLight args={["#cdd8ef", "#0e1116", 0.5]} />
            <directionalLight position={[5, 6, 5]} intensity={1.1} />
            <directionalLight position={[-6, 3, -6]} intensity={1.3} color="#aec0e6" />
            <Environment resolution={256}>
              <Lightformer intensity={2} position={[0, 3, 2]} scale={[7, 3, 1]} color="#ffffff" />
              <Lightformer intensity={1.2} position={[-3, -1, -1]} scale={[4, 4, 1]} color="#9db4d8" />
            </Environment>
            <InteriorGlow active={active} />
            <CenterLight active={active} />
            <Suspense fallback={null}>
              <CenterModel />
            </Suspense>
            <Mesh active={active} />
            <OrbitControls
              makeDefault
              enablePan={false}
              enableZoom={false}
              autoRotate
              autoRotateSpeed={0.5}
              rotateSpeed={0.6}
            />
          </Canvas>
        ) : (
          <div className="flex h-full min-h-[560px] items-center justify-center text-caption text-white/50">
            …
          </div>
        )}

        {/* Dominio seleccionado: título + subrayado de color + descripción */}
        <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-ink/85 to-transparent p-24 max-sm:p-16">
          {active !== null ? (
            <>
              <h3 className="font-serif text-[24px] font-medium leading-[1.15] tracking-[-0.4px] text-white max-sm:text-[19px]">
                {domains[active].title}
              </h3>
              <span
                aria-hidden
                className="mt-2 block h-[3px] w-40 rounded-full"
                style={{ backgroundColor: DOMAIN_COLORS[active] }}
              />
              <p className="mt-4 max-w-[72ch] text-body-sm leading-[1.5] text-white/70">
                {domains[active].desc}
              </p>
            </>
          ) : (
            <h3 className="font-serif text-[26px] font-medium tracking-[-0.4px] text-white/80">
              {emptyPrompt}
            </h3>
          )}
        </div>

        <p className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/70 to-transparent px-24 pb-20 pt-24 text-center text-caption leading-[1.5] text-white/55 max-sm:px-16">
          {phrase}
        </p>
      </div>
    </div>
  );
}
