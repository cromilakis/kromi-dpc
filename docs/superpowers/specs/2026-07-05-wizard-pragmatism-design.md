# Wizard de alta — pase de pragmatismo + ayudas

**Fecha:** 2026-07-05 · **Estado:** en revisión · Rama: `feat/wizard-pragmatism`

## Motivación
La plataforma quedó orientada a rubros regulados y se siente compleja para un negocio
pequeño (ej. tienda "Margarita": 2 personas, solo guarda teléfonos de clientes + un Excel de
proveedores). El wizard de alta muestra jerga interna (Complexity Score, RFC), un catálogo de
rubros que no incluye "negocio general", y no explica los campos. Este pase lo hace pragmático.

## Cambios

### 1. Rubro "Otro / General" + "Leyes aplicables"
- Agregar rubro **`otro`** al catálogo `sectors`: nombre "Otro / General", `laws = {21719}`,
  `complexity_multiplier = 1.00`. Aplicar a `seed.sql` + local + cloud.
- En el wizard, **"Otro / General" seleccionado por defecto** (caso base).
- Renombrar el bloque **"Leyes complementarias activadas" → "Leyes aplicables"**. Siempre
  muestra **Ley 21.719** primero (base), luego las complementarias del rubro (si las hay).
  Bajo cada ley, una **referencia corta en lenguaje simple**. Para "Otro": solo Ley 21.719.
- Las tarjetas de rubro: Ley 21.719 se entiende como base; "Otro" muestra "Solo Ley 21.719".

### 2. Ayuda contextual `(?)` (solo wizard en este pase)
- Componente reusable **`InfoTooltip`** (`components/ui/info-tooltip.tsx`): ícono `(?)`
  accesible (button + popover/tooltip, teclado + aria) que muestra **qué es el campo, para qué
  sirve y un ejemplo** (estilo Margarita). CSS-first, sin dependencias.
- Colocarlo junto a: **rubro**, **tramo** (tamaño), **dotación**, y **cada factor de
  complejidad**. Contenido en i18n (`messages/app/companies.json`).

### 3. Des-jergonizar la UI (conceptos internos fuera)
- Quitar de textos visibles: **"Complexity Score"** y referencias **"RFC §…"**.
- El paso de factores mantiene el mensaje "amplían el alcance del diagnóstico", sin nombrar el
  score. El **score sigue siendo interno/server-only** (`lib/companies/scoring.server.ts`
  intacto) — no viaja al cliente.

### 4. Cursor de botones
- Tailwind v4 quitó el `cursor:pointer` por defecto en `<button>`. Fix global: agregar
  `cursor-pointer` a `buttonClasses`/`Button` (`components/ui/button.ts`) y a las tarjetas
  interactivas (rubro, factores) para que muestren manito en hover.

## Descripciones de leyes (orientativas — validar con abogado)
Una línea "a grandes rasgos" por ley usada en el catálogo: 21.719 (protección de datos
personales), 19.496 (consumidor/SERNAC), 20.584 (derechos del paciente), 21.663 (marco de
ciberseguridad/ANCI), 21.459 (delitos informáticos), Código del Trabajo (datos laborales),
Circulares CMF, Normas SUBTEL. Marcadas como orientación, no asesoría legal.

## Fuera de alcance
- Ayudas `(?)` en los formularios de diagnóstico (RAT + cumplimiento) → pase siguiente.
- Rediseño del score o de la lógica de elegibilidad.

## Archivos
- `supabase/seed.sql` (+ insert local/cloud) — rubro `otro`.
- `components/companies/new-company-wizard.tsx` — default rubro, "Leyes aplicables", tooltips, des-jergonizar, cursor en tarjetas.
- `lib/companies/schema.ts` — si el default de rubro/enum lo requiere (revisar).
- `lib/companies/scoring.server.ts` — soportar multiplier de `otro` (viene del catálogo; verificar fallback).
- `components/ui/info-tooltip.tsx` (nuevo) + `components/ui/button.ts` (cursor).
- `messages/app/companies.json` — textos de ayuda + referencias de leyes + reetiquetados.

## Validación
- typecheck + build + tests; click-through del wizard (crear "Margarita" como Otro → ver Leyes aplicables = solo 21.719, tooltips, sin jerga, cursor).
