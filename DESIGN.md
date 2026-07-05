# Design

> Fuente de verdad canónica: `.kromi/design.md` (Attio — Style Reference) y los tokens en
> `app/globals.css`. Este archivo es el resumen operativo para impeccable.

## Theme

light. Monocromo de alto contraste: near-black (`#1c1d1f`, ink) sobre blanco puro. Se siente
como un instrumento clínico de alta gama con un toque humano por la serif de los titulares.

## Color

Paleta monocroma; el color solo aparece con significado semántico.

- **Fondo:** White `#ffffff` · paneles sutiles Ash `#f3f4f6` · fondo tenue `#fbfbfc`.
- **Texto:** Ink `#1c1d1f` (primario) · Carbon `#505967` · Metal `#6f7988` (secundario) · Lead `#b5bdc9` (placeholder/disabled).
- **Bordes/divisores:** Stone `#e4e7ec` · Slate `#d3d8df`.
- **Acentos semánticos (solo con significado):** Action Blue `#407ff2` (links/interacción) · Success Green `#075a39` · Warning Yellow `#705500` · Danger Red `#772322`.
- **Regla dura:** sin colores saturados nuevos, sin color en titulares ni botones primarios, sin fills de color salvo indicadores de estado.

## Typography

Dualidad: **serif Tiempos Text / Newsreader** solo en titulares ≥28px (calidez editorial,
feature `ss03`); **Inter** (con `ss03` siempre) para toda la UI, cuerpo, botones y labels.
Letter-spacing negativo en todo texto ≥18px.

Escala: caption 12 · body-sm 14 · body 16 · subheading 20 · heading-sm 28 · heading 40 ·
heading-lg 56 · display 64. (tokens `--text-*` en globals.css.)

Excepción de marca: el lockup logo + tagline usa serif en 15–17px weight 500 (única serif <28px).

## Spacing & Shape

Base 4px, densidad compacta. Escala `--spacing-4…120`. Radios: buttons 10px, cards 8px,
inputs 7px, tags 4px, tabs 0px. Sombras muy sutiles; nunca en botones/inputs/cards simples.
Layout centrado, max-width ~1180–1440px, section-gap 96px, mucho aire en los bordes.

## Components

- **CTA primario:** bg Ink, texto White, Inter 14/500, radius 10px. (En hero se usa WhatsApp como primario.)
- **CTA secundario:** bg White, texto Ink, borde 1px Slate, radius 10px.
- **Nav link:** transparente, texto Metal, hover bg Ash.
- **Card / UI frame:** bg White, borde 1px Stone, radius 8px, sombra subtle-2.
- **Pill de estado:** rounded-full, bg del token semántico, texto white, caption uppercase.
- **Footer:** bg Abyss `#000`, columnas, títulos white, links Overcast → white en hover.

## Motion

Intencional y sobria. Ease-out exponencial, sin bounce/elastic. Todo respeta
`prefers-reduced-motion` (frame estático o crossfade). Ejemplos vivos: dot de urgencia
(blink motion-safe) y fondo binario animado del hero (scroll infinito + parpadeo tipo
cifrado, ink a baja opacidad, se pausa en pestaña oculta).

## Imagery

Funcional y abstracta; sin fotografía lifestyle. Capturas de UI en frames minimalistas y
grafismos de datos (p. ej. malla binaria del hero) como atmósfera, no como contenido literal.

## Landing — patrones propios (además del sistema)

- **Hero:** pill de urgencia (Ley 21.719), H1 serif display, subtítulo Metal, CTAs duales
  (WhatsApp cotizar primario + autoevaluación secundaria), fondo binario animado detrás.
- **"Lo que está en juego":** card con 3 niveles de infracción (medidor de barras
  ascendentes en color semántico lead→yellow→red) + caso hipotético como pull-quote
  centrado (pill "FALTA LEVE" + rango de multa en serif) + reflexión con CTA WhatsApp.

## Do / Don't (resumen)

- **Do:** serif solo en titulares ≥28px; Inter+ss03 en UI; bordes 1px como separador
  principal; color solo semántico; contraste AA.
- **Don't:** color en titulares/botones primarios; nuevos saturados; sombras en botones;
  serif en cuerpo; degradados decorativos; eyebrows/numeración por reflejo; tarjetas anidadas.
