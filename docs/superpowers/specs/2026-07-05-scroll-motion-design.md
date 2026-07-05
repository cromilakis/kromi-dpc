# Scroll Motion & WebGL — landing kromi-dpc

**Fecha:** 2026-07-05 · **Estado:** aprobado, en implementación

## Objetivo
Agregar un toque tech/innovación a la landing con interacciones ligadas al scroll,
al nivel "Awwwards" pero en clave **monocroma sofisticada** (paleta ink/blanco + serif),
para impresionar sin traicionar el tono "riguroso, confiable, sereno" (ver PRODUCT.md).

## Stack
- **Lenis** — scroll suave con inercia (base).
- **GSAP + ScrollTrigger** — reveals, scrubbing, pinning (un solo sistema, sincronizado con Lenis).
- **react-three-fiber + three + @react-three/drei** — WebGL del hero (Fase 2).

## Efectos
1. **Global:** Lenis + reveals escalonados por sección al entrar en viewport.
2. **Hero (3D):** el `HeroCipher` sube a WebGL — campo 3D monocromo de dígitos/partículas que reacciona a mouse/scroll y "se descifra" al scrollear.
3. **Stakes:** las multas (UTM y $7.000.000 → $340.000.000) cuentan hacia arriba al entrar en vista.
4. **Ciclo:** el riel y los nodos 1→4 se dibujan/conectan con el scroll (scrub).
5. **Scrollytelling (pin):** se fija el expediente (Deliverable) mientras los 7 documentos se marcan uno a uno.

## Guardrails (no negociables)
- `prefers-reduced-motion` → desactiva Lenis, scrubs y auto-motion 3D (fallback estático/crossfade).
- **Contenido siempre visible sin JS** (SSR intacto): animaciones = enhancement; nunca gatillar visibilidad por clase (evita secciones en blanco).
- WebGL: dpr limitado, pausa fuera de pantalla, dynamic import, SSR-safe.

## Arquitectura
- `SmoothScrollProvider` (client) envuelve la landing: init Lenis + sincroniza el ticker de GSAP/ScrollTrigger; registra un batch de reveals sobre `[data-reveal]`.
- Islas client: `HeroScene` (R3F, dynamic import), `CountUp`, enhancement de `cycle-section` (timeline) y `deliverable-section` (pin).
- El resto de secciones siguen server components; solo se les agrega `data-reveal`.

## Fases
- **Fase 1 — Fundación de movimiento:** Lenis + reveals + count-up + timeline-draw. Bajo riesgo.
- **Fase 2 — Peso pesado:** hero WebGL + pin del expediente.

Cada fase se verifica (typecheck + build + screenshots) y se puede deployar por separado.
