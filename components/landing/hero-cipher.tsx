"use client";

import { useEffect, useRef } from "react";

/**
 * Fondo decorativo del hero: una malla de dígitos monocromos que se refrescan
 * rápido (como una encriptación en curso) y a la vez suben en scroll infinito —
 * se pierden por arriba y nacen nuevos por abajo. Tema Ley 21.719 = protección
 * de datos. Deliberadamente sutil para respetar el Style Reference Attio: ink a
 * baja opacidad + máscara vertical que lo disuelve arriba/abajo (ancho completo),
 * para que el texto del hero siempre mande. Es 100% decorativo (aria-hidden).
 *
 * Accesibilidad/performance: bajo prefers-reduced-motion se pinta un solo frame
 * estático (sin scroll ni parpadeo); el loop se pausa cuando la pestaña no está
 * visible y se limpia al desmontar. Canvas (un solo elemento) en vez de spans.
 */

const CELL = 22; // px por celda (paso de la malla)
const FPS = 16; // refresco del parpadeo de dígitos ("cifrado")
const CHURN = 0.28; // fracción de celdas que mutan por tick de parpadeo
const SPEED = 26; // px/s de desplazamiento hacia arriba
const INK = "28, 29, 31"; // --color-ink en RGB

export function HeroCipher() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    // Aliases no-null para conservar el narrowing dentro de los closures.
    const cv = canvas;
    const ctx = context;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Perceptible pero de fondo: rango bajo con algo de textura por celda.
    const randAlpha = () => 0.07 + Math.random() * 0.1;
    const randDigit = () => (Math.random() * 2) | 0; // binario: 0 / 1

    let cols = 0;
    let rows = 0; // incluye filas de colchón para el scroll
    let grid: number[] = []; // dígito actual por celda
    let alpha: number[] = []; // opacidad base por celda (textura)
    let scrollPx = 0; // desplazamiento sub-celda acumulado hacia arriba

    function seed() {
      grid = new Array(cols * rows);
      alpha = new Array(cols * rows);
      for (let i = 0; i < grid.length; i++) {
        grid[i] = randDigit();
        alpha[i] = randAlpha();
      }
    }

    function resize() {
      const parent = cv.parentElement;
      const w = parent?.clientWidth ?? cv.clientWidth;
      const h = parent?.clientHeight ?? cv.clientHeight;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      cv.style.width = `${w}px`;
      cv.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(w / CELL);
      rows = Math.ceil(h / CELL) + 2; // +2 filas de colchón (arriba/abajo)
      scrollPx = 0;
      seed();
      ctx.font = "600 14px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      draw();
    }

    function draw() {
      const w = cv.width / dpr;
      const h = cv.height / dpr;
      ctx.clearRect(0, 0, w, h);
      for (let y = 0; y < rows; y++) {
        // La fila 0 vive una celda por encima del borde: al restar scrollPx el
        // contenido sube; el colchón inferior tapa el hueco que deja abajo.
        const py = y * CELL + CELL / 2 - CELL - scrollPx;
        for (let x = 0; x < cols; x++) {
          const i = y * cols + x;
          ctx.fillStyle = `rgba(${INK}, ${alpha[i]})`;
          ctx.fillText(String(grid[i]), x * CELL + CELL / 2, py);
        }
      }
    }

    resize();

    const ro = new ResizeObserver(resize);
    if (cv.parentElement) ro.observe(cv.parentElement);

    let raf = 0;
    let prev = 0;
    let lastChurn = 0;
    const churnInterval = 1000 / FPS;

    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      if (document.hidden) {
        prev = now; // evita un salto grande al volver a la pestaña
        return;
      }
      if (!prev) prev = now;
      const dt = now - prev;
      prev = now;

      // Scroll hacia arriba: al cruzar una celda, desplaza la malla una fila
      // (descarta la de arriba, engendra una nueva abajo) y conserva el resto.
      scrollPx += (SPEED * dt) / 1000;
      while (scrollPx >= CELL) {
        scrollPx -= CELL;
        grid.splice(0, cols);
        alpha.splice(0, cols);
        for (let x = 0; x < cols; x++) {
          grid.push(randDigit());
          alpha.push(randAlpha());
        }
      }

      // Parpadeo de "cifrado": muta un puñado de celdas a ritmo propio.
      if (now - lastChurn >= churnInterval) {
        lastChurn = now;
        const mutations = Math.max(1, (grid.length * CHURN) | 0);
        for (let n = 0; n < mutations; n++) {
          grid[(Math.random() * grid.length) | 0] = randDigit();
        }
      }

      draw();
    }

    if (!reduce) raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent_0%,#000_18%,#000_82%,transparent_100%)]"
    >
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}
