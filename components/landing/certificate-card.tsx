"use client";

import { useRef, useState } from "react";
import { useReducedMotion } from "./use-reduced-motion";

/**
 * Certificado privado DPC con tilt 3D al puntero (CSS): la pieza verificable de
 * la entrega. Muestra fecha de certificación y hash. Se inclina siguiendo el
 * cursor con un brillo que se desplaza; estático bajo prefers-reduced-motion.
 * Textos por props (i18n desde el server component).
 */
export interface CertificateCardProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  issued: string;
  hash: string;
  status: string;
}

export function CertificateCard({
  eyebrow,
  title,
  subtitle,
  issued,
  hash,
  status,
}: CertificateCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, gx: 50, gy: 50 });

  function onMove(e: React.MouseEvent) {
    if (reduced || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    setTilt({ ry: (px - 0.5) * 16, rx: -(py - 0.5) * 16, gx: px * 100, gy: py * 100 });
  }
  function reset() {
    setTilt({ rx: 0, ry: 0, gx: 50, gy: 50 });
  }

  return (
    <div className="flex justify-center" style={{ perspective: "1000px" }}>
      <div
        ref={ref}
        onMouseMove={onMove}
        onMouseLeave={reset}
        className="relative aspect-[420/280] w-full max-w-[440px] overflow-hidden rounded-[16px] bg-ink text-white shadow-[0_30px_60px_-30px_rgba(15,18,23,0.6)] transition-transform duration-200 ease-out"
        style={{
          transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
          transformStyle: "preserve-3d",
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70 transition-[background] duration-200"
          style={{
            background: `radial-gradient(340px circle at ${tilt.gx}% ${tilt.gy}%, rgba(255,255,255,0.16), transparent 60%)`,
          }}
        />
        <div className="relative flex h-full flex-col justify-between p-24 max-sm:p-20">
          <div className="flex items-center justify-between">
            <span className="text-caption font-semibold uppercase tracking-[0.4px] text-white/70">
              {eyebrow}
            </span>
            <span
              aria-hidden
              className="flex h-36 w-36 items-center justify-center rounded-full border border-white/30"
            >
              <svg
                width={18}
                height={18}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 3 5 6v5c0 4.4 3 7.4 7 9 4-1.6 7-4.6 7-9V6l-7-3Z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </span>
          </div>
          <div>
            <p className="font-serif text-[30px] font-medium leading-[1.05] tracking-[-0.6px] max-sm:text-[24px]">
              {title}
            </p>
            <p className="mt-6 text-body-sm text-white/60">{subtitle}</p>
          </div>
          <div className="space-y-6">
            <div className="flex items-center justify-between text-caption text-white/50">
              <span>{issued}</span>
              <span>{status}</span>
            </div>
            <p className="truncate font-mono text-[11px] tracking-[0.5px] text-white/40">
              {hash}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
