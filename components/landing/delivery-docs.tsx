"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import { useReducedMotion } from "./use-reduced-motion";

/**
 * Documentación de entrega (sección "El entregable"): el expediente de
 * cumplimiento en 3D + el detalle de qué contiene, en dos ejes — QUÉ datos
 * maneja la empresa (los que podrían ser objeto de fiscalización) y CÓMO trata y
 * protege cada uno. Es la prueba de tratamiento que agiliza la fiscalización.
 * Hover en el documento: zoom-in + estrellas. Textos por props (i18n).
 */
export interface DeliveryGroup {
  heading: string;
  note: string;
  items: { name: string; desc: string }[];
}

const STARS = [
  { top: "10%", left: "16%", size: 15, color: "#6ea8ff", delay: 0 },
  { top: "18%", left: "84%", size: 20, color: "#e0b25f", delay: 90 },
  { top: "50%", left: "7%", size: 12, color: "#5fd0a0", delay: 160 },
  { top: "76%", left: "86%", size: 16, color: "#6ea8ff", delay: 60 },
  { top: "88%", left: "28%", size: 13, color: "#e0b25f", delay: 130 },
  { top: "40%", left: "93%", size: 11, color: "#b070e0", delay: 200 },
];

function Star({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="animate-pulse">
      <path
        d="M12 0c.6 6 1.4 6.8 12 12-10.6 5.2-11.4 6-12 12-.6-6-1.4-6.8-12-12C10.6 6.8 11.4 6 12 0Z"
        fill={color}
      />
    </svg>
  );
}

function useDocTexture(docTitle: string, docSubtitle: string, groups: DeliveryGroup[]) {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 360;
    c.height = 468;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#12161f";
    ctx.fillRect(0, 0, 360, 468);
    ctx.fillStyle = "#6ea8ff";
    ctx.fillRect(0, 0, 360, 10);
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(316, 58, 20, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(307, 58);
    ctx.lineTo(314, 65);
    ctx.lineTo(326, 50);
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.font = "600 26px Georgia, serif";
    const words = docTitle.split(" ");
    const mid = Math.ceil(words.length / 2);
    ctx.fillText(words.slice(0, mid).join(" "), 26, 54);
    ctx.fillText(words.slice(mid).join(" "), 26, 84);
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "400 14px system-ui, sans-serif";
    ctx.fillText(docSubtitle, 26, 110);
    let y = 148;
    groups.forEach((g, gi) => {
      ctx.fillStyle = gi === 0 ? "#6ea8ff" : "#5fd0a0";
      ctx.font = "700 12px system-ui, sans-serif";
      ctx.fillText(g.heading.toUpperCase(), 26, y);
      y += 26;
      g.items.forEach((it) => {
        ctx.fillStyle = "rgba(255,255,255,0.82)";
        ctx.font = "500 16px system-ui, sans-serif";
        ctx.fillText("·  " + it.name, 26, y);
        y += 30;
      });
      y += 8;
    });
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }, [docTitle, docSubtitle, groups]);
}

function DocumentMesh({
  hovered,
  docTitle,
  docSubtitle,
  groups,
}: {
  hovered: boolean;
  docTitle: string;
  docSubtitle: string;
  groups: DeliveryGroup[];
}) {
  const ref = useRef<THREE.Mesh>(null);
  // La textura usa `document` (canvas 2D): debe crearse solo en cliente, por eso
  // vive dentro de <Canvas> (no en el wrapper, que se renderiza también en SSR).
  const texture = useDocTexture(docTitle, docSubtitle, groups);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.position.y = Math.sin(t * 0.7) * 0.05;
    const ty = state.pointer.x * 0.3;
    const tx = -state.pointer.y * 0.2;
    ref.current.rotation.y += (ty - 0.12 - ref.current.rotation.y) * 0.05;
    ref.current.rotation.x += (tx - ref.current.rotation.x) * 0.05;
    const target = hovered ? 1.05 : 1;
    const s = ref.current.scale.x + (target - ref.current.scale.x) * 0.12;
    ref.current.scale.setScalar(s);
  });
  return (
    <mesh ref={ref}>
      <boxGeometry args={[1.7, 2.2, 0.06]} />
      <meshStandardMaterial map={texture} roughness={0.55} metalness={0} />
    </mesh>
  );
}

function DocScene({
  docTitle,
  docSubtitle,
  groups,
}: {
  docTitle: string;
  docSubtitle: string;
  groups: DeliveryGroup[];
}) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (reduced || !ref.current) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [reduced]);

  return (
    <div
      ref={ref}
      className="relative h-[380px] cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {inView && !reduced ? (
        <Canvas camera={{ position: [0, 0, 3.6], fov: 45 }} dpr={[1, 2]} gl={{ alpha: true }}>
          <ambientLight intensity={1} />
          <directionalLight position={[3, 5, 4]} intensity={1.4} />
          <directionalLight position={[-4, 1, 2]} intensity={0.6} color="#cdd8ef" />
          <Environment resolution={128}>
            <Lightformer intensity={2} position={[0, 3, 3]} scale={[6, 3, 1]} color="#ffffff" />
          </Environment>
          <DocumentMesh
            hovered={hovered}
            docTitle={docTitle}
            docSubtitle={docSubtitle}
            groups={groups}
          />
        </Canvas>
      ) : null}

      <div aria-hidden className="pointer-events-none absolute inset-0">
        {STARS.map((s, i) => (
          <span
            key={i}
            className="absolute transition-all duration-300 ease-out"
            style={{
              top: s.top,
              left: s.left,
              opacity: hovered ? 1 : 0,
              transform: `translate(-50%, -50%) scale(${hovered ? 1 : 0.4})`,
              transitionDelay: `${hovered ? s.delay : 0}ms`,
            }}
          >
            <Star size={s.size} color={s.color} />
          </span>
        ))}
      </div>
    </div>
  );
}

export function DeliveryDocs({
  intro,
  docTitle,
  docSubtitle,
  groups,
}: {
  intro: string;
  docTitle: string;
  docSubtitle: string;
  groups: DeliveryGroup[];
}) {
  return (
    <div className="grid items-center gap-24 sm:grid-cols-2">
      <DocScene docTitle={docTitle} docSubtitle={docSubtitle} groups={groups} />
      <div>
        <p className="max-w-[54ch] text-body-sm leading-[1.5] text-carbon">
          {intro}
        </p>
        <div className="mt-12 space-y-8">
          {groups.map((g) => (
            <div key={g.heading}>
              <p className="text-caption font-semibold uppercase tracking-[0.4px] text-ink">
                {g.heading}
              </p>
              <p className="mt-[2px] text-caption leading-[1.4] text-metal">
                {g.note}
              </p>
              <ul className="mt-6 space-y-5">
                {g.items.map((it) => (
                  <li key={it.name} className="flex gap-8">
                    <span
                      aria-hidden
                      className="mt-[6px] h-[6px] w-[6px] shrink-0 rounded-full bg-ink"
                    />
                    <span>
                      <span className="block text-caption font-semibold text-ink">
                        {it.name}
                      </span>
                      <span className="mt-[2px] block text-caption leading-[1.5] text-metal">
                        {it.desc}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
