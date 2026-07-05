"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { HeroCipher } from "./hero-cipher";

/**
 * Fondo del hero: escena WebGL (react-three-fiber) con fallback al cifrado 2D.
 * - Bajo prefers-reduced-motion → HeroCipher (2D, frame estático).
 * - Con motion permitido → HeroScene (WebGL), cargada dynamic (ssr:false), con
 *   la misma máscara vertical para que el texto del hero siempre mande.
 */
const HeroScene = dynamic(() => import("./hero-scene"), { ssr: false });

export function HeroBackground() {
  const [reduce, setReduce] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    setReady(true);
  }, []);

  if (reduce) return <HeroCipher />;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent_0%,#000_16%,#000_84%,transparent_100%)]"
    >
      {ready ? <HeroScene /> : null}
    </div>
  );
}
