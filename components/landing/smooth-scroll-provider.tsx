"use client";

import { useEffect, type ReactNode } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Fundación de movimiento de la landing (Fase 1 del spec scroll-motion):
 * - Lenis: scroll suave con inercia, sincronizado con el ticker de GSAP.
 * - Reveals: cada sección (salvo el hero) entra con fade + leve subida.
 * - Timeline del ciclo: el riel se "dibuja" y los nodos 1→4 aparecen en orden.
 *
 * Guardrails: bajo prefers-reduced-motion NO se inicia nada (contenido tal cual).
 * Las animaciones son enhancement — el estado oculto se aplica SOLO por JS, así
 * que sin JS / SSR el contenido queda 100% visible (nunca se gatilla por clase).
 */
export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    gsap.registerPlugin(ScrollTrigger);

    // --- Lenis + sync con GSAP ---
    const lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    // Clics en anclas (#seccion) → desplazamiento suave vía Lenis, con offset
    // por el header sticky (64px). Cierra el menú móvil <details> al elegir.
    const onAnchorClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest<HTMLAnchorElement>(
        'a[href^="#"]',
      );
      const href = anchor?.getAttribute("href");
      if (!anchor || !href || href === "#") return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target as HTMLElement, { offset: -64, duration: 1.1 });
      anchor.closest("details")?.removeAttribute("open");
    };
    document.addEventListener("click", onAnchorClick);

    const ctx = gsap.context(() => {
      // --- Reveals por sección (todas menos el hero, que es el primero) ---
      const sections = gsap.utils.toArray<HTMLElement>(
        "#main > section:not(:first-of-type)",
      );
      sections.forEach((section) => {
        gsap.fromTo(
          section,
          { autoAlpha: 0, y: 28 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.7,
            ease: "power3.out",
            scrollTrigger: { trigger: section, start: "top 85%" },
          },
        );
      });

      // --- Expediente: los documentos se marcan uno a uno al scrollear ---
      const checks = gsap.utils.toArray<HTMLElement>("[data-doc-check]");
      if (checks.length) {
        gsap.fromTo(
          checks,
          { autoAlpha: 0, scale: 0.4 },
          {
            autoAlpha: 1,
            scale: 1,
            ease: "none",
            stagger: 0.6,
            scrollTrigger: {
              trigger: "[data-dossier]",
              start: "top 72%",
              end: "bottom 78%",
              scrub: true,
            },
          },
        );
      }

      // --- Timeline del ciclo: riel + nodos ---
      const rail = document.querySelector<HTMLElement>("[data-cy-rail]");
      const nodes = gsap.utils.toArray<HTMLElement>("[data-cy-node]");
      if (rail && nodes.length) {
        const tl = gsap.timeline({
          scrollTrigger: { trigger: "#ciclo", start: "top 70%" },
        });
        tl.fromTo(
          rail,
          { scaleX: 0, transformOrigin: "left center" },
          { scaleX: 1, duration: 0.9, ease: "power2.out" },
        ).fromTo(
          nodes,
          { autoAlpha: 0, scale: 0.6 },
          { autoAlpha: 1, scale: 1, duration: 0.4, ease: "back.out(2)", stagger: 0.12 },
          "-=0.5",
        );
      }
    });

    ScrollTrigger.refresh();

    return () => {
      document.removeEventListener("click", onAnchorClick);
      ctx.revert(); // restaura estilos y mata los ScrollTriggers del contexto
      gsap.ticker.remove(raf);
      lenis.destroy();
    };
  }, []);

  return children;
}
