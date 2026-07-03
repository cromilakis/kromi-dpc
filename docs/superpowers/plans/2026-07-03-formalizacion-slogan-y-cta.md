# Formalización del slogan y CTA — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Slogan "Protección Certificada" en serif Newsreader (excepción de marca), CTA de WhatsApp como botón primario oscuro (Ink) y check del H1 del hero en Ink.

**Architecture:** Cambios de className en 4 componentes + actualización de la documentación de reglas en `.kromi/design.md` y de los comentarios de desviación en cada archivo. Sin lógica nueva, sin tests nuevos (no hay tests de estilos); la verificación es grep + lint + tests existentes + inspección visual.

**Tech Stack:** Next.js App Router, Tailwind v4 (tokens en globals.css), next-intl.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-03-formalizacion-slogan-y-cta-design.md`.
- Prosa en español; identificadores/código en inglés (CLAUDE.md).
- No introducir strings hardcodeados: solo clases y comentarios.
- La regla "serif ≥28px" sigue vigente fuera del lockup logo+tagline.
- Criterio de éxito global: `grep -ri "25D366" components app` sin resultados; `pnpm lint` y `pnpm test` pasan.

---

### Task 1: Slogan en serif Newsreader (3 archivos + design.md)

**Files:**
- Modify: `components/landing/landing-nav.tsx:10-11,27`
- Modify: `components/self-assessment/public-topbar.tsx:9-10,24`
- Modify: `app/login/page.tsx:21-22,51`
- Modify: `.kromi/design.md` (sección de tipografía — registrar excepción)

**Interfaces:**
- Consumes: token `--font-serif` (Newsreader) ya definido en `app/globals.css:110`.
- Produces: nada consumido por otras tasks.

- [ ] **Step 1: landing-nav.tsx** — reemplazar el `<span>` de la tagline (línea 27):

```tsx
<span className="font-serif text-[17px] font-medium tracking-[-0.2px] text-ink">
```

(antes: `text-[17px] font-medium italic tracking-[-0.2px] text-ink`; se quita `italic`, se agrega `font-serif`). Actualizar el comentario del header del componente: la desviación ya no es "serif prohibida <28px → Inter itálica", sino "excepción de marca del lockup logo+tagline: serif Newsreader 17px medium (registrada en .kromi/design.md)".

- [ ] **Step 2: public-topbar.tsx** — reemplazar el `<span>` de la tagline (línea 24):

```tsx
<span className="font-serif text-body font-medium tracking-[-0.2px] text-ink max-sm:hidden">
```

Actualizar el comentario de la línea 9-10 con la misma redacción de excepción de marca.

- [ ] **Step 3: app/login/page.tsx** — reemplazar el `<span>` de la tagline (línea 51):

```tsx
<span className="font-serif text-[17px] font-medium tracking-[-0.2px] text-ink">
```

Actualizar la nota del docblock (líneas 21-22) que menciona "tagline en Inter itálica".

- [ ] **Step 4: .kromi/design.md** — en la sección de reglas tipográficas donde se prohíbe serif <28px, añadir:

```markdown
> **Excepción de marca (2026-07-03):** el lockup logo + tagline
> ("Protección Certificada") usa la serif del sistema (Tiempos Text /
> Newsreader) en 15–17px weight 500, sin itálica. Es la ÚNICA serif
> permitida bajo 28px; no aplica a ningún otro texto de UI.
```

- [ ] **Step 5: Verificar** — `pnpm lint` y `pnpm test`: PASS. Grep de control: `grep -rn "italic" components/landing/landing-nav.tsx components/self-assessment/public-topbar.tsx app/login/page.tsx` → sin resultados en las taglines.

- [ ] **Step 6: Commit**

```bash
git add components/landing/landing-nav.tsx components/self-assessment/public-topbar.tsx app/login/page.tsx .kromi/design.md
git commit -m "feat(design): slogan del lockup en serif Newsreader (excepción de marca)"
```

---

### Task 2: WhatsAppButton a botón primario oscuro

**Files:**
- Modify: `components/landing/whatsapp-button.tsx:7-13,33-39`
- Modify: `.kromi/design.md` (si menciona la excepción verde #25D366)

**Interfaces:**
- Consumes: `buttonClasses`/tokens no necesarios — clases directas como hoy.
- Produces: nada consumido por otras tasks.

- [ ] **Step 1: whatsapp-button.tsx** — en el bloque `cn(...)` reemplazar la línea de colores:

```tsx
"border border-ink bg-ink text-white",
```

(antes: `"border border-[#25D366] bg-[#25D366] text-white"`). Hover se mantiene (`transition-opacity hover:opacity-90`). El ícono `WhatsAppIcon` queda en blanco (hereda `text-white`).

- [ ] **Step 2: actualizar el docblock del componente** — reemplazar la nota de excepción verde por:

```
CTA de WhatsApp — botón primario del design system (Ink #1c1d1f, texto
blanco). Decisión 2026-07-03: se elimina la excepción verde #25D366
(prototype-analysis §9.2.1); el canal se señala solo con el ícono.
```

- [ ] **Step 3: buscar otras menciones del verde** — `grep -rn "25D366" components app .kromi/design.md`. En código no debe quedar ninguna; si `.kromi/design.md` documenta la excepción verde, actualizar esa nota indicando que quedó retirada el 2026-07-03. (Los comentarios históricos de `hero.tsx` se corrigen en Task 3.)

- [ ] **Step 4: Verificar** — `pnpm lint` y `pnpm test`: PASS. `grep -rn "25D366" components app` → sin resultados.

- [ ] **Step 5: Commit**

```bash
git add components/landing/whatsapp-button.tsx .kromi/design.md
git commit -m "feat(design): CTA WhatsApp como botón primario oscuro (retira verde #25D366)"
```

---

### Task 3: Check del H1 del hero en Ink

**Files:**
- Modify: `components/landing/hero.tsx:13-16,38-42`

**Interfaces:** ninguna.

- [ ] **Step 1: hero.tsx** — en el `<span>` del icono dentro del H1 (línea 40):

```tsx
<span className="ml-[14px] inline-flex -translate-y-[3px] align-middle text-ink">
```

(antes: `text-success-green`). Reemplazar el comentario de las líneas 38-39 por: `{/* Check del titular en Ink: titular monocromo (decisión 2026-07-03). */}`. En el docblock del componente (líneas 13-16), donde dice "la única excepción saturada permitida es el verde WhatsApp", actualizar: la excepción verde fue retirada el 2026-07-03.

- [ ] **Step 2: Verificar** — `pnpm lint` y `pnpm test`: PASS. `grep -n "success-green" components/landing/hero.tsx` → sin resultados.

- [ ] **Step 3: Commit**

```bash
git add components/landing/hero.tsx
git commit -m "feat(design): check del H1 del hero en Ink (titular monocromo)"
```

---

### Task 4: Verificación visual integral

**Files:** ninguno (solo verificación).

- [ ] **Step 1:** `pnpm build` → PASS (sin errores de tipos).
- [ ] **Step 2:** `pnpm dev` y revisar visualmente: `/` (tagline serif en nav, CTA oscuro en hero y precios, check Ink en H1), `/autoevaluacion` (tagline serif en topbar, panel de resultado intacto), `/login` (tagline serif). Capturar screenshots si es posible.
- [ ] **Step 3:** Confirmar criterios del spec: ningún serif <28px fuera del lockup; ningún `#25D366` en `components/`/`app/`.
