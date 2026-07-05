"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Cifra que cuenta hacia arriba al entrar en vista (efecto de la StakesSection).
 * SSR-safe: el primer render muestra el valor FINAL formateado, así sin JS o
 * bajo prefers-reduced-motion la cifra correcta siempre está presente. Solo
 * anima cuando el elemento está bajo el fold al montar (el usuario no ha visto
 * el valor final aún → no hay parpadeo) y el usuario no pidió menos movimiento.
 */
const fmt = new Intl.NumberFormat("es-CL");

export function CountUp({
  value,
  prefix = "",
  className,
  durationMs = 1200,
}: {
  value: number;
  prefix?: string;
  className?: string;
  durationMs?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    // Ya visible al montar → dejar el valor final, sin animar (evita flash).
    const rect = el.getBoundingClientRect();
    if (rect.top <= window.innerHeight) return;

    setDisplay(0);
    let raf = 0;
    let start = 0;
    const animate = () => {
      const io = new IntersectionObserver(
        (entries) => {
          if (!entries[0].isIntersecting) return;
          io.disconnect();
          const step = (now: number) => {
            if (!start) start = now;
            const p = Math.min((now - start) / durationMs, 1);
            // ease-out-quart
            const eased = 1 - Math.pow(1 - p, 4);
            setDisplay(Math.round(value * eased));
            if (p < 1) raf = requestAnimationFrame(step);
          };
          raf = requestAnimationFrame(step);
        },
        { threshold: 0.3 },
      );
      io.observe(el);
      return io;
    };
    const io = animate();

    return () => {
      cancelAnimationFrame(raf);
      io?.disconnect();
    };
  }, [value, durationMs]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {fmt.format(display)}
    </span>
  );
}
