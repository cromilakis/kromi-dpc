# Diseño — Formalización del slogan y del CTA de cotización

**Fecha:** 2026-07-03 · **Estado:** aprobado por el usuario

## Contexto

La plataforma certifica cumplimiento de la Ley 21.719: nada en la cara pública
puede verse informal. Dos elementos actuales no transmiten esa formalidad:

1. El slogan **"Protección Certificada"** (lockup logo+tagline) se renderiza en
   Inter itálica 17px — el prototipo lo pedía en serif, pero la regla del
   design system (serif solo ≥28px) lo degradó.
2. El botón **"Cotización asistida"** (CTA WhatsApp) usa el verde saturado
   #25D366, única excepción de color de la paleta; choca con el resto de la
   UI monocroma. El H1 del hero además lleva un check en `success-green`.

## Decisiones

### 1. Slogan en serif Newsreader (excepción de marca documentada)

- El tagline del lockup pasa a `font-serif` (Newsreader) medium, sin itálica,
  conservando el tamaño de cada contexto (17px en nav/login, `text-body` en
  topbar público).
- Se registra en `.kromi/design.md` una **excepción de marca** acotada
  exclusivamente al lockup logo+tagline; la regla "serif ≥28px" sigue vigente
  para todo lo demás.
- Afecta 3 componentes: `components/landing/landing-nav.tsx`,
  `components/self-assessment/public-topbar.tsx`, `app/login/page.tsx`.
  Los comentarios de "desviación normalizada" de esos archivos se actualizan.

### 2. CTA WhatsApp en botón primario oscuro

- `components/landing/whatsapp-button.tsx` pasa del verde #25D366 al **botón
  primario del sistema**: fondo Ink `#1c1d1f`, texto blanco, borde Ink, mismo
  radio/padding/tipografía actuales. El ícono de WhatsApp se conserva en
  blanco (señal de canal).
- El verde #25D366 desaparece de la UI; se actualiza la documentación de la
  excepción (comentario del componente y `.kromi/design.md` /
  referencia a prototype-analysis §9.2.1).
- `components/self-assessment/result-panel.tsx` NO usa `WhatsAppButton`
  (tiene su propio CTA blanco sobre card Ink, sin verde): queda fuera del
  cambio. Solo los call sites de `WhatsAppButton` (hero y pricing-section)
  cambian de aspecto.

### 3. Check del H1 del hero en Ink

- El `CheckCircleIcon` del H1 (`components/landing/hero.tsx`) pasa de
  `text-success-green` a `text-ink`: titular 100% monocromo.
- Se elimina la nota de "excepción de marca" del comentario correspondiente.

## Fuera de alcance

- Cualquier otro uso de `success-green` (badges de estado, checklist interno).
- Cambios de copy o de layout.

## Criterios de éxito

- Ningún serif <28px fuera del lockup logo+tagline.
- Ningún #25D366 restante en `components/` ni `app/` (grep limpio).
- `pnpm lint` y `pnpm test` pasan; verificación visual de landing,
  autoevaluación (topbar y panel de resultado), login y hero.
